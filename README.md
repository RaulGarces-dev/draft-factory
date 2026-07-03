# ⚡ Vario Suite - Open Source Document & Variant Automation System

Vario Suite es una plataforma auto-hospedada y de código abierto diseñada para liberar a diseñadores, agencias y oficinistas de las costosas suscripciones mensuales de automatización de documentos. Permite generar credenciales, tarjetas corporativas, layouts y variantes a gran escala combinando el diseño vectorial libre (SVG) con orígenes de datos tabulares (Excel/CSV).

---

## 🛠️ Arquitectura de Módulos Activos (V1beta)

Vario Suite está estructurado como un monorrepo modular desacoplado en una capa de APIs de microservicios y un cliente React optimizado bajo Tailwind CSS v4.

### 1. 📊 Generador Estático (Módulo Core)
* **Propósito:** Mapear datos estructurados directamente a variables visuales en vectores.
* **Características Clave:**
  * **Alineación Milimétrica Automatizada:** Soporte para comandos rápidos (`cen`, `der`, `izq`) dentro del SVG para controlar el centrado y la justificación de textos modificados por datos sin perder coordenadas.
  * **Mapeo Robusto de Coordenadas:** Algoritmo `estimateTextWidth` que calcula el ancho real letra por letra (compensando anchos de llaves, barras y pesos tipográficos).
  * **Unión de Placeholders Fragmentados:** Combina automáticamente elementos `tspan` divididos por exportadores vectoriales externos (como Adobe Illustrator) antes de calcular la posición de renderizado.
  * **Cambio de Color Dinámico:** Reemplazo de colores hexadecimales (incluyendo el decodificador de caracteres especiales de Illustrator como `_x5F_` a `_`) inyectando estilos en línea priorizados.

### 2. 🤖 Variantes Inteligentes e IA (Módulo Experimental)
* **Propósito:** Generación y edición rápida de plantillas a través de lenguaje natural.
* **Características Clave:**
  * **Orquestación con Gemini 1.5 Pro:** Estructuración de parámetros y creación automática de elementos SVG a través del LLM de Google.
  * **Renderizado con Puppeteer:** Compilación instantánea del SVG a imágenes de alta definición PNG/JPG sin dependencias gráficas locales.

---

## 📂 Estructura del Proyecto (Monorrepo)

```
vario-suite/
├── backend/                  # Servidor de API en Express.js
│   ├── controllers/          # Controladores de Lógica (AI y Generador)
│   ├── services/             # Puppeteer, Gemini, Parsers SVG y Excel
│   ├── schema/               # Definiciones y validación JSON de la IA
│   └── routes/               # Enrutamiento de Endpoints HTTP
├── frontend/                 # Aplicación cliente React + Vite
│   └── src/
│       ├── components/       # Componentes visuales y layouts globales
│       └── features/         # Herramientas auto-contenidas (Modular)
│           ├── generator/    # Código del Generador Estático
│           └── generator_ia/ # Código del Asistente con IA
└── .agents/                  # Protocolos y reglas para agentes de desarrollo IA
```

---

## 🚀 Requisitos de Ejecución
* **Node.js:** Versión 18 o superior.
* **Google Chrome / Chromium:** Requerido para la exportación de PDFs y renderizado de imágenes mediante Puppeteer.
* **Clave de API de Gemini:** Requerido para el módulo de generación inteligente por IA (agregada en `backend/.env`).

---

## 🔧 Instalación y Puesta en Marcha

### 1. Clonar el repositorio e instalar backend
```bash
git clone https://github.com/RaulGarces-dev/draft-factory.git vario-suite
cd vario-suite/backend
npm install
```

### 2. Configurar Variables de Entorno del Backend
Crea un archivo `.env` dentro de la carpeta `backend/` con las siguientes credenciales:
```env
PORT=3000
GEMINI_API_KEY=tu_clave_de_api_aqui
```

### 3. Instalar Frontend
```bash
cd ../frontend
npm install
```

### 4. Lanzar en Desarrollo
* **Backend:** Ejecutar `npm run dev` dentro de `/backend` (inicia en http://localhost:3000).
* **Frontend:** Ejecutar `npm run dev` dentro de `/frontend` (inicia en http://localhost:5173).

---

## 🎨 Contribuir y Desarrollar Nuevos Módulos
Vario Suite está diseñado para ser altamente extensible. Si deseas añadir una nueva herramienta para diseñadores (ej: un compresor de imágenes local):
1. Crea una carpeta autocompatible bajo `frontend/src/features/mi-nueva-herramienta/`.
2. Encapsula allí tus componentes, estilos CSS y hooks locales.
3. Agrégalo al menú de enrutamiento en `frontend/src/App.jsx` y `VarioLayout.jsx`.

---

## 📖 Documentación Extendida y Desarrollo
* **[Guía de Arquitectura de Software](file:///docs/ARCHITECTURE.md):** Revisa el documento de arquitectura para comprender el motor de parseo SVG, justificación de coordenadas, integración de IA y el pipeline de colas del backend.
