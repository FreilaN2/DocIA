"""
main.py
=======
Punto de entrada de la aplicación DocAI.
Solo contiene: configuración de FastAPI, middleware, startup y catchall del frontend.
Toda la lógica de negocio está en core/ y routers/.
"""

import os
import shutil
import subprocess
import traceback
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from core.database import init_db, get_db
from core.config import BASE_DIR, get_frontend_dir
from core.limiter import limiter
from core.dependencies import get_admin_user
from core.models import User
from routers import auth, apa, pagos, admin, notifications, coupons

# ─── Configuración global ─────────────────────────────────

load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"), override=True, encoding="utf-8-sig")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


# ─── Aplicación FastAPI ───────────────────────────────────

app = FastAPI(title="DocAI API", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://docia.qzz.io",
        "https://www.docia.qzz.io",
        "https://docai.teleredtv.com",
        "https://*.up.railway.app",
        "https://docai-production-6334.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """Cabeceras de seguridad HTTP y políticas HTTPS (HSTS + CSP) en producción."""
    host = (request.headers.get("host") or "").lower()
    is_local = host.startswith(("localhost", "127.0.0.1"))

    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    if not is_local:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = "upgrade-insecure-requests"

    return response

# ─── Routers ──────────────────────────────────────────────

# Routers directos
app.include_router(auth.router)
app.include_router(apa.router)
app.include_router(pagos.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(coupons.router)

# Routers con prefijo /api (compatibilidad con frontend compilado en producción y proxies)
app.include_router(auth.router, prefix="/api")
app.include_router(apa.router, prefix="/api")
app.include_router(pagos.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(coupons.router, prefix="/api")


# ─── Startup ──────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    logger.info("Intentando inicializar base de datos...")
    try:
        init_db()
        logger.info("Base de datos inicializada correctamente.")
    except Exception as e:
        logger.error(f"Error en startup DB: {e}")

    logger.info("Verificando fuentes personalizadas...")
    try:
        fonts_dir      = os.path.join(BASE_DIR, "fonts")
        user_fonts_dir = os.path.expanduser("~/.local/share/fonts")

        if os.path.exists(fonts_dir):
            os.makedirs(user_fonts_dir, exist_ok=True)
            fuentes_instaladas = False
            for font_file in os.listdir(fonts_dir):
                if font_file.lower().endswith(('.ttf', '.otf')):
                    src = os.path.join(fonts_dir, font_file)
                    dst = os.path.join(user_fonts_dir, font_file)
                    if not os.path.exists(dst):
                        shutil.copy(src, dst)
                        fuentes_instaladas = True
            if fuentes_instaladas:
                subprocess.run(
                    ["fc-cache", "-f", "-v"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
        else:
            logger.warning("No se encontro la carpeta fonts.")
    except Exception as e:
        logger.error(f"Error al cargar fuentes: {e}")


# ─── Endpoints de sistema ─────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/prueba-rapida")
def prueba_rapida():
    return {"status": "FastAPI esta vivo y responde en milisegundos!"}


@app.get("/diagnostico-db")
def diagnostico_db(
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Diagnóstico de conexión a la BD. Solo accesible por administradores."""
    config_info = {
        "MYSQL_URL_presente": bool(os.getenv("MYSQL_URL")),
        "DB_HOST": os.getenv("DB_HOST", "NO_DEFINIDO"),
        "DB_PORT": os.getenv("DB_PORT", "NO_DEFINIDO"),
        "DB_USER": os.getenv("DB_USER", "NO_DEFINIDO"),
        "DB_NAME": os.getenv("DB_NAME", "NO_DEFINIDO"),
        "DB_PASS_presente": bool(os.getenv("DB_PASS")),
    }
    try:
        db.execute(text("SELECT 1"))
        init_db()
        return {"status": "success", "mensaje": "Conexion a MySQL exitosa.", "config": config_info}
    except Exception as e:
        return {
            "status": "error",
            "mensaje": "Falla al conectar con MySQL",
            "error_real": str(e),
            "traceback": traceback.format_exc(),
            "config": config_info,
        }


# ─── Packs (endpoint público) ─────────────────────────────

@app.get("/packs")
@app.get("/api/packs")
async def listar_packs(db: Session = Depends(get_db)):
    from core.models import TokenPack
    packs = db.query(TokenPack).filter(TokenPack.is_active == True).all()
    return [{"id": p.id, "name": p.name, "price": float(p.price), "tokens": p.tokens} for p in packs]

# ─── Archivos PWA ─────────────────────────────────────────

@app.get("/manifest.webmanifest")
async def manifest():
    frontend = get_frontend_dir()
    manifest_path = os.path.join(frontend, "manifest.webmanifest")
    if os.path.exists(manifest_path):
        return FileResponse(manifest_path)
    raise HTTPException(status_code=404, detail="manifest.webmanifest no encontrado")

@app.get("/sw.js")
async def service_worker():
    frontend = get_frontend_dir()
    sw_path = os.path.join(frontend, "sw.js")
    if os.path.exists(sw_path):
        return FileResponse(sw_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="sw.js no encontrado")

@app.get("/workbox-{filename}")
async def workbox_files(filename: str):
    frontend = get_frontend_dir()
    workbox_path = os.path.join(frontend, f"workbox-{filename}")
    if os.path.exists(workbox_path):
        return FileResponse(workbox_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="Workbox file no encontrado")

# ─── Frontend React (catchall) ────────────────────────────

@app.get("/{catchall:path}")
def serve_react_app(catchall: str):
    # Si la petición es para una ruta de API (/api/...) que no fue capturada por ningún router,
    # responder con 404 JSON para que Axios no reciba HTML y lance errores de formato en React.
    if catchall.startswith("api/") or catchall == "api":
        raise HTTPException(status_code=404, detail="Endpoint de API no encontrado.")

    frontend  = get_frontend_dir()
    file_path = os.path.join(frontend, catchall)

    if catchall and os.path.isfile(file_path):
        return FileResponse(file_path)

    index_path = os.path.join(frontend, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)

    return {"detail": "Error: index.html no encontrado.", "tried": frontend}