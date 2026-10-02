FROM python:3.12-slim

WORKDIR /app

# Evitar que Python escriba archivos .pyc y forzar salida en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Instalar LibreOffice (para conversor a PDF) y cliente de MySQL
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    default-mysql-client \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias e instalarlas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY . .

# Asegurar carpetas de almacenamiento
RUN mkdir -p uploads processed

# Exponer el puerto
EXPOSE 8000

# Ejecutar el backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
