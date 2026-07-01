const { z } = require('zod');

const IAInstructionSchema = z.object({
  fondo_id: z.string(), // ej. "fondo_construccion.svg"
  elementos: z.array(z.string()), // ej. ["logo_garza_blanco.svg"]
  textos: z.object({
    titular: z.string().max(40),
    subtitulo: z.string().max(60),
    cuerpo: z.string().max(150)
  }),
  color_acento: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
});

module.exports = {
  IAInstructionSchema
};
