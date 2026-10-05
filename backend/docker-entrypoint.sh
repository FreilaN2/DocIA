#!/bin/sh
set -e

echo "=========================================="
echo "🤖 Iniciando contenedor DocAI Backend..."
echo "=========================================="

# 1. Ejecutar script de inicialización (.env, BD MySQL, migraciones y seeders)
python /app/entrypoint_init.py

echo "=========================================="
echo "🚀 Arrancando servidor DocAI..."
echo "=========================================="

# 2. Ejecutar comando principal del contenedor (uvicorn)
exec "$@"
