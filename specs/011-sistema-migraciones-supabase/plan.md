# Plan — Sistema de migraciones de Supabase

## Alcance y trazabilidad

Este plan deriva de RF-1–RF-8 de `spec.md`. La carpeta de migraciones aprobada es `supabase/migrations/`. El usuario confirmó que `supabase/production-schema.sql` fue extraído recientemente y es válido como referencia; no se requiere ni se autoriza verificarlo contra el remoto. La implementación puede iniciar Supabase local aislado y ejecutar la baseline exclusivamente en una base local nueva y desechable para validar RF-3. El remoto queda totalmente fuera de alcance.

| Parte | RF cubiertos |
|---|---|
| Preparar el repositorio Supabase y su configuración CLI, preservando la ubicación de migraciones | RF-4, RF-5 |
| Revisar scripts históricos como evidencia, sin inferir ejecución ni importarlos automáticamente | RF-6, RF-7 |
| Versionar una copia byte por byte del snapshot como migración baseline | RF-1, RF-3, RF-7 |
| Documentar adopción de base existente: marcar baseline como aplicada sin ejecutar SQL ni comparar contra remoto | RF-2, RF-8 |
| Documentar flujo seguro de cambios futuros y previsualización de pendientes | RF-4, RF-5, RF-8 |
| Verificar recreación desde cero en base local vacía y consistencia de copia | RF-1, RF-3, RF-7 |

## Archivos previstos

- Añadir una configuración Supabase CLI en `supabase/config.toml` únicamente si no existe y la inicialización elegida lo requiere; fijar allí el directorio `supabase/migrations/` si el CLI permite configurarlo. No sobrescribir configuraciones existentes.
- Añadir `supabase/migrations/<versión>_baseline.sql`, copia exacta en bytes de `supabase/production-schema.sql`. No corregir, normalizar saltos de línea, reformatear ni retirar contenido; no reproducir el correo personal del snapshot en texto narrativo.
- No modificar `supabase/production-schema.sql`, `scripts/*.sql`, esquema de producción ni código productivo.
- No añadir archivos de documentación fuera de `specs/` durante esta fase de planificación.

## Enfoque y decisiones

1. Revisar la configuración actual del repositorio y los scripts SQL históricos para identificar qué temas/esquemas aparecen y posibles solapamientos con el snapshot. Mantenerlos como referencia no aplicada: su presencia no demuestra que hayan sido ejecutados. No decidir ni reconstruir una cronología histórica; solo informar el análisis como insumo para distinguir el baseline de cambios futuros (RF-6, RF-7).
2. Inicializar o adaptar la configuración CLI mínima sin alterar configuración preexistente, fijando `supabase/migrations/` como ubicación. En la implementación, inspeccionar antes de inicializar para evitar que el CLI genere archivos ajenos al alcance (RF-4, RF-5).
3. Copiar el snapshot a un archivo de migración con versión inequívoca, comprobando igualdad binaria (hash o comparación de bytes), no solo igualdad de SQL interpretado. El literal personal solo aparecerá donde ya existe y en la copia SQL aprobada; no se citará ni reproducirá en informes (RF-1, RF-7).
4. Para validar RF-3, iniciar Supabase local aislado y aplicar la baseline a una base local nueva y desechable, confirmando que se ejecuta como primera migración. No vincular el proyecto a remoto.
5. Para una base remota existente, limitarse a documentar que la baseline se marca como aplicada sin ejecutar SQL ni comparar o inspeccionar el remoto. No ejecutar `migration repair` ni ninguna operación remota en esta tarea. Cualquier `supabase link`, repair remoto o push remoto requiere autorización independiente futura (RF-2, RF-8).
6. Para cambios posteriores, crear archivos individuales ordenados con `supabase migration new <nombre>` y revisar el conjunto pendiente mediante una previsualización explícitamente local; por defecto `db push` puede actuar sobre el proyecto vinculado. No vincular remoto ni ejecutar push remoto durante esta tarea (RF-4, RF-5, RF-8).

La documentación consultada de Supabase CLI distingue `migration repair` (ajusta historial aplicado/revertido), `migration new`, `db push --dry-run` y el reset local. La alternativa descartada es ejecutar el SQL baseline sobre el remoto existente: podría recrear objetos presentes y contradice la adopción sin ejecución. También se descarta tratar scripts históricos como migraciones ya aplicadas, porque no hay evidencia suficiente.

## Funciones puras y fecha

No se prevén funciones de aplicación ni funciones puras nuevas: el alcance es configuración y SQL versionado. Si la implementación necesita fijar versión/fecha al crear el nombre de archivo, la fecha debe recibirse como parámetro explícito (por ejemplo, `hoy`) y no leerse implícitamente del reloj, para permitir repetibilidad y tests; no añadir helper general si basta con el mecanismo del CLI.

## Riesgos y controles

- El snapshot contiene un dato personal aprobado para estar en la migración fiel. No reproducirlo en este plan, tareas, logs ni reportes. No modificar el snapshot para ocultarlo: eso rompería la igualdad requerida.
- Una migración baseline SQL no debe confundirse con instrucciones para ejecutarla en una base existente.
- No inferir estados de ejecución de scripts históricos ni declarar sincronización remota.
- Cualquier comando que pueda conectarse o modificar un remoto (incluidos `supabase link`, `db push`, `migration repair` con remoto/linked, `db reset --linked`, `--db-url` o cualquier comando no claramente local) requiere autorización aparte, explícita y previa del usuario. Esta autorización es futura e independiente; no forma parte de este alcance. Sin ella, detenerse antes de ejecutarlo. Esta gate aplica incluso a comandos que solo cambien historial.
- Durante la fase de planificación no ejecutar SQL ni comandos CLI. La implementación local autorizada por RF-8 sí puede iniciar Supabase local aislado y aplicar SQL únicamente a una base local nueva y desechable. No configurar credenciales ni leer o alterar `.env` para conectar el remoto.

## Estrategia de tests y validación

- Validación de copia: comparar bytes/hash del snapshot y baseline sin imprimir contenido en salida; verificar que el nombre de migración tiene versión ordenable.
- Validación local de integración: en implementación, iniciar Supabase local aislado si aún no está iniciado y aplicar migraciones desde cero exclusivamente a una base local nueva y desechable. Confirmar éxito; nunca añadir `--linked` ni proporcionar URL remota. Esta prueba ejecuta la baseline localmente, no en remoto.
- Validación CLI de cambios pendientes: usar únicamente una previsualización que se haya confirmado explícitamente local y que no pueda dirigirse al remoto; no usar variantes linked ni URL remota.
- Si se añade lógica pura, probar con `node --test` (patrón `.test.mjs`), incluyendo inyección explícita de `hoy`; no introducir dependencias. Si no se incorpora lógica de aplicación testeable, no inventar tests unitarios.
- Los comandos y la sintaxis finales se comprobarán con la versión CLI disponible en implementación. No se ejecutan comandos en esta fase de planificación.

## Dependencias y no objetivos

Depende únicamente del snapshot validado por el usuario y de la CLI oficial de Supabase. Fuera de alcance: aplicar cambios a remoto, comparar remoto, decidir destino histórico de cada script, reconstruir eventos pasados, cambiar SQL de origen/histórico o revisar/auditar el contenido del esquema.
