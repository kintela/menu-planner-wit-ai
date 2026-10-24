---
description: SDD · Entrevista y genera la spec (uso - /sdd-spec 002-nombre idea inicial)
agent: plan
---
NO escribas código en ningún momento. Lee AGENTS.md, docs/constitution.md y MEMORY.md; consulta `.agents/skills/sdd/SKILL.md` para el flujo SDD y usa obligatoriamente `templates/spec-template.md` como estructura de la spec. La plantilla del proyecto prevalece sobre cualquier estructura de ejemplo incluida en la skill.
Carpeta de la spec: specs/$1/
Idea inicial (el texto que va después del nombre de la carpeta): $ARGUMENTS
Tu trabajo:
1. Hazme preguntas de UNA en UNA para eliminar ambigüedades (casos límite,
errores, qué queda fuera de esta versión). Máximo 5 preguntas. No inventes respuestas; registra las dudas funcionales sin resolver como `[NECESITA ACLARACIÓN]` y no declares aprobada una spec con dudas que impidan definir el comportamiento.
2. Copia todos los encabezados y apartados de `templates/spec-template.md` a `specs/$1/spec.md` y completa cada uno. No omitas secciones; si alguna no aplica, indícalo explícitamente. Escribe los requisitos funcionales en EARS.
3. Limita la spec al QUÉ y al POR QUÉ; no incluyas diseño técnico, arquitectura ni nombres de archivos.
4. No crees `plan.md` ni `tasks.md` en este comando. La estructura documental oficial del proyecto para cada spec es `spec.md` y `plan.md`; el plan corresponde a la fase posterior y requiere aprobación de la spec.

