# Vario Suite - Protocolo de Sincronización y Dispersión de Código (Vibe Coding Git Rule)

Este documento instruye al agente de Inteligencia Artificial sobre cómo procesar, estructurar, aislar y documentar los cambios de código realizados en **Vario Suite** sin perder contexto ni sobrescribir o contaminar ramas principales.

---

## 🛠️ Triggers (Activadores)
Cuando el usuario escriba comandos cortos como:
* `/subir`
* `sube los cambios`
* `guarda mi progreso`
* `actualiza git`

---

## 📝 Reglas de Operación (Paso a Paso)

### 🔍 Paso 1: Análisis de Diferencias (Diff Assessment)
Antes de realizar cualquier commit o stage (`git add`), debes correr:
```bash
git status -s
```
Debes examinar los archivos modificados y clasificarlos en dos categorías principales:
1. **Cambios por Feature (Localizados):** Modificaciones dentro de una herramienta específica en `frontend/src/features/[feature-name]/` o su controlador respectivo en backend.
2. **Cambios del Core (Transversales):** Modificaciones globales a nivel de diseño en `frontend/src/index.css`, layouts del sistema (`VarioLayout.jsx`), enrutadores (`App.jsx`), o dependencias (`package.json`).

### 📦 Paso 2: Commits Atómicos y Segmentación
Bajo ninguna circunstancia debes agrupar cambios visuales del Core y lógica de una Feature en un solo commit. Sigue este orden de empaquetado:
* **Para cambios en un módulo independiente:**
  * Prefijo: `feat([modulo]):` para nuevas funciones, `fix([modulo]):` para correcciones de bugs.
  * Ejemplo: `fix(generator): resolver desalineación de textos a la derecha en renders SVG`
* **Para cambios generales de diseño o branding:**
  * Prefijo: `style(core):` o `style(layout):`
  * Ejemplo: `style(core): rediseñar Sidebar a violeta e inyectar variables de color de Vario Suite`
* **Para utilidades transversales u optimización:**
  * Prefijo: `chore(core):` o `refactor(backend):`

### 🚧 Paso 3: Dispersión y Gestión de Ramas
* **Ramas de Módulo:** Si el usuario está desarrollando una nueva herramienta compleja, los commits correspondientes deben dispersarse y subirse a una rama específica para ese módulo (ej. `feature/module-[nombre]`).
* **Protección de Main:** La rama `main` solo se toca al compilar versiones de producción estables etiquetadas (como `V1beta`, `V1.0`). El desarrollo rutinario debe consolidarse sobre la rama activa de desarrollo.

### 🧹 Paso 4: Limpieza Automática de Archivos Basura (Pre-Commit)
Nunca debes subir archivos temporales pesados o confidenciales. Verifica siempre antes de hacer push que estén excluidos o agregados a `.gitignore`:
* Archivos `.FDB` (Bases de datos locales de Firebird/SAE) -> Deben ignorarse siempre.
* Archivos `.env` o credenciales de APIs.
* Caches de servicios (como `.wwebjs_auth/`, `.wwebjs_cache/`, `node_modules/`).
