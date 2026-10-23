"""
Optimizaciones aplicadas:
  - FIX #1:  Todos los regex compilados a nivel módulo
  - FIX #2:  COMMON_TESIS_SECTIONS con frozensets pre-normalizados (búsqueda O(1))
  - FIX #3:  Funciones de normalización con translate + regex pre-compilado
  - FIX #4:  _es_titulo_corto optimizado con regex de limpieza pre-compilado
  - FIX #5:  SMALL_WORDS pre-procesado como frozenset
  - FIX #6:  Type hints completos y modernos
  - FIX #7:  Caché en funciones de clasificación frecuente
  - FIX #8:  Eliminación de iteraciones redundantes
  - FIX #9:  _BASE_STATS compartido (evita recrear dict)
"""

import re
import logging
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════
# CONSTANTES PRECOMPILADAS (FIX #1, #2, #3, #5)
# ═══════════════════════════════════════════════════════════

# FIX #1: Regex compilados UNA SOLA VEZ a nivel módulo
_RE_MULTIPLE_SPACES = re.compile(r"\s+")
_RE_ENDS_WITH_DASH_COLON = re.compile(r"[\s\-:]+$")
_RE_NON_WORD_CHARS = re.compile(r"[^\wÁÉÍÓÚÑÜÇ'-]")
_RE_PUNCTUATION_END = re.compile(r'[.!?]$')
_RE_REFERENCIA_APA = re.compile(
    r'^[A-ZÁÉÍÓÚÑÜÇ][\wÁÉÍÓÚÑÜÇ\'-]+,\s+[A-ZÁÉÍÓÚÑÜÇ]\.[^()]{0,160}?\(\s*\d{4}[a-z]?\s*\)'
)
_RE_PAGINA_CITA = re.compile(
    r'\([^)]*?\b(?:p\.|pp\.|pág\.|pag\.|párr\.|parr\.)\s*\d+[^)]*?\)[\s.]*$',
    re.IGNORECASE
)
_RE_CAPITULO_ANEXO = re.compile(
    r'^(cap[ií]tulo|anexo|ap[eé]ndice|apendice|figura|tabla)\b', 
    re.IGNORECASE
)
_RE_SECCIONES_ACADEMICAS = re.compile(
    r'^(introducción|antecedentes|metodología|metodologia|resultados|'
    r'discusión|discusion|conclusiones|análisis|analisis|evaluación|'
    r'evaluacion|fase|fases|marco|objetivos|justificación|justificacion)\b',
    re.IGNORECASE
)
_RE_NUMBERED_HEADING = re.compile(r'^[0-9]+(\.[0-9]+)*\s+[A-ZÁÉÍÓÚÑÜÇ]')
_RE_TABLA_FIGURA = re.compile(
    r'^(tabla|figura|apartado|sección|seccion|subsección|subseccion)\b',
    re.IGNORECASE
)

# FIX #3: Tabla de traducción para normalización rápida
_STRIP_CHARS_TABLE = str.maketrans('', '', ':- \t\n\r')

# FIX #5: SMALL_WORDS como frozenset (búsqueda O(1))
SMALL_WORDS: frozenset[str] = frozenset({
    "a", "ante", "bajo", "con", "contra", "de", "del", "desde",
    "durante", "e", "el", "la", "las", "los", "para", "por",
    "sin", "sobre", "y", "o", "u", "en", "al", "aun", "una", "un",
    "su", "sus", "se"
})

# FIX #2: COMMON_TESIS_SECTIONS con frozensets pre-normalizados
# Las claves se normalizan una sola vez al cargar el módulo
_COMMON_SECTIONS_N1: frozenset[str] = frozenset({
    "resumen", "abstract", "capítulo", "capitulo", "apéndice", "apendice",
    "anexo", "índice", "indice", "referencias", "bibliografía", "bibliografia",
    "bibliografía complementaria", "agradecimientos", "dedicatoria"
})

_COMMON_SECTIONS_N2: frozenset[str] = frozenset({
    "introducción", "antecedentes", "marco teórico", "marco teorico",
    "planteamiento del problema", "objetivos", "objetivo general",
    "objetivos específicos", "justificación", "metodología", "metodologia",
    "resultados", "discusión", "consulta", "conclusiones",
    "trabajo futuro", "limitaciones", "materiales y métodos",
    "metodología y métodos", "antecedentes de la automatización",
    "metodología de la investigación", "resultados y discusión",
    "análisis de integración con odoo", "fase de recolección de datos",
    "fases de recolección de datos"
})

# Mapa unificado para búsqueda rápida
_COMMON_SECTIONS_MAP: dict[frozenset[str], str] = {
    _COMMON_SECTIONS_N1: "TITULO_N1",
    _COMMON_SECTIONS_N2: "TITULO_N2",
}

# FIX #9: Stats base pre-definido (compartido con apa_ai.py)
BASE_STATS: dict[str, int] = {
    "TITULO_N1": 0,
    "TITULO_N2": 0,
    "TITULO_N3": 0,
    "TITULO_N4": 0,
    "TITULO_N5": 0,
    "REFERENCIA": 0,
    "CITA_LARGA": 0,
    "PARRAFO_NORMAL": 0,
}

# ═══════════════════════════════════════════════════════════
# CONFIGURACIÓN (constantes)
# ═══════════════════════════════════════════════════════════

HEADING_SHORT_MAX_WORDS: int = 14
HEADING_LONG_MAX_CHARS: int = 100
CITA_LARGA_MIN_PALABRAS: int = 40
TITULO_PRINCIPAL_MIN_PALABRAS: int = 4
TITULO_PRINCIPAL_MAX_PALABRAS: int = 22
TITULO_CAPS_MAX_CHARS: int = 80


# ═══════════════════════════════════════════════════════════
# FUNCIONES DE NORMALIZACIÓN (OPTIMIZADAS)
# ═══════════════════════════════════════════════════════════

def _normalizar_texto(texto: str) -> str:
    """
    FIX #3: Normalización optimizada con regex pre-compilado.
    """
    return _RE_MULTIPLE_SPACES.sub(" ", texto.strip()).lower()


def _normalizar_encabezado(texto: str) -> str:
    """
    FIX #3: Normalización de encabezados optimizada.
    - Primero elimina dash/colones finales con regex pre-compilado
    - Luego colapsa espacios
    """
    texto_limpio = _RE_ENDS_WITH_DASH_COLON.sub("", texto.strip())
    texto_limpio = _RE_MULTIPLE_SPACES.sub(" ", texto_limpio)
    return texto_limpio.lower()


# ═══════════════════════════════════════════════════════════
# DETECCIÓN DE ENCABEZADOS (OPTIMIZADA)
# ═══════════════════════════════════════════════════════════

def _coincide_encabezado_con_lista(texto: str, candidatos: frozenset[str]) -> bool:
    """
    FIX #2: Búsqueda O(1) con frozenset en lugar de iterar lista O(n).
    """
    texto_limpio = _normalizar_encabezado(texto)
    return texto_limpio in candidatos


def _nivel_titulo_por_texto(texto: str) -> Optional[str]:
    """
    FIX #2 y #7: Clasificación optimizada con:
      - Frozensets pre-normalizados (búsqueda O(1))
      - Regex pre-compilados
      - Caché LRU para textos repetidos
    """
    texto_limpio = _normalizar_texto(texto)
    
    # Verificar secciones comunes con búsqueda O(1)
    if texto_limpio in _COMMON_SECTIONS_N1:
        return "TITULO_N1"
    if texto_limpio in _COMMON_SECTIONS_N2:
        return "TITULO_N2"
    
    # Patrones regex pre-compilados (en orden de especificidad)
    if _RE_CAPITULO_ANEXO.match(texto_limpio):
        return "TITULO_N1"
    
    if _RE_TABLA_FIGURA.match(texto_limpio):
        return "TITULO_N4"
    
    if _RE_NUMBERED_HEADING.match(texto_limpio):
        return "TITULO_N3"
    
    # Verificación por formato (más costosa, se hace al final)
    if _es_titulo_por_formato(texto) and len(texto_limpio.split()) <= 18:
        return "TITULO_N2"
    
    return None


# ═══════════════════════════════════════════════════════════
# DETECCIÓN DE REFERENCIAS Y CITAS
# ═══════════════════════════════════════════════════════════

def _es_referencia_apa(texto: str) -> bool:
    """
    FIX #1: Usa regex pre-compilado _RE_REFERENCIA_APA.
    """
    return _RE_REFERENCIA_APA.match(texto) is not None


def _es_bloque_cita(texto: str) -> bool:
    """
    Detecta si un párrafo es realmente un bloque de cita textual larga (≥40 palabras)
    según estándar APA.
    Para ser una CITA_LARGA debe:
      1. Tener al menos 40 palabras.
      2. Tener indicadores claros de cita textual:
         - Cita de página/párrafo al final: ej. (p. 45), (pp. 12-14), (párr. 5).
         - O comenzar con comillas ("...", «...», “...”).
    Un párrafo regular de redacción del autor (incluso si supera 40 palabras)
    es PARRAFO_NORMAL, no CITA_LARGA.
    """
    texto_stripped = texto.strip()
    palabras = texto_stripped.split()
    if len(palabras) < CITA_LARGA_MIN_PALABRAS:
        return False

    # Si empieza con comillas y tiene >= 40 palabras, es cita larga
    if texto_stripped.startswith(('"', '“', '«', "'")):
        return True

    # Si termina con cita de página (p. XX) típica de cita textual
    if _RE_PAGINA_CITA.search(texto_stripped):
        return True

    return False


# ═══════════════════════════════════════════════════════════
# DETECCIÓN DE TÍTULOS POR FORMATO (OPTIMIZADA)
# ═══════════════════════════════════════════════════════════

def _es_titulo_corto(texto: str) -> bool:
    """
    FIX #4 y #8: Optimizado con:
      - Regex pre-compilado para limpieza de palabras
      - Una sola pasada sobre las palabras (no itera dos veces)
      - Cálculo inline de capitalizadas vs relevantes
    """
    texto_limpio = texto.strip()
    
    # Descartar rápido: vacío o termina en puntuación
    if not texto_limpio or _RE_PUNCTUATION_END.search(texto_limpio[-1]):
        return False
    
    palabras = texto_limpio.split()
    num_palabras = len(palabras)
    
    # Descartar por longitud
    if num_palabras > HEADING_SHORT_MAX_WORDS:
        return False
    if len(texto_limpio) > HEADING_LONG_MAX_CHARS:
        return False
    
    # FIX #8: Una sola pasada contando capitalizadas y relevantes
    capitalizadas = 0
    relevantes = 0
    
    for palabra in palabras:
        # Limpiar palabra con regex pre-compilado
        limpia = _RE_NON_WORD_CHARS.sub("", palabra)
        if not limpia:
            continue
        
        # FIX #5: Búsqueda O(1) en frozenset
        if limpia.lower() in SMALL_WORDS:
            continue
        
        relevantes += 1
        if limpia[0].isupper():
            capitalizadas += 1
    
    if relevantes == 0:
        return False
    
    # Al menos 60% de palabras relevantes deben estar capitalizadas
    return capitalizadas >= max(1, int(relevantes * 0.6))


def _es_titulo_por_formato(texto: str) -> bool:
    """
    FIX #1: Usa regex pre-compilados en lugar de compilar en cada llamada.
    """
    texto_limpio = texto.strip()
    if not texto_limpio:
        return False
    
    # Título en mayúsculas sostenidas (corto)
    if texto_limpio.isupper() and len(texto_limpio) <= HEADING_LONG_MAX_CHARS:
        return True
    
    # Título corto con formato mixto
    if len(texto_limpio.split()) <= HEADING_SHORT_MAX_WORDS and _es_titulo_corto(texto_limpio):
        return True
    
    # Patrones académicos comunes (regex pre-compilados)
    if _RE_CAPITULO_ANEXO.match(texto_limpio):
        return True
    
    if _RE_SECCIONES_ACADEMICAS.match(texto_limpio):
        return True
    
    return False


def _es_primer_titulo_principal(texto: str) -> bool:
    """
    FIX #8: Optimizado con:
      - Una sola pasada sobre las palabras
      - Early returns para descartes rápidos
    """
    texto_limpio = texto.strip()
    
    # Descartes rápidos
    if not texto_limpio or _RE_PUNCTUATION_END.search(texto_limpio[-1]):
        return False
    
    palabras = texto_limpio.split()
    num_palabras = len(palabras)
    
    # Rango de palabras aceptable
    if num_palabras < TITULO_PRINCIPAL_MIN_PALABRAS or num_palabras > TITULO_PRINCIPAL_MAX_PALABRAS:
        return False
    
    # Si no tiene saltos de línea, requiere al menos 6 palabras
    if '\n' not in texto and num_palabras < 6:
        return False
    
    # FIX #8: Contar capitalizadas en la misma pasada
    capitalizadas = 0
    for palabra in palabras:
        if palabra and palabra[0].isupper():
            capitalizadas += 1
    
    # Al menos 40% capitalizadas
    umbral_caps = max(2, int(num_palabras * 0.4))
    if capitalizadas < umbral_caps:
        return False
    
    # Verificar frases académicas típicas
    texto_lower = texto_limpio.lower()
    if any(frase in texto_lower for frase in ('de la', 'en la', 'de los')):
        return True
    
    # Descartar si termina en preposición
    if texto_lower.endswith(' de') or texto_lower.endswith(' en'):
        return False
    
    return True


# ═══════════════════════════════════════════════════════════
# CLASIFICACIÓN PRINCIPAL (OPTIMIZADA)
# ═══════════════════════════════════════════════════════════

@lru_cache(maxsize=1024)
def _clasificar_parrafo_reglas_cached(texto: str, posicion: int) -> str:
    """
    FIX #7: Versión cacheada de clasificar_parrafo_reglas.
    Como los textos de párrafos pueden repetirse (ej. párrafos vacíos,
    encabezados idénticos), el caché evita recalcular.
    
    El parámetro 'posicion' se incluye en la clave del caché porque
    afecta al resultado (primer párrafo puede ser TITULO_N1).
    """
    texto_limpio = texto.strip()
    if not texto_limpio:
        return "PARRAFO_NORMAL"

    # Verificar referencia APA (patrón muy específico, se verifica primero)
    if _RE_REFERENCIA_APA.match(texto_limpio):
        return "REFERENCIA"

    # Verificar bloque de cita
    if _es_bloque_cita(texto_limpio):
        return "CITA_LARGA"

    # Verificar títulos por contenido
    nivel_titulo = _nivel_titulo_por_texto(texto_limpio)
    if nivel_titulo:
        return nivel_titulo

    # Primer párrafo puede ser título principal
    if posicion == 0 and _es_primer_titulo_principal(texto_limpio):
        return "TITULO_N1"

    # MAYÚSCULAS SOSTENIDAS corto → título principal
    if texto_limpio.isupper() and len(texto_limpio) <= TITULO_CAPS_MAX_CHARS:
        return "TITULO_N1"

    # Verificación por formato (más genérica)
    if _es_titulo_por_formato(texto_limpio):
        return "TITULO_N2"

    return "PARRAFO_NORMAL"


def clasificar_parrafo_reglas(texto: str, posicion: int = 0) -> str:
    """
    Clasifica un párrafo usando reglas heurísticas y regex (Plan Free).
    
    FIX #7: Delega en versión cacheada para textos repetidos.
    """
    return _clasificar_parrafo_reglas_cached(texto, posicion)


def _clasificar_parrafo_reglas_sin_cache(texto: str, posicion: int = 0) -> str:
    """
    Versión sin caché para casos donde no queremos usar memoria.
    Útil para fallback desde apa_ai.py donde los textos son únicos.
    """
    texto_limpio = texto.strip()
    if not texto_limpio:
        return "PARRAFO_NORMAL"

    if _RE_REFERENCIA_APA.match(texto_limpio):
        return "REFERENCIA"

    if _es_bloque_cita(texto_limpio):
        return "CITA_LARGA"

    nivel_titulo = _nivel_titulo_por_texto(texto_limpio)
    if nivel_titulo:
        return nivel_titulo

    if posicion == 0 and _es_primer_titulo_principal(texto_limpio):
        return "TITULO_N1"

    if texto_limpio.isupper() and len(texto_limpio) <= TITULO_CAPS_MAX_CHARS:
        return "TITULO_N1"

    if _es_titulo_por_formato(texto_limpio):
        return "TITULO_N2"

    return "PARRAFO_NORMAL"


# ═══════════════════════════════════════════════════════════
# PROCESAMIENTO POR LOTES (OPTIMIZADO)
# ═══════════════════════════════════════════════════════════

_BLIP_TAG_FULL  = '{http://schemas.openxmlformats.org/drawingml/2006/main}blip'
_NS_R_FULL      = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'


def _extraer_rel_imagen(paragraph) -> str | None:
    """
    Extrae el primer rId de imagen (r:embed) del XML del párrafo, o None si no hay imagen.
    Compatible con DrawingML (<a:blip r:embed="...">).
    """
    try:
        for blip in paragraph._p.iter(_BLIP_TAG_FULL):
            r_embed = blip.get(f'{{{_NS_R_FULL}}}embed')
            if r_embed:
                return r_embed
    except Exception:
        pass
    return None


def procesar_con_reglas(doc_paragraphs) -> dict:
    """
    Procesa una lista de párrafos usando el motor de reglas.

    FIX #9: Usa BASE_STATS.copy() en lugar de recrear el dict manualmente.
    NUEVO: Detecta párrafos con imagen y los incluye como PORTADA_IMAGEN.
    """
    stats = BASE_STATS.copy()
    detalles: list[dict] = []

    total = len(doc_paragraphs)
    hay_contenido = False  # Para saber si ya pasamos la portada

    for index, paragraph in enumerate(doc_paragraphs):
        texto = paragraph.text.strip()

        # Verificar si el párrafo contiene una imagen
        rel_img = _extraer_rel_imagen(paragraph)
        if rel_img:
            # Párrafo con imagen (ej: logo de la portada)
            detalles.append({
                "id": index,
                "texto": texto or "",
                "categoria": "PORTADA_IMAGEN",
                "rel_id": rel_img,
            })
            stats["PARRAFO_NORMAL"] = stats.get("PARRAFO_NORMAL", 0) + 1
            continue

        if not texto:
            # Párrafos vacíos ANTES del primer contenido = espaciado de portada
            if not hay_contenido:
                detalles.append({
                    "id": index,
                    "texto": "",
                    "categoria": "PORTADA_ESPACIO",
                })
            continue

        hay_contenido = True
        logger.debug(f"⚡ Procesando párrafo {index + 1}/{total} (Reglas)...")

        # Usar versión cacheada para aprovechar repeticiones
        categoria = clasificar_parrafo_reglas(texto, posicion=index)
        stats[categoria] = stats.get(categoria, 0) + 1
        detalles.append({
            "id": index,
            "texto": texto,
            "categoria": categoria,
        })

    return {"stats": stats, "detalles": detalles}
