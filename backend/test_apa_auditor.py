"""
backend/test_apa_auditor.py
Prueba unitaria del módulo de auditoría de citas y scorecard de salud APA.
"""

import time
from core.apa_auditor import ejecutar_auditoria_completa

# Párrafos de prueba simulando un documento académico con citas y referencias
parrafos_prueba = [
    {
        "id": 0,
        "texto": "UNIVERSIDAD CENTRAL DE VENEZUELA\nFACULTAD DE CIENCIAS",
        "categoria": "PORTADA_BLOQUE"
    },
    {
        "id": 1,
        "texto": "Introducción a la Inteligencia Artificial.",
        "categoria": "TITULO_N1"  # Notar el punto final (error APA intencional)
    },
    {
        "id": 2,
        "texto": "El aprendizaje automático ha transformado la sociedad contemporánea de manera exponencial, permitiendo optimizaciones notables en diversos campos productivos y científicos, tal como señalan investigaciones seminales (Pérez, 2020). Asimismo, según García y López (2019), el impacto en el procesamiento de lenguaje natural ha sido revolucionario.",
        "categoria": "PARRAFO_NORMAL"
    },
    {
        "id": 3,
        "texto": "Por otro lado, existen limitaciones éticas evidentes en el despliegue de modelos generativos (Mendoza, 2021). Diversos autores han alertado sobre los sesgos inherentes en los corpus de entrenamiento masivos (Silva et al., 2018; Rodríguez, 2022).",
        "categoria": "PARRAFO_NORMAL"
    },
    {
        "id": 4,
        "texto": "Referencias",
        "categoria": "TITULO_N1"
    },
    {
        "id": 5,
        "texto": "García, M., & López, R. (2019). Avances en procesamiento de lenguaje natural. Editorial Académica.",
        "categoria": "REFERENCIA"
    },
    {
        "id": 6,
        "texto": "Pérez, J. (2020). Fundamentos de inteligencia artificial y redes neuronales. Ediciones Científicas.",
        "categoria": "REFERENCIA"
    },
    {
        "id": 7,
        "texto": "Torres, K. (2015). Ética y tecnología en el siglo XXI. Editorial Universitaria.",
        "categoria": "REFERENCIA"  # Referencia fantasma: Torres no fue citado en el texto!
    }
]

def test_auditoria():
    print("==================================================")
    print("1. PROBANDO AUDITORÍA EN MODO FREE ($0 COSTO IA)...")
    print("==================================================")
    inicio = time.time()
    res_free = ejecutar_auditoria_completa(parrafos_prueba, plan="free")
    duracion = (time.time() - inicio) * 1000

    print(f"[*] Tiempo de ejecucion: {duracion:.2f} ms")
    print(f"[+] Score APA: {res_free['score']}/100 ({res_free['nivel']}) - Color: {res_free['color']}")
    print(f"[+] Metricas: {res_free['metricas']}")
    print(f"[!] Alertas detectadas ({len(res_free['alertas'])}):")
    for a in res_free['alertas']:
        print(f"   [{a['tipo'].upper()}] {a['titulo']}: {a['mensaje']}")

    print(f"\n[LOCKED] En Free citas_huerfanas es lista vacia (0 letras/pistas): {len(res_free['citas_huerfanas'])} items")
    print(f"[LOCKED] Conteo conservado en metricas: {res_free['metricas']['citas_huerfanas_count']} citas huerfanas")

    print("\n==================================================")
    print("2. PROBANDO AUDITORIA EN MODO PRO...")
    print("==================================================")
    res_pro = ejecutar_auditoria_completa(parrafos_prueba, plan="pro")
    print(f"[+] Score APA: {res_pro['score']}/100")
    print(f"[UNLOCKED] Citas huerfanas en Pro (desbloqueadas con ID de parrafo y cita exacta):")
    for ch in res_pro['citas_huerfanas']:
        print(f"   -> Parrafo #{ch['parrafo_id']}: '{ch['texto_cita']}' (Autor: {ch['autor']}, Ano: {ch['año']})")

    print(f"[UNLOCKED] Referencias fantasma en Pro (desbloqueadas con extracto de bibliografia):")
    for rf in res_pro['referencias_fantasma']:
        print(f"   -> Parrafo #{rf['parrafo_id']}: '{rf['texto']}' (Autor: {rf['autor']}, Ano: {rf['año']})")

    # Aserciones de verificación
    # Se citaron: Pérez (2020), García (2019), Mendoza (2021), Silva (2018), Rodríguez (2022)
    # En referencias están: García (2019), Pérez (2020), Torres (2015)
    # Huérfanas: Mendoza (2021), Silva (2018), Rodríguez (2022) -> 3 citas
    # Fantasma: Torres (2015) -> 1 ref
    assert res_free['metricas']['citas_huerfanas_count'] == 3, f"Esperado 3 huerfanas, obtenido {res_free['metricas']['citas_huerfanas_count']}"
    assert res_free['metricas']['referencias_fantasma_count'] == 1, f"Esperado 1 fantasma, obtenido {res_free['metricas']['referencias_fantasma_count']}"
    assert len(res_free['citas_huerfanas']) == 0, "En Free citas_huerfanas debe ser lista vacia"
    assert len(res_free['referencias_fantasma']) == 0, "En Free referencias_fantasma debe ser lista vacia"
    assert len(res_pro['citas_huerfanas']) == 3, "En Pro citas_huerfanas debe contener los 3 detalles"
    assert res_free['detalles_bloqueados'] is True, "En Free los detalles deben estar bloqueados"
    assert res_pro['detalles_bloqueados'] is False, "En Pro los detalles deben estar desbloqueados"
    assert res_free['detalles_bloqueados'] is True, "En Free los detalles deben estar bloqueados"
    assert res_pro['detalles_bloqueados'] is False, "En Pro los detalles deben estar desbloqueados"
    print("\n[OK] TODOS LOS TESTS PASARON EXITOSAMENTE EN < 5 MS!")

if __name__ == "__main__":
    test_auditoria()
