const { z } = require('zod');

// Esquema para los elementos de la composición vectorial
const ElementSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('rect'),
    x: z.number().or(z.string()),
    y: z.number().or(z.string()),
    width: z.number().or(z.string()),
    height: z.number().or(z.string()),
    rx: z.number().or(z.string()).optional(),
    ry: z.number().or(z.string()).optional(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().or(z.string()).optional(),
    opacity: z.number().or(z.string()).optional(),
    filter: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('circle'),
    cx: z.number().or(z.string()),
    cy: z.number().or(z.string()),
    r: z.number().or(z.string()),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().or(z.string()).optional(),
    opacity: z.number().or(z.string()).optional(),
    filter: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('path'),
    d: z.string(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().or(z.string()).optional(),
    opacity: z.number().or(z.string()).optional(),
    filter: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('line'),
    x1: z.number().or(z.string()),
    y1: z.number().or(z.string()),
    x2: z.number().or(z.string()),
    y2: z.number().or(z.string()),
    stroke: z.string().optional(),
    strokeWidth: z.number().or(z.string()).optional(),
    opacity: z.number().or(z.string()).optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('polygon'),
    points: z.string(),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().or(z.string()).optional(),
    opacity: z.number().or(z.string()).optional(),
    filter: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('ellipse'),
    cx: z.number().or(z.string()),
    cy: z.number().or(z.string()),
    rx: z.number().or(z.string()),
    ry: z.number().or(z.string()),
    fill: z.string().optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().or(z.string()).optional(),
    opacity: z.number().or(z.string()).optional(),
    filter: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('text'),
    contenido: z.string(),
    x: z.number().or(z.string()),
    y: z.number().or(z.string()),
    fontSize: z.number().or(z.string()).optional(),
    fontWeight: z.string().or(z.number()).optional(),
    fontFamily: z.string().optional(),
    fill: z.string().optional(),
    textAnchor: z.enum(['start', 'middle', 'end']).optional(),
    letterSpacing: z.string().optional(),
    filter: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('foreignObject'),
    contenido: z.string(),
    x: z.number().or(z.string()),
    y: z.number().or(z.string()),
    width: z.number().or(z.string()),
    height: z.number().or(z.string()),
    style: z.string().optional(),
    className: z.string().optional()
  }),
  z.object({
    tipo: z.literal('logo'),
    x: z.number().or(z.string()),
    y: z.number().or(z.string()),
    width: z.number().or(z.string()).optional(),
    height: z.number().or(z.string()).optional(),
    logo_id: z.string().default('logo_garza.svg'),
    className: z.string().optional()
  })
]);

// ─── Etapa 1: Schema ligero para los conceptos de diseño generados por la IA ───
const PaletaSchema = z.object({
  fondo:    z.string(),
  primario: z.string(),
  acento:   z.string(),
  texto:    z.string()
});

const TipografiaSchema = z.object({
  titular_size:        z.number(),
  titular_peso:        z.string(),
  subtitulo_posicion:  z.string(),
  fuente_sugerida:     z.string().optional()
});

const ConceptoSchema = z.object({
  id:                     z.number(),
  nombre:                 z.string(),
  disposicion:            z.string(),
  paleta_colores:         PaletaSchema,
  estructura_tipografica: TipografiaSchema,
  descripcion_elementos:  z.array(z.string())
});

const ConceptosResponseSchema = z.object({
  conceptos: z.array(ConceptoSchema).min(1).max(3)
});

// ─── Etapa 2: Schema completo del SVG ensamblado ─────────────────────────────
const IAInstructionSchema = z.object({
  color_acento: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
  estilo: z.object({
    degradados: z.array(z.object({
      id: z.string(),
      tipo: z.enum(['linear', 'radial']),
      x1: z.string().optional(),
      y1: z.string().optional(),
      x2: z.string().optional(),
      y2: z.string().optional(),
      cx: z.string().optional(),
      cy: z.string().optional(),
      r: z.string().optional(),
      stops: z.array(z.object({
        offset: z.string(),
        color: z.string(),
        opacity: z.number().or(z.string()).optional()
      }))
    })).optional(),
    filtros: z.array(z.object({
      id: z.string(),
      tipo: z.enum(['dropShadow', 'gaussianBlur']),
      dx: z.number().optional(),
      dy: z.number().optional(),
      stdDeviation: z.number().optional(),
      floodColor: z.string().optional(),
      floodOpacity: z.number().optional()
    })).optional(),
    clasesCSS: z.record(z.string(), z.string()).optional()
  }),
  composicion: z.array(ElementSchema)
});

module.exports = {
  IAInstructionSchema,
  ConceptosResponseSchema
};

