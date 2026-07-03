# 📐 Vario Suite - Arquitectura de Software y Guía de Contribución

Esta documentación técnica detalla cómo funciona internamente **Vario Suite**, las tecnologías que utiliza, la arquitectura de sus módulos y cómo un desarrollador puede comenzar a colaborar o integrar nuevas herramientas en la suite.

---

## 🎨 Principios de Diseño del Proyecto
1. **Sin dependencias pesadas locales para el usuario:** El renderizado y empaquetamiento ocurren en el servidor (`backend/`).
2. **Código Abierto y Auto-hospedado (Self-Hosted):** Utiliza tecnologías estándar de desarrollo web para permitir su despliegue en cualquier servidor privado o VPS tradicional.
3. **Modularidad Estricta:** Las herramientas no comparten estado global mutable. Cada una vive en su propia carpeta bajo el directorio `features/`.

---

## 🚀 Módulo 1: Motor Generador Estático (Mapeador SVG)

La mayor complejidad del proyecto radica en procesar un archivo SVG (XML plano) generado por herramientas comerciales como **Adobe Illustrator** y reemplazar variables sin alterar la maquetación.

```
                    ┌───────────────────┐
                    │    Archivo SVG    │
                    └─────────┬─────────┘
                              │ (Lectura XML)
                              ▼
                    ┌───────────────────┐
                    │ svgParser.service │
                    └─────────┬─────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   Unión de tspan Rotos               Cálculos de Posición
   [Unifica variables]                [estimateTextWidth]
             │                                 │
             └────────────────┬────────────────┘
                              ▼
                    ┌───────────────────┐
                    │ svgAssembler.serv │
                    └─────────┬─────────┘
                              │ (Combinar con Excel/CSV)
                              ▼
                     SVG Renderizado Final
```

### 1. Resolución del problema de Kerning/Fragmentación:
Adobe Illustrator suele exportar variables envueltas en llaves (ej: `{{nombre}}`) fragmentadas en múltiples sub-etiquetas `<tspan>` por cuestiones de espaciado nativo de fuentes.
* **Solución:** El parser realiza una pre-evaluación recursiva buscando patrones incompletos de llaves `{{` y `}}`. Une los textos de los nodos adyacentes manteniendo los atributos del nodo principal de texto, evitando que la variable se imprima "rota".

### 2. Alineaciones Dinámicas (`estimateTextWidth`):
El estándar SVG no tiene un comportamiento de maquetación de caja flexible (Flexbox). El texto se posiciona con coordenadas absolutas (`x`, `y`). Si el valor de un campo es más largo (ej. `Pedro` vs `Maximiliano Francisco`), el texto se desborda o se solapa.
* **Solución:** Implementamos un calculador analítico de caracteres. A cada glifo se le asigna un factor de ancho relativo basado en la fuente (letras delgadas como 'i', 'l' contra anchas como 'w', 'M', '{}', '|').
* **Justificación de Coordenadas:**
  * **Centrado (`cen`):** Se calcula el ancho estimado, se divide entre 2 y se resta del punto de anclaje `x`.
  * **Derecha (`der`):** Se resta el ancho total estimado del punto de anclaje final `x`.

### 3. Parseo de colores hexadecimales en Illustrator:
Al nombrar capas en Illustrator como `#05393a`, el SVG resultante exporta IDs hexadecimales codificados (ej. `_x23_05393a`). El sistema decodifica estas secuencias y aplica reemplazos de color sobre los atributos de relleno (`fill`) o trazo (`stroke`) mediante estilos en línea (`style="fill: #color !important"`).

---

## 🤖 Módulo 2: Variantes con Inteligencia Artificial (IA)

Este módulo utiliza modelos fundacionales para diseñar o alterar la estructura visual de los vectores a través de instrucciones en lenguaje natural.

1. **Esquema de Respuesta Estricto:** Se define un JSON Schema utilizando `@google/genai` (`aiResponse.schema.js`) para obligar a Gemini a estructurar la respuesta con propiedades CSS y atributos vectoriales legibles (coordenadas, dimensiones, colores, tipografías).
2. **Pipelines de Renderizado en Servidor:** Un navegador invisible de Puppeteer levanta la plantilla de forma aislada, carga los fuentes requeridos y realiza una captura limpia de la variante para retornarla al usuario sin requerir motores gráficos locales.

---

## 📦 Sistema de Colas para Procesamiento por Lotes

Para prevenir la saturación de memoria en servidores de pocos recursos al procesar miles de registros simultáneamente (lotes de Excel de más de 500 filas):
* Implementamos un gestor de trabajos basado en colas con base de datos intermedia (Prisma SQLite en modo WAL) y soporte opcional para Redis.
* Las peticiones masivas se encolan y se procesan concurrentemente de 3 en 3 mediante hilos de Puppeteer.

---

## 🤝 Cómo Contribuir (Guía para Desarrolladores)

### Agregar una nueva herramienta al Frontend:
1. Crea una carpeta autocomponible en `frontend/src/features/[tu-herramienta]/`.
2. Estructura interna sugerida:
   ```
   mi-herramienta/
   ├── components/       # Componentes de la interfaz
   ├── styles/           # Archivos CSS locales
   └── hooks/            # Estado lógico aislado
   ```
3. Registra tu herramienta en `frontend/src/App.jsx` añadiendo su respectiva ruta.
4. Vincula la ruta en el panel lateral de navegación en `frontend/src/components/layout/VarioLayout.jsx`.

### Formato de Commits:
Para mantener el historial limpio y entendible para el resto de la comunidad, utiliza commits semánticos:
* `feat(modulo):` Nueva funcionalidad.
* `fix(modulo):` Solución de bugs o desajustes de UI.
* `docs(core):` Mejoras en la documentación.
* `refactor(modulo):` Reestructuración de código sin alterar su comportamiento externo.
