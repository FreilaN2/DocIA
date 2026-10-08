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

# Instalar las fuentes APA incluidas (Times New Roman, Calibri, Arial, Georgia) para que LibreOffice las use en el PDF
RUN mkdir -p /usr/share/fonts/truetype/docai && \
    cp -f /app/fonts/*.ttf /usr/share/fonts/truetype/docai/ 2>/dev/null || true && \
    fc-cache -f

# Asegurar carpetas de almacenamiento
RUN mkdir -p uploads processed

# Normalizar saltos de línea CRLF de Windows a LF y otorgar permisos de ejecución al entrypoint
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Exponer el puerto
EXPOSE 8000

# Configurar el entrypoint para inicialización automática
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Ejecutar el backend por defecto
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
