"""
backend/tes_doc.py
==================
Generador de documento Word (.docx) de prueba con formato intencionalmente
DESORGANIZADO (fuentes mezcladas, tamaños dispares, márgenes incorrectos,
alineaciones erróneas, títulos de niveles N1 a N5 sin formato estándar,
citas textuales largas de +40 palabras sin sangría y referencias bibliográficas
desordenadas de la Z a la A).

Objetivo: Probar que DeepSeek IA + el motor de construcción APA de DocAI:
  1. Preserve la portada institucional y separe el cuerpo.
  2. Clasifique semánticamente TITULO_N1..N5, PARRAFO_NORMAL, CITA_LARGA y REFERENCIA.
  3. Aplique márgenes de 1 pulgada, interlineado doble, sangría de 1ra línea (0.5").
  4. Aplique sangría de bloque (0.5") a las citas largas (+40 palabras).
  5. Ordene alfabéticamente (A-Z) todas las referencias y les aplique sangría francesa.
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING


def _ensuciar_parrafo(
    doc: Document,
    texto: str,
    fuente: str = "Comic Sans MS",
    tamano: int = 10,
    bold: bool = False,
    italic: bool = False,
    align=WD_ALIGN_PARAGRAPH.LEFT,
    space_after: int = 14,
    first_indent: float = 0.0,
    color: tuple[int, int, int] = (40, 40, 40),
):
    """Agrega un párrafo con estilos intencionalmente incorrectos para APA."""
    p = doc.add_paragraph()
    p.alignment = align
    pf = p.paragraph_format
    pf.line_spacing_rule = WD_LINE_SPACING.SINGLE
    pf.space_before = Pt(3)
    pf.space_after = Pt(space_after)
    pf.first_line_indent = Inches(first_indent)

    run = p.add_run(texto)
    run.font.name = fuente
    run.font.size = Pt(tamano)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = RGBColor(*color)
    return p


def generar_documento_extenso(nombre_archivo: str) -> None:
    doc = Document()

    # ══════════════════════════════════════════════════════════════════
    # 1. PORTADA INSTITUCIONAL (para probar detección y preservación)
    # ══════════════════════════════════════════════════════════════════
    _ensuciar_parrafo(
        doc,
        "UNIVERSIDAD NACIONAL EXPERIMENTAL DE TECNOLOGÍA E INNOVACIÓN",
        fuente="Arial", tamano=14, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4
    )
    _ensuciar_parrafo(
        doc,
        "FACULTAD DE INGENIERÍA DE SISTEMAS Y COMPUTACIÓN",
        fuente="Arial", tamano=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=4
    )
    _ensuciar_parrafo(
        doc,
        "ESCUELA DE POSGRADO EN INTELIGENCIA ARTIFICIAL APLICADA",
        fuente="Arial", tamano=11, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24
    )

    # Espacios vacíos de portada
    for _ in range(3):
        doc.add_paragraph("")

    _ensuciar_parrafo(
        doc,
        "IMPACTO DE LOS MODELOS DE LENGUAJE DE GRAN ESCALA Y LA AUTOMATIZACIÓN INTELIGENTE EN LA GESTIÓN DE PROYECTOS EMPRESARIALES DE SYSCOTEK",
        fuente="Times New Roman", tamano=15, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=18
    )
    _ensuciar_parrafo(
        doc,
        "Trabajo de Grado presentado como requisito parcial para optar al título de Magíster Scientiarum en Ingeniería de Software y Sistemas Inteligentes",
        fuente="Calibri", tamano=11, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=24
    )

    for _ in range(2):
        doc.add_paragraph("")

    _ensuciar_parrafo(
        doc,
        "Autor: Ing. Carlos Eduardo Mendoza Rivas",
        fuente="Arial", tamano=12, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=4
    )
    _ensuciar_parrafo(
        doc,
        "Tutor Académico: Dr. Alejandro José Villarroel Salazar",
        fuente="Arial", tamano=12, bold=False, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=24
    )
    _ensuciar_parrafo(
        doc,
        "Caracas, Octubre de 2026",
        fuente="Arial", tamano=11, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=12
    )

    # ══════════════════════════════════════════════════════════════════
    # 2. RESUMEN Y ABSTRACT (Mal formateados a propósito)
    # ══════════════════════════════════════════════════════════════════
    # Debería ser detectado como TITULO_N1
    _ensuciar_parrafo(
        doc, "resumen",
        fuente="Verdana", tamano=16, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT, color=(120, 0, 0)
    )
    _ensuciar_parrafo(
        doc,
        "La presente investigación analiza la transformación operativa derivada de la adopción "
        "de arquitecturas basadas en modelos de lenguaje de gran escala (LLM) dentro de los flujos "
        "de trabajo administrativos y técnicos de la corporación SYSCOTEK durante el período 2025-2026. "
        "El estudio se enmarca en una metodología cuantitativa con diseño cuasi-experimental, evaluando "
        "una muestra de 145 proyectos tecnológicos antes y después de la integración de agentes "
        "automatizados con plataformas ERP como Odoo y servicios backend en FastAPI. Los hallazgos "
        "demuestran una reducción del 78.4% en los tiempos de revisión documental, una disminución "
        "del 64.2% en errores de trazabilidad y un incremento significativo en la satisfacción del "
        "cliente final. Palabras clave: inteligencia artificial, automatización, gestión de proyectos, "
        "modelos de lenguaje, eficiencia operativa.",
        fuente="Calibri", tamano=9, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=18
    )

    # Debería ser detectado como TITULO_N1
    _ensuciar_parrafo(
        doc, "ABSTRACT",
        fuente="Courier New", tamano=14, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT, color=(0, 80, 120)
    )
    _ensuciar_parrafo(
        doc,
        "This research analyzes the operational transformation resulting from the adoption of "
        "Large Language Model (LLM) architectures within the administrative and technical workflows "
        "of SYSCOTEK Corporation during the 2025-2026 period. Using a quantitative methodology and a "
        "quasi-experimental design, 145 technological projects were evaluated before and after "
        "integrating automated agents with Odoo ERP and FastAPI backend services. Findings show a "
        "78.4% reduction in document review times and a 64.2% decrease in traceability errors. "
        "Keywords: artificial intelligence, automation, project management, large language models.",
        fuente="Courier New", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT, space_after=20
    )

    # ══════════════════════════════════════════════════════════════════
    # 3. CAPÍTULO I: EL PROBLEMA (N1, N2, N3 + Cita Larga)
    # ══════════════════════════════════════════════════════════════════
    # TITULO_N1
    _ensuciar_parrafo(
        doc, "Capítulo I: El Problema de Investigación",
        fuente="Georgia", tamano=18, bold=False, italic=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2 (escrito en minúsculas y alineado a la derecha para retar a la IA)
    _ensuciar_parrafo(
        doc, "planteamiento del problema",
        fuente="Tahoma", tamano=13, bold=False, align=WD_ALIGN_PARAGRAPH.RIGHT
    )

    _ensuciar_parrafo(
        doc,
        "En el contexto actual de la cuarta revolución industrial, las organizaciones dedicadas al "
        "desarrollo de software e integración de sistemas enfrentan presiones crecientes para entregar "
        "soluciones escalables en plazos cada vez más reducidos. En SYSCOTEK, el crecimiento acelerado "
        "de la cartera de clientes evidenció cuellos de botella críticos en la fase de documentación "
        "técnica, auditoría de entregables y sincronización de requerimientos entre los equipos de "
        "desarrollo y los consultores funcionales.",
        fuente="Arial", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT, first_indent=0.0
    )

    _ensuciar_parrafo(
        doc,
        "Tradicionalmente, la verificación de estándares de calidad documental y el registro de "
        "incidencias en los tableros de control dependían de revisiones manuales exhaustivas. Esta "
        "práctica no solo consumía cientos de horas-hombre mensualmente, sino que introducía un alto "
        "margen de variabilidad subjetiva entre distintos líderes de proyecto. Al respecto, la literatura "
        "especializada advierte sobre los riesgos de mantener esquemas artesanales en entornos de alta "
        "complejidad tecnológica:",
        fuente="Calibri", tamano=13, align=WD_ALIGN_PARAGRAPH.JUSTIFY, first_indent=0.0
    )

    # CITA_LARGA (+40 palabras, bloque textual con cita parentética al final)
    _ensuciar_parrafo(
        doc,
        "La ausencia de mecanismos automatizados de validación semántica en la ingeniería de software "
        "moderna genera una deuda documental acumulativa que deteriora la mantenibilidad de los sistemas. "
        "Cuando los equipos técnicos invierten más del treinta por ciento de su jornada semanal en tareas "
        "de formateo, transcripción manual entre plataformas y verificación sintáctica de reportes, la "
        "capacidad de innovación se reduce drásticamente y aumenta la tasa de rotación del talento "
        "especializado dentro de la organización. (Hernández Sampieri, Fernández Collado & Baptista Lucio, 2022, p. 184)",
        fuente="Times New Roman", tamano=9, italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, first_indent=0.0
    )

    _ensuciar_parrafo(
        doc,
        "Lo expuesto anteriormente refleja con exactitud la problemática diagnosticada en el departamento "
        "de operaciones de SYSCOTEK durante el primer trimestre del año 2025, donde la dispersión de "
        "criterios entre analistas provocaba retrasos recurrentes en el cierre formal de cada iteración.",
        fuente="Verdana", tamano=11, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Objetivos de la Investigación",
        fuente="Arial", tamano=14, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER
    )

    # TITULO_N3
    _ensuciar_parrafo(
        doc, "1.1 Objetivo General",
        fuente="Calibri", tamano=11, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Evaluar el impacto de la implementación de una arquitectura de inteligencia artificial "
        "generativa basada en DeepSeek y FastAPI sobre la eficiencia operativa, precisión documental "
        "y tiempos de entrega en la gestión de proyectos empresariales de SYSCOTEK.",
        fuente="Calibri", tamano=11, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N3
    _ensuciar_parrafo(
        doc, "1.2 Objetivos Específicos",
        fuente="Calibri", tamano=11, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Diagnosticar los tiempos de procesamiento y la tasa de errores humanos presentes en el flujo "
        "tradicional de revisión documental y carga de datos en el sistema ERP Odoo antes de la "
        "intervención tecnológica.",
        fuente="Tahoma", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Diseñar un motor de clasificación semántica por lotes capaz de estructurar documentos "
        "académicos y corporativos bajo los lineamientos de las normas APA de sexta y séptima edición "
        "con tolerancia a fallos.",
        fuente="Tahoma", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Contrastar los indicadores clave de rendimiento (KPI) obtenidos tras seis meses de operación "
        "continua del sistema DocAI frente a las métricas históricas del período previo.",
        fuente="Tahoma", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Justificación e Importancia del Estudio",
        fuente="Georgia", tamano=13, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT
    )
    _ensuciar_parrafo(
        doc,
        "Desde una perspectiva práctica, esta investigación aporta una solución tangible a la sobrecarga "
        "operativa que sufren tanto investigadores académicos como consultores empresariales al momento "
        "de adecuar informes extensos a normativas editoriales rigurosas. Asimismo, en el plano "
        "metodológico, establece un precedente reproducible sobre cómo combinar modelos fundacionales "
        "con motores deterministas de reglas para garantizar resultados predecibles y seguros frente "
        "a ataques de inyección de instrucciones (prompt injection).",
        fuente="Arial", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # ══════════════════════════════════════════════════════════════════
    # 4. CAPÍTULO II: MARCO TEÓRICO (Con niveles N1, N2, N3, N4 y N5)
    # ══════════════════════════════════════════════════════════════════
    # TITULO_N1
    _ensuciar_parrafo(
        doc, "CAPÍTULO II: MARCO TEÓRICO REFERENCIAL",
        fuente="Impact", tamano=16, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Antecedentes de la Investigación",
        fuente="Arial", tamano=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER
    )

    # TITULO_N3
    _ensuciar_parrafo(
        doc, "2.1 Antecedentes Internacionales y Regionales",
        fuente="Arial", tamano=11, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Diversos autores han explorado recientemente la convergencia entre el procesamiento del "
        "lenguaje natural y la automatización de procesos robóticos (RPA) en entornos corporativos "
        "de alta exigencia. A continuación se examinan las investigaciones más relevantes vinculadas "
        "con el objeto de estudio.",
        fuente="Calibri", tamano=11, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N4 (Sub-apartado específico que en APA va sangrado y con punto)
    _ensuciar_parrafo(
        doc, "2.1.1 Experiencias de Automatización Documental en Europa.",
        fuente="Verdana", tamano=10, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "En un estudio desarrollado en la Universidad Politécnica de Madrid, García y Pérez (2025) "
        "implementaron un clasificador neuronal para auditar memorias técnicas de licitación pública, "
        "logrando reducir el tiempo de dictamen preliminar de cinco días hábiles a tan solo cuarenta "
        "minutos por expediente, con una concordancia inter-evaluador superior al noventa y dos por ciento.",
        fuente="Verdana", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N5 (Nivel más profundo de APA para probar los 5 niveles)
    _ensuciar_parrafo(
        doc, "2.1.1.1 Impacto en la Reducción de Costos Operativos Directos.",
        fuente="Verdana", tamano=10, italic=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "El análisis financiero derivado de dicho despliegue demostró que el retorno de inversión (ROI) "
        "se alcanzó al cuarto mes de operación, principalmente gracias a la eliminación de horas extras "
        "dedicadas a la corrección manual de estilo, ortotipografía y normalización de referencias cruzadas.",
        fuente="Verdana", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Bases Teóricas",
        fuente="Times New Roman", tamano=14, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N3
    _ensuciar_parrafo(
        doc, "2.2 Integración de Sistemas ERP Odoo con Microservicios en Python",
        fuente="Calibri", tamano=12, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT
    )
    _ensuciar_parrafo(
        doc,
        "Históricamente, la automatización empresarial se limitaba a scripts rígidos que fallaban ante "
        "el menor cambio en la estructura de los datos de entrada. Sin embargo, con la llegada de la IA "
        "generativa y el uso de frameworks asíncronos como FastAPI, es posible interpretar el contexto "
        "semántico del usuario antes de persistir la información en el núcleo transaccional de Odoo.",
        fuente="Arial", tamano=11, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # Segunda CITA_LARGA (+40 palabras)
    _ensuciar_parrafo(
        doc,
        "El desacoplamiento entre la capa de inferencia cognitiva y el sistema de planificación de "
        "recursos empresariales constituye un principio arquitectónico fundamental para garantizar la "
        "alta disponibilidad. Al delegar el procesamiento pesado de documentos y la llamada a modelos "
        "de lenguaje externos hacia colas asíncronas o flujos de eventos mediante Server-Sent Events, "
        "el servidor principal mantiene tiempos de respuesta de milisegundos sin bloquear las "
        "transacciones contables ni degradar la experiencia de los usuarios concurrentes. (Cote, 2026, p. 93)",
        fuente="Courier New", tamano=9, align=WD_ALIGN_PARAGRAPH.LEFT, first_indent=0.0
    )

    # ══════════════════════════════════════════════════════════════════
    # 5. CAPÍTULO III: MARCO METODOLÓGICO
    # ══════════════════════════════════════════════════════════════════
    # TITULO_N1
    _ensuciar_parrafo(
        doc, "Capítulo III: Marco Metodológico",
        fuente="Arial", tamano=16, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Tipo y Diseño de la Investigación",
        fuente="Calibri", tamano=13, bold=False, align=WD_ALIGN_PARAGRAPH.CENTER
    )
    _ensuciar_parrafo(
        doc,
        "La investigación se tipificó como aplicada y explicativa, dado que buscó resolver un problema "
        "concreto de procesamiento documental en SYSCOTEK determinando las relaciones de causa y efecto "
        "entre la clasificación asistida por el modelo DeepSeek y la calidad final de los entregables.",
        fuente="Times New Roman", tamano=11, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Fase de Recolección de Datos y Procesamiento por Lotes",
        fuente="Calibri", tamano=12, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Durante esta etapa se recopilaron 145 documentos extensos en formato Word (.docx) con una "
        "extensión promedio de entre 80 y 250 párrafos cada uno. Se aplicaron técnicas avanzadas de "
        "Prompt Engineering con salidas estructuradas en formato JSON para asegurar que el modelo "
        "clasificara cada fragmento exactamente en una de las categorías normativas sin alterar el "
        "contenido autoral.",
        fuente="Arial", tamano=10, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # ══════════════════════════════════════════════════════════════════
    # 6. CAPÍTULO IV: RESULTADOS Y CONCLUSIONES
    # ══════════════════════════════════════════════════════════════════
    # TITULO_N1
    _ensuciar_parrafo(
        doc, "Capítulo IV: Resultados y Discusión",
        fuente="Georgia", tamano=15, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT
    )

    # TITULO_N2
    _ensuciar_parrafo(
        doc, "Análisis de Precisión y Rendimiento del Sistema DocAI",
        fuente="Arial", tamano=12, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Los resultados experimentales indican que DocAI reduce el tiempo de formateo y corrección de "
        "tesis e informes técnicos en un 82.5%. Los usuarios destacaron positivamente la posibilidad "
        "de visualizar el documento en tiempo real mediante una interfaz dividida en React antes de "
        "generar la exportación definitiva en Word o PDF.",
        fuente="Calibri", tamano=11, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # TITULO_N1
    _ensuciar_parrafo(
        doc, "Conclusiones",
        fuente="Arial", tamano=14, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )
    _ensuciar_parrafo(
        doc,
        "Se concluye que la integración de la API de DeepSeek dentro del ecosistema DocAI proporciona "
        "un equilibrio óptimo entre velocidad de inferencia, costo operativo por token y exactitud en "
        "el reconocimiento de estructuras jerárquicas de documentos académicos en español.",
        fuente="Times New Roman", tamano=12, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    # ══════════════════════════════════════════════════════════════════
    # 7. REFERENCIAS BIBLIOGRÁFICAS (INTENCIONALMENTE DESORDENADAS Z -> A)
    #    El sistema debe clasificarlas como REFERENCIA, ordenarlas A -> Z
    #    y aplicarles sangría francesa de 0.5 pulgadas.
    # ══════════════════════════════════════════════════════════════════
    _ensuciar_parrafo(
        doc, "Referencias Bibliográficas",
        fuente="Comic Sans MS", tamano=15, bold=True, align=WD_ALIGN_PARAGRAPH.LEFT
    )

    referencias_desordenadas = [
        "Zúñiga, R., & Morales, P. (2025). Arquitecturas asíncronas en Python con FastAPI y motores de inteligencia artificial. Editorial Alfaomega.",
        "Wilson, K. (2024). The future of academic formatting and large language models in higher education. Journal of Educational Technology, 41(3), 112-129. https://doi.org/10.1016/j.jet.2024.03.008",
        "Vargas, M., & Castillo, D. (2023). Automatización inteligente de procesos empresariales en América Latina. Fondo Editorial Universitario.",
        "SYSCOTEK Labs. (2026). Reporte anual de innovación tecnológica, transformación digital y automatización corporativa. Ediciones SYSCOTEK.",
        "Rojas, F. (2024). Seguridad en modelos generativos: prevención de ataques de prompt injection en entornos productivos. Revista Iberoamericana de Ciberseguridad, 12(2), 45-67.",
        "Pineda, C., & Gómez, A. (2025). Evaluación del rendimiento de DeepSeek frente a modelos tradicionales en tareas de clasificación de texto en español. Inteligencia Artificial y Lenguaje, 19(1), 78-95.",
        "Navarro, E. (2021). Manual práctico de normas APA séptima edición para investigadores y tesistas. Ediciones Académicas.",
        "Mendoza, L., & Silva, J. (2023). Integración de sistemas ERP de código abierto con servicios cognitivos en la nube. Ingeniería y Desarrollo, 38(4), 201-220.",
        "Hernández Sampieri, R., Fernández Collado, C., & Baptista Lucio, P. (2022). Metodología de la investigación (7a ed.). McGraw-Hill Interamericana.",
        "García, J., & Pérez, L. (2025). Inteligencia artificial aplicada a la auditoría documental en la empresa moderna. McGraw-Hill.",
        "Cote, M. (2026). Guía avanzada de integración de Odoo y Python para arquitecturas empresariales de alto tráfico. Editorial Tech.",
        "Benítez, S., & Ortega, H. (2024). Procesamiento del lenguaje natural en documentos jurídicos y académicos. Revista Latinoamericana de Computación, 15(2), 33-51.",
        "Álvarez, G., & Domínguez, T. (2022). Estándares de calidad en la producción científica universitaria. Editorial Síntesis.",
    ]

    for idx, ref in enumerate(referencias_desordenadas):
        # Las agregamos con fuentes y alineaciones mezcladas y SIN sangría francesa
        _ensuciar_parrafo(
            doc,
            ref,
            fuente="Arial" if idx % 2 == 0 else "Calibri",
            tamano=9 if idx % 3 == 0 else 11,
            align=WD_ALIGN_PARAGRAPH.CENTER if idx % 4 == 0 else WD_ALIGN_PARAGRAPH.LEFT,
            first_indent=0.0,
        )

    # ══════════════════════════════════════════════════════════════════
    # 8. MÁRGENES INCORRECTOS (0.4" y 0.6") para que DocAI los lleve a 1.0"
    # ══════════════════════════════════════════════════════════════════
    for section in doc.sections:
        section.top_margin = Inches(0.4)
        section.bottom_margin = Inches(0.4)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)

    doc.save(nombre_archivo)
    print(f"[OK] Archivo de prueba desorganizado generado exitosamente en: {os.path.abspath(nombre_archivo)}")
    print(f"[INFO] Total de parrafos en el documento: {len(doc.paragraphs)}")
    print("[LISTO] Subelo en DocAI para probar la clasificacion de DeepSeek y el formateo APA.")


if __name__ == "__main__":
    # Guardar tanto en el directorio de backend como en la raíz si se ejecuta desde fuera
    out_backend = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_extenso_docai.docx")
    generar_documento_extenso(out_backend)