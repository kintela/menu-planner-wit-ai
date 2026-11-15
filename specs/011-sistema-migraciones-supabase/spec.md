# Spec 011 — Sistema de migraciones de Supabase

## Contexto y objetivo
Los cambios de base de datos se han gestionado mediante scripts SQL independientes y no existe un historial formal que permita identificar de forma trazable la estructura inicial y los cambios posteriores. El usuario ha confirmado que `supabase/production-schema.sql` acaba de ser extraído y lo considera una representación válida del esquema actual. La exactitud de esa referencia se basa en esa confirmación del usuario; no en una inspección o comparación del remoto realizada por el agente. Se busca establecer una baseline fiel a esa referencia y un registro ordenado de cambios futuros.

## Usuarios / actores
- Desarrolladores que preparan y revisan cambios de base de datos.
- Responsables autorizados de los entornos Supabase donde eventualmente se aplicarán cambios.

## Historias de usuario
- H1: Como desarrollador quiero disponer de una baseline y un historial ordenado para conocer la evolución prevista del esquema.
- H2: Como responsable de un entorno quiero distinguir la adopción de la baseline de la aplicación de cambios posteriores para evitar reejecutar la baseline sobre una base de datos ya existente.
- H3: Como revisor quiero poder rastrear cada cambio de esquema hasta su registro versionado.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO se establezca el punto inicial del historial, EL SISTEMA conservará intacto el contenido de `supabase/production-schema.sql` en una migración baseline con nombre versionado, sin reproducir en documentación narrativa el literal de correo personal presente en el snapshot.
- RF-2: CUANDO el historial se adopte en una base de datos remota existente, EL SISTEMA permitirá registrar la baseline como aplicada sin ejecutar su SQL.
- RF-3: CUANDO se inicialice una base de datos nueva mediante el historial, EL SISTEMA ejecutará el SQL de baseline para construir el esquema.
- RF-4: CUANDO se registre un cambio posterior a la baseline, EL SISTEMA lo representará como una migración individual, ordenada y trazable respecto a las versiones anteriores.
- RF-5: CUANDO se revise un cambio pendiente de aplicación, EL SISTEMA permitirá conocer qué migraciones se aplicarían sin efectuar cambios en la base de datos.
- RF-6: SI no existe evidencia suficiente sobre la aplicación de un script histórico, ENTONCES EL SISTEMA no lo presentará como aplicado por el mero hecho de que exista.
- RF-7: EL SISTEMA mantendrá diferenciados el contenido baseline derivado del snapshot y los cambios registrados con posterioridad.
- RF-8: CUANDO se valide que la baseline permite reconstruir el esquema, EL SISTEMA podrá inicializar e iniciar Supabase local aislado y aplicarla exclusivamente a una base local nueva y desechable; EL SISTEMA no ejecutará SQL ni migraciones contra ninguna base remota ni la modificará por definir o revisar la baseline y el historial.

## Requisitos no funcionales
- Seguridad: los cambios de esquema deben requerir revisión/autorización antes de aplicarse a un entorno; ninguna especificación de baseline implica por sí misma ejecución en producción.
- Trazabilidad: cada cambio futuro debe tener versión y orden inequívocos.
- Integridad: conservar literalmente el snapshot fuente; no reproducir en documentación narrativa el literal de correo personal que contiene.

## Casos límite
- La confianza en que el snapshot representa el esquema actual proviene de la confirmación explícita del usuario, no de inspección o comparación del remoto por parte del agente.
- Los scripts SQL antiguos pueden representar cambios aplicados, no aplicados o aplicados parcialmente; su mera presencia no acredita su ejecución.
- La adopción en una base existente consiste en registrar la baseline como aplicada, no en ejecutar el SQL; en una base nueva el SQL sí construye el esquema.
- Si durante el uso futuro se detectan divergencias o registros incompletos, la especificación no autoriza inferir que el entorno está sincronizado.

## Fuera de alcance
- Ejecutar SQL, migraciones o `supabase db push` contra cualquier base remota, modificar una base remota, vincular proyectos o verificar el remoto.
- Aplicar baseline o migraciones a una base local existente/no desechable. Se permite únicamente inicializar e iniciar Supabase local aislado y aplicar la baseline a una base local nueva y desechable para validar RF-3; esto no autoriza contacto, vinculación, ejecución ni cambios en el remoto.
- Inspeccionar o contactar el remoto para validar la referencia; la confirmación de exactitud de la referencia es del usuario.
- Modificar el snapshot fuente o los scripts SQL históricos en esta fase.
- Determinar el tratamiento de los scripts SQL históricos de `scripts/` en el nuevo historial.
- Definir la política operativa para divergencias o registros incompletos futuros.
- Rediseñar, corregir o auditar el esquema, sus políticas, funciones, datos o seguridad.

## Criterios de finalización
- La baseline queda definida conceptualmente como una representación exacta del snapshot aportado, sin exposición del literal personal en documentación narrativa.
- Los criterios distinguen baseline, adopción/reconocimiento de baseline y migraciones posteriores ordenadas.
- La especificación impide inferir que scripts antiguos se ejecutaron o que el snapshot fue verificado contra producción.
- La migración baseline conserva intacto el snapshot; para entornos remotos existentes se registra como aplicada sin ejecutar SQL y sin verificar el remoto; para validar RF-3 se permite aplicarla exclusivamente a una base local nueva y desechable.
- La especificación no declara que el agente haya inspeccionado o verificado el esquema remoto, ni autoriza ejecución o cambios SQL/migraciones en bases remotas.

## Dudas abiertas
- [NECESITA ACLARACIÓN] ¿Qué tratamiento debe darse a los scripts SQL históricos de `scripts/` al construir el nuevo historial: mantenerlos solo como referencia, reconstruir migraciones históricas cuando haya evidencia, u otro procedimiento?
- [NECESITA ACLARACIÓN] ¿Qué política operativa se seguirá ante divergencias o registros incompletos que se detecten en el futuro?
