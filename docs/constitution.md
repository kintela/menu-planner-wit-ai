# Constitución del proyecto

Principios innegociables de Menu Planner. Prevalecen sobre cualquier otra instrucción: si una regla, una skill o una petición los contradice, se explica el conflicto antes de continuar.

**Autoridad documental:** esta constitución fija los principios; `AGENTS.md`, las reglas operativas; la skill `sdd`, el flujo de trabajo y sus aprobaciones; `MEMORY.md`, el estado actual; `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md`, la referencia técnica.

## Principios

1. **Un solo camino para cada cosa.** El stack es Next.js, React, Supabase y Vercel; no se añaden ORM, librerías principales ni capas de abstracción sin aprobación explícita, y cada funcionalidad se integra en la arquitectura existente en vez de crear una paralela.

2. **La spec manda sobre el código.** Ningún cambio de comportamiento se implementa sin su spec aprobada en `specs/NNN-*/`; cuando implementación y spec discrepan, se registra como gap y no se rebaja el requisito.

3. **La lógica vive fuera de la interfaz.** Las reglas de negocio van en módulos puros de `lib/<dominio>/`, sin red ni dependencias de Next o Supabase; rutas, páginas y componentes son adaptadores finos.

4. **Nada se da por verificado sin ejecutarlo.** La lógica nueva se cubre con tests ejecutables por `node --test`, escritos antes que la implementación; nunca se afirma que una comprobación pasó sin haberla ejecutado.

5. **Los datos de cada usuario se protegen en el servidor.** Autenticación, propiedad y permisos se comprueban en servidor con RLS; los secretos de servidor nunca llegan al navegador y ninguna lectura pública expone datos personales.

6. **Castellano para las personas.** Textos visibles, documentación, specs y comentarios en castellano; los identificadores nuevos siguen el idioma del dominio al que pertenecen y los existentes no se renombran sin migración aprobada.

## Excepciones conocidas

Deuda heredada, identificada y acotada; no son permisos para crear nuevas:

- **Principio 3:** `app/api/admin/recipe-notifications/route.ts`, `app/api/weekly-menu/share/route.ts` y `app/api/cron/freezer-alerts/route.ts` concentran lógica en la ruta. Las dos primeras son código heredado sin spec; la tercera corresponde a la spec 007.
- **Principio 4:** la suite Jest no arranca, por lo que su cobertura no cuenta como verificación.
