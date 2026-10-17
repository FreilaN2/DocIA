"""
core/apa_auditor.py
===================
Auditor de citas académicas vs bibliografía y evaluador de Salud APA (Scorecard).
Ejecución 100% nativa en Python (0 coste de tokens de IA).
Calcula discrepancias de citas, jerarquías de títulos y métricas de calidad en milisegundos.
"""

import re
import unicodedata
from typing import Optional

# ═══════════════════════════════════════════════════════════
# CONSTANTES Y REGEX PRECOMPILADOS (O(1) compilación)
# ═══════════════════════════════════════════════════════════

# Palabras excluidas como autores (meses, entidades comunes falsas positivas)
_STOP_WORDS_AUTOR = frozenset({
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
    "septiembre", "octubre", "noviembre", "diciembre", "figura", "tabla",
    "capitulo", "seccion", "grafico", "anexo", "apendice", "cuadro", "fuente",
    "adaptado", "recuperado", "disponible", "universidad", "instituto"
})

# Paréntesis con posibles citas: captura cualquier contenido entre paréntesis con año de 4 dígitos
_RE_PARENTHETICAL_BLOCK = re.compile(r'\(([^)]*\b(?:19|20)\d{2}[a-z]?[^)]*)\)')

# Citas narrativas en texto: ej. "Pérez (2020)", "García y Gómez (2019)", "Hernández et al. (2021)"
_RE_NARRATIVE_CITATION = re.compile(
    r'\b([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ\'-]+(?:\s+(?:y|e|and|&)\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ\'-]+|(?:\s+et\s+al\.?))?)\s*\(\s*(\d{4}[a-z]?)(?:,\s*p(?:p)?\.\s*\d+)?\s*\)'
)

# Cita individual dentro de paréntesis: ej. "Pérez, 2020" o "Pérez & Gómez, 2020"
_RE_INNER_CITATION = re.compile(
    r'([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ\'-]+(?:\s+(?:y|e|and|&)\s+[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ\'-]+|(?:\s+et\s+al\.?))?)[,\s]+(\d{4}[a-z]?)'
)

# Extracción de autor y año al inicio de una referencia APA:
# ej. "Pérez, J. (2020)..." o "García, M. & López, R. (2019)..."
_RE_REF_START = re.compile(r'^\s*([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ\'-]+)[^()]*?\(\s*(\d{4}[a-z]?)\s*\)')

# Extracción de todos los apellidos de autores en una referencia
_RE_REF_ALL_AUTHORS = re.compile(r'\b([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ\'-]+),\s+[A-ZÁÉÍÓÚÑ]\.')


def _desacentuar(texto: str) -> str:
    """Elimina tildes y diacríticos para comparación difusa (Pérez == Perez)."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize('NFKD', texto.strip().lower())
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def _extraer_primer_apellido(autor_str: str) -> str:
    """Extrae el primer apellido limpio de una cadena de autor(es)."""
    limpio = autor_str.split()[0] if autor_str else ""
    limpio = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\'-]', '', limpio)
    return _desacentuar(limpio)


# ═══════════════════════════════════════════════════════════
# EXTRACTORES DE CITAS Y REFERENCIAS
# ═══════════════════════════════════════════════════════════

def extraer_citas_del_texto(parrafos: list[dict]) -> list[dict]:
    """
    Escanea todos los párrafos de cuerpo del documento y extrae todas las citas académicas.
    parrafos: lista de dicts con claves {"id", "texto", "categoria"}
    """
    citas_detectadas = []

    for item in parrafos:
        cat = item.get("categoria", "")
        # Omitir referencias y portadas
        if cat in {"REFERENCIA", "PORTADA_BLOQUE", "PORTADA_IMAGEN", "PORTADA_ESPACIO"}:
            continue

        texto = item.get("texto", "")
        p_id = item.get("id", 0)
        if not texto:
            continue

        # 1. Citas narrativas: ej. "Pérez (2020) señala..."
        for match in _RE_NARRATIVE_CITATION.finditer(texto):
            autor_raw = match.group(1).strip()
            año = match.group(2).strip()
            primer_ap = _extraer_primer_apellido(autor_raw)
            if primer_ap in _STOP_WORDS_AUTOR or len(primer_ap) < 3:
                continue
            citas_detectadas.append({
                "autor_raw": autor_raw,
                "autor_norm": primer_ap,
                "año": año,
                "parrafo_id": p_id,
                "texto_cita": match.group(0),
                "tipo": "narrativa",
            })

        # 2. Citas parentéticas: ej. "(Pérez, 2020)" o "(García, 2019; López, 2021)"
        for block_match in _RE_PARENTHETICAL_BLOCK.finditer(texto):
            contenido = block_match.group(1)
            # Dividir por punto y coma si hay citas múltiples
            segmentos = contenido.split(";")
            for seg in segmentos:
                inner_match = _RE_INNER_CITATION.search(seg.strip())
                if inner_match:
                    autor_raw = inner_match.group(1).strip()
                    año = inner_match.group(2).strip()
                    primer_ap = _extraer_primer_apellido(autor_raw)
                    if primer_ap in _STOP_WORDS_AUTOR or len(primer_ap) < 3:
                        continue
                    citas_detectadas.append({
                        "autor_raw": autor_raw,
                        "autor_norm": primer_ap,
                        "año": año,
                        "parrafo_id": p_id,
                        "texto_cita": inner_match.group(0),
                        "tipo": "parentetica",
                    })

    return citas_detectadas


def extraer_referencias_bibliografia(parrafos: list[dict]) -> list[dict]:
    """
    Escanea los párrafos marcados como REFERENCIA y extrae los autores y años declarados.
    """
    referencias = []

    for item in parrafos:
        cat = item.get("categoria", "")
        if cat != "REFERENCIA":
            continue

        texto = item.get("texto", "").strip()
        p_id = item.get("id", 0)
        if not texto:
            continue

        # Intentar extraer autor principal y año
        match_start = _RE_REF_START.search(texto)
        primer_autor = ""
        año = ""
        if match_start:
            primer_autor = _desacentuar(match_start.group(1))
            año = match_start.group(2)
        else:
            # Fallback: buscar primer año entre paréntesis
            year_match = re.search(r'\(\s*(\d{4}[a-z]?)\s*\)', texto)
            if year_match:
                año = year_match.group(1)
                palabras = texto.split(",")
                if palabras:
                    primer_autor = _desacentuar(palabras[0].strip().split()[-1])

        # Extraer todos los autores mencionados en la entrada bibliográfica
        todos_autores = set()
        for aut_match in _RE_REF_ALL_AUTHORS.finditer(texto):
            todos_autores.add(_desacentuar(aut_match.group(1)))

        if primer_autor:
            todos_autores.add(primer_autor)

        referencias.append({
            "parrafo_id": p_id,
            "texto": texto,
            "primer_autor": primer_autor,
            "año": año,
            "todos_autores": list(todos_autores),
        })

    return referencias


# ═══════════════════════════════════════════════════════════
# AUDITORÍA DE CONCORDANCIA (CITAS vs BIBLIOGRAFÍA)
# ═══════════════════════════════════════════════════════════

def auditar_concordancia_citas(citas: list[dict], referencias: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    """
    Cruza citas y referencias para detectar:
      1. Citas huérfanas (en el texto pero sin bibliografía).
      2. Referencias fantasma (en bibliografía pero nunca citadas).
      3. Citas coincidentes exitosas.
    """
    citas_huerfanas = []
    citas_coincidentes = []
    referencias_usadas_ids = set()

    for cita in citas:
        c_aut = cita["autor_norm"]
        c_año = cita["año"]
        encontrada = False

        for ref in referencias:
            # Coincidencia si el año coincide y el autor está en la lista de autores de la referencia
            if ref["año"] == c_año and (c_aut == ref["primer_autor"] or c_aut in ref["todos_autores"]):
                encontrada = True
                referencias_usadas_ids.add(ref["parrafo_id"])
                citas_coincidentes.append({
                    "cita": cita,
                    "referencia_id": ref["parrafo_id"],
                })
                break

        if not encontrada:
            citas_huerfanas.append(cita)

    referencias_fantasma = [
        ref for ref in referencias if ref["parrafo_id"] not in referencias_usadas_ids
    ]

    return citas_huerfanas, referencias_fantasma, citas_coincidentes


# ═══════════════════════════════════════════════════════════
# SCORECARD: EVALUACIÓN GLOBAL DE SALUD APA
# ═══════════════════════════════════════════════════════════

def calcular_scorecard_apa(
    parrafos: list[dict],
    citas: list[dict],
    referencias: list[dict],
    citas_huerfanas: list[dict],
    referencias_fantasma: list[dict],
    plan: str = "free",
) -> dict:
    """
    Calcula el puntaje de Salud APA del documento (0 a 100%) y genera el informe de diagnóstico.
    Todo el cálculo corre en CPU con $0 costo de IA.
    """
    pts_citas = 35
    pts_titulos = 25
    pts_parrafos = 20
    pts_estructura = 20

    alertas = []
    observaciones = []

    # ── 1. Evaluación de Citas y Bibliografía (Máx 35 pts) ───────────
    total_citas = len(citas)
    total_refs = len(referencias)

    if total_citas == 0 and total_refs == 0:
        pts_citas -= 15
        observaciones.append("No se detectaron citas ni referencias en el documento.")
    else:
        # Penalización por citas huérfanas: -5 pts por cada una (hasta agotar los 35 pts)
        penalizacion_huerfanas = min(len(citas_huerfanas) * 5, 25)
        pts_citas -= penalizacion_huerfanas

        # Penalización por referencias fantasma: -2 pts por cada una
        penalizacion_fantasma = min(len(referencias_fantasma) * 2, 10)
        pts_citas -= penalizacion_fantasma

        if citas_huerfanas:
            alertas.append({
                "tipo": "error",
                "titulo": f"{len(citas_huerfanas)} citas huérfanas detectadas",
                "mensaje": f"Mencionas {len(citas_huerfanas)} autor(es) en el texto que no aparecen en tu bibliografía.",
                "icono": "link_off",
            })
        if referencias_fantasma:
            alertas.append({
                "tipo": "warning",
                "titulo": f"{len(referencias_fantasma)} referencias sin citar",
                "mensaje": f"Tienes {len(referencias_fantasma)} entrada(s) en la bibliografía que nunca mencionaste en el texto.",
                "icono": "playlist_remove",
            })

    # ── 2. Evaluación de Títulos y Jerarquía (Máx 25 pts) ─────────────
    titulos = [p for p in parrafos if (p.get("categoria") or "").startswith("TITULO")]
    has_n1 = any(p.get("categoria") == "TITULO_N1" for p in titulos)

    if not titulos:
        pts_titulos -= 15
        alertas.append({
            "tipo": "warning",
            "titulo": "Sin estructura de títulos",
            "mensaje": "No se encontraron títulos categorizados (N1 a N5).",
            "icono": "format_h1",
        })
    elif not has_n1:
        pts_titulos -= 8
        alertas.append({
            "tipo": "info",
            "titulo": "Falta Título Principal (N1)",
            "mensaje": "Todo documento APA debe contar al menos con un encabezado principal centrado.",
            "icono": "title",
        })

    # Títulos que terminan en punto (error común en APA N1, N2, N3)
    titulos_con_punto = [
        t for t in titulos
        if t.get("texto", "").strip().endswith(".")
        and t.get("categoria") in {"TITULO_N1", "TITULO_N2", "TITULO_N3"}
    ]
    if titulos_con_punto:
        pts_titulos -= min(len(titulos_con_punto) * 3, 10)
        alertas.append({
            "tipo": "warning",
            "titulo": f"{len(titulos_con_punto)} títulos con punto final",
            "mensaje": "Según Normas APA 7ma, los títulos de Nivel 1, 2 y 3 NO deben llevar punto final.",
            "icono": "edit_note",
        })

    # ── 3. Legibilidad y Párrafos (Máx 20 pts) ─────────────────────────
    parrafos_cuerpo = [
        p for p in parrafos
        if p.get("categoria") == "PARRAFO_NORMAL" and p.get("texto")
    ]
    parrafos_largos = []
    for p in parrafos_cuerpo:
        palabras = len(p.get("texto", "").split())
        if palabras > 320:
            parrafos_largos.append(p)

    if parrafos_largos:
        pts_parrafos -= min(len(parrafos_largos) * 4, 15)
        alertas.append({
            "tipo": "info",
            "titulo": f"{len(parrafos_largos)} párrafos excesivamente largos",
            "mensaje": "APA recomienda párrafos de entre 100 y 250 palabras para garantizar claridad académica.",
            "icono": "short_text",
        })

    # ── 4. Estructura y Portada (Máx 20 pts) ───────────────────────────
    tiene_portada = any((p.get("categoria") or "").startswith("PORTADA") for p in parrafos)
    tiene_referencias = len(referencias) > 0

    if not tiene_portada:
        pts_estructura -= 10
        observaciones.append("No se identificó portada separada del cuerpo.")

    if not tiene_referencias:
        pts_estructura -= 10
        alertas.append({
            "tipo": "error",
            "titulo": "Sin sección de Referencias",
            "mensaje": "El documento no cuenta con una lista de referencias bibliográficas reconocible.",
            "icono": "menu_book",
        })

    # Calcular puntaje final consolidado
    score_total = max(10, min(100, pts_citas + pts_titulos + pts_parrafos + pts_estructura))

    if score_total >= 85:
        nivel = "Excelente"
        color = "emerald"
        mensaje_general = "Tu documento cumple los estándares clave de formato APA."
    elif score_total >= 70:
        nivel = "Aceptable"
        color = "blue"
        mensaje_general = "Estructura general correcta, pero requiere correcciones en citas o títulos."
    elif score_total >= 50:
        nivel = "Riesgo de observaciones"
        color = "amber"
        mensaje_general = "Se detectaron incongruencias importantes que un tutor o jurado observará."
    else:
        nivel = "Crítico"
        color = "red"
        mensaje_general = "Alto riesgo de rechazo por fallas estructurales y citas desalineadas."

    # ── Mapeo Free vs Pro ──────────────────────────────────────────────
    # En Pro: lista completa con autores, párrafos y texto de cita.
    # En Free: lista vacía (0 letras ni pistas expuestas), solo métricas de conteo.
    is_pro = (plan == "pro")

    citas_huerfanas_payload = []
    if is_pro:
        for c in citas_huerfanas:
            citas_huerfanas_payload.append({
                "autor": c["autor_raw"],
                "año": c["año"],
                "parrafo_id": c["parrafo_id"],
                "texto_cita": c["texto_cita"],
                "locked": False,
            })

    referencias_fantasma_payload = []
    if is_pro:
        for r in referencias_fantasma:
            referencias_fantasma_payload.append({
                "autor": r["primer_autor"].capitalize(),
                "año": r["año"],
                "parrafo_id": r["parrafo_id"],
                "texto": r["texto"][:120] + "...",
                "locked": False,
            })

    return {
        "score": score_total,
        "nivel": nivel,
        "color": color,
        "mensaje_general": mensaje_general,
        "is_pro": is_pro,
        "detalles_bloqueados": not is_pro,
        "metricas": {
            "total_citas": total_citas,
            "citas_coincidentes": len(citas) - len(citas_huerfanas),
            "citas_huerfanas_count": len(citas_huerfanas),
            "total_referencias": total_refs,
            "referencias_fantasma_count": len(referencias_fantasma),
            "parrafos_largos_count": len(parrafos_largos),
            "titulos_con_punto_count": len(titulos_con_punto),
        },
        "alertas": alertas,
        "observaciones": observaciones,
        "citas_huerfanas": citas_huerfanas_payload,
        "referencias_fantasma": referencias_fantasma_payload,
    }


def ejecutar_auditoria_completa(parrafos: list[dict], plan: str = "free") -> dict:
    """
    Punto de entrada principal: ejecuta extracción, auditoría y scorecard.
    Retorna el dict completo de resultados listo para la API/Frontend.
    """
    citas = extraer_citas_del_texto(parrafos)
    referencias = extraer_referencias_bibliografia(parrafos)
    citas_huerfanas, referencias_fantasma, _ = auditar_concordancia_citas(citas, referencias)

    scorecard = calcular_scorecard_apa(
        parrafos=parrafos,
        citas=citas,
        referencias=referencias,
        citas_huerfanas=citas_huerfanas,
        referencias_fantasma=referencias_fantasma,
        plan=plan,
    )
    return scorecard
