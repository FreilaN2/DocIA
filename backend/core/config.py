"""
core/config.py
==============
Configuración de rutas del sistema y utilidades de archivos.
Centraliza BASE_DIR, UPLOAD_DIR, PROCESSED_DIR y los patrones
de sanitización de nombres de archivo.
"""

import os
import re
from functools import lru_cache

# Directorio raíz del backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Directorios de trabajo
UPLOAD_DIR    = os.path.join(BASE_DIR, "uploads")
PROCESSED_DIR = os.path.join(BASE_DIR, "processed")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

# Regex para sanitizar nombres de archivo en endpoints de upload.
# Previene path traversal al reemplazar cualquier carácter fuera del set seguro.
RE_SAFE_FILENAME = re.compile(r"[^A-Za-z0-9.-]")
RE_SAFE_BASENAME = re.compile(r"[^A-Za-z0-9 _-]")


@lru_cache(maxsize=1)
def get_frontend_dir() -> str:
    """
    Devuelve la ruta del build del frontend.
    Cacheada con lru_cache para evitar os.path.exists() en cada request.
    """
    cpanel = "/home2/teleredt/public_html/docai.teleredtv.com"
    if os.path.exists(os.path.join(cpanel, "index.html")):
        return cpanel

    # Prioridad en local: frontend/dist
    frontend_dist = os.path.join(os.path.dirname(BASE_DIR), "frontend", "dist")
    if os.path.exists(os.path.join(frontend_dist, "index.html")):
        return frontend_dist

    return os.path.join(BASE_DIR, "dist")
