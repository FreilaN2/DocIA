"""
core/constants.py
=================
Constantes de negocio compartidas entre routers.
"""

# Precios de suscripción Pro en USD (meses → precio)
SUBSCRIPTION_PRICES: dict[int, float] = {
    1:  5.00,
    3:  14.00,
    6:  25.00,
    12: 45.00,
}

# Tokens asignados por mes en el plan Pro
TOKENS_PER_MONTH_PRO: int = 10000

# Límite de páginas de la versión Free (ensayos y tareas cortas)
MAX_PAGES_FREE: int = 15
WORDS_PER_PAGE_APA: int = 250
MAX_WORDS_FREE: int = MAX_PAGES_FREE * WORDS_PER_PAGE_APA  # 3750 palabras
