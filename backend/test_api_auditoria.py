"""
backend/test_api_auditoria.py
Prueba de integración de los endpoints de auditoría y scorecard.
"""

import asyncio
from routers.apa import auditar_documento

parrafos_doc = [
    {"id": 0, "texto": "PORTADA DE PRUEBA UNIVERSIDAD", "categoria": "PORTADA_BLOQUE"},
    {"id": 1, "texto": "Marco Teorico de la Investigacion", "categoria": "TITULO_N1"},
    {"id": 2, "texto": "Como mencionan Perez (2020) y Garcia y Lopez (2019), el analisis cientifico es fundamental. Ademas se han encontrado discrepancias notables en estudios previos (Mendoza, 2021).", "categoria": "PARRAFO_NORMAL"},
    {"id": 3, "texto": "Referencias", "categoria": "TITULO_N1"},
    {"id": 4, "texto": "Perez, J. (2020). Metodologia Cientifica. Editorial Alfa.", "categoria": "REFERENCIA"},
    {"id": 5, "texto": "Garcia, M., & Lopez, R. (2019). Analisis Estadistico. Editorial Beta.", "categoria": "REFERENCIA"},
]

def test_endpoint_auditoria():
    print("Probando endpoint auditar_documento en modo FREE...")
    data_free = asyncio.run(auditar_documento({"parrafos": parrafos_doc, "plan": "free"}))
    print(f"Score Free: {data_free['score']}/100 ({data_free['nivel']})")
    print(f"Citas huerfanas count: {data_free['metricas']['citas_huerfanas_count']}")
    assert data_free['metricas']['citas_huerfanas_count'] == 1  # Mendoza (2021)
    assert len(data_free['citas_huerfanas']) == 0  # 0 letras o pistas en Free

    print("\nProbando endpoint auditar_documento en modo PRO...")
    data_pro = asyncio.run(auditar_documento({"parrafos": parrafos_doc, "plan": "pro"}))
    print(f"Score Pro: {data_pro['score']}/100 ({data_pro['nivel']})")
    print(f"Detalles bloqueados: {data_pro['detalles_bloqueados']}")
    assert data_pro['detalles_bloqueados'] is False
    assert data_pro['citas_huerfanas'][0]['autor'] == "Mendoza"
    assert data_pro['citas_huerfanas'][0]['locked'] is False

    print("\n[OK] INTEGRACION API FUNCIONA DE FORMA IMPECABLE!")

if __name__ == "__main__":
    test_endpoint_auditoria()
