# Draft Factory

Aplicación para la generación automatizada de tarjetas de presentación y documentos corporativos utilizando plantillas SVG y datos de archivos Excel.

## Características

- Carga de plantillas SVG hechas en Adobe Illustrator.
- Procesamiento de placeholders `{{Variable}}` con mapeo inteligente insensible a mayúsculas/minúsculas y acentos.
- Resolución de problemas de kerning en Illustrator mediante agrupado inteligente de `tspan` fragmentados.
- Generación de PDF maestro, imágenes (PNG/JPG) y presentaciones de PowerPoint (PPTX).
- Interfaz gráfica moderna y responsiva.

## Estructura del Proyecto

- `/backend`: Servidor Express + Puppeteer + PPTXGenJS.
- `/frontend`: Aplicación cliente React + Vite.

## Requisitos

- Node.js (v18+)
- Google Chrome o Chromium (para Puppeteer)

## Instalación y Desarrollo

### Backend
1. Entrar a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Frontend
1. Entrar a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Ejecutar cliente de desarrollo:
   ```bash
   npm run dev
   ```
