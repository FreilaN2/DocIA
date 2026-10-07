# DocAI — Formateador de Tesis con IA

Aplicación web que analiza y formatea documentos `.docx` (tesis) según las **Normas APA 6ta y 7ma edición**, usando DeepSeek IA para clasificar semánticamente cada párrafo.

---

## 📁 Estructura del Proyecto

```
DocAI/
├── backend/        ← API REST en Python (FastAPI)
│   ├── main.py
│   ├── .env
│   ├── uploads/    ← Archivos subidos temporalmente
│   └── processed/  ← Archivos procesados para descarga
└── frontend/       ← Interfaz de usuario (React + Vite)
    ├── src/
    │   └── App.jsx
    └── package.json
```

---

## ⚙️ Requisitos Previos

- **Python** 3.10 o superior
- **Node.js** 18 o superior (incluye `npm`)
- **API Key de DeepSeek** → [Obtener aquí](https://platform.deepseek.com/api_keys)

---

## 🐍 Backend (FastAPI)

### 1. Crear entorno virtual

```bash
cd backend
python -m venv venv
```

Activar el entorno:

- **Windows:**
  ```bash
  venv\Scripts\activate
  ```
- **macOS/Linux:**
  ```bash
  source venv/bin/activate
  ```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

| Paquete              | Versión recomendada | Función                                                  |
| -------------------- | -------------------- | --------------------------------------------------------- |
| `fastapi`          | ≥ 0.111             | Framework web de la API                                   |
| `uvicorn`          | ≥ 0.29              | Servidor ASGI para FastAPI                                |
| `python-multipart` | ≥ 0.0.9             | Soporte para subida de archivos (`multipart/form-data`) |
| `python-dotenv`    | ≥ 1.0               | Carga de variables de entorno desde `.env`              |
| `python-docx`      | ≥ 1.1               | Lectura y escritura de archivos `.docx`                 |
| `openai`           | ≥ 1.0               | SDK compatible con la API de DeepSeek                     |

### 3. Configurar variables de entorno

Edita el archivo `backend/.env` con tu API Key:

```env
DEEPSEEK_API_KEY=tu_api_key_aqui
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=docai_db
DB_PORT=3306
```

### 4. Correr el servidor

```bash
uvicorn main:app --reload
```

El backend quedará disponible en: **http://127.0.0.1:8000**

Documentación automática de la API: **http://127.0.0.1:8000/docs**

---

## ⚛️ Frontend (React + Vite)

### 1. Instalar dependencias

```bash
cd frontend
npm install
```

| Paquete                 | Función                                     |
| ----------------------- | -------------------------------------------- |
| `react` `react-dom` | Librería UI principal                       |
| `axios`               | Cliente HTTP para comunicarse con el backend |
| `vite`                | Bundler y servidor de desarrollo             |

### 2. Correr el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173**

---

## 🚀 Flujo de Uso

1. **Subir documento** — Selecciona un archivo `.docx` (tu tesis o trabajo académico).
2. **Elegir edición APA** — Selecciona APA 6ta o 7ma edición.
3. **Analizar con IA** — El backend clasifica cada párrafo con DeepSeek IA.
4. **Corregir etiquetas** — Revisa y ajusta manualmente la clasificación de cada párrafo.
5. **Descargar** — Se genera y descarga un `.docx` con el formato APA aplicado correctamente.

---

## 🧪 Generar Documento de Prueba

Para generar un `.docx` de prueba con márgenes incorrectos (para validar el corrector):

```bash
cd backend
python tes_doc.py
```

Esto crea `test_extenso_docai.docx`, listo para subir a la aplicación.

---

## 📌 Endpoints de la API

| Método  | Ruta                     | Descripción                                                 |
| -------- | ------------------------ | ------------------------------------------------------------ |
| `POST` | `/procesar-apa/`       | Recibe `.docx` + edición, devuelve análisis de párrafos |
| `POST` | `/generar-final/`      | Recibe párrafos corregidos, genera el `.docx` final       |
| `GET`  | `/descargar/{file_id}` | Descarga el archivo procesado                                |
