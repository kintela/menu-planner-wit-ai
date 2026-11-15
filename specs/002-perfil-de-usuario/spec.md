# Spec 002 — Perfil de usuario

**Estado: borrador**

## Contexto y objetivo
Permitir a cada persona consultar y mantener actualizada la información de su propio perfil, incluidos sus datos de contacto y avatar. El perfil identifica a la persona en la aplicación; el cambio de correo también debe respetar el ciclo de confirmación exigido por el proveedor de autenticación. Para que esta funcionalidad no exponga datos personales ni archivos, tanto el perfil como los objetos de avatar deben quedar aislados por propietario y el almacenamiento de avatares debe estar disponible de forma operativa. Dado que la inspección local confirmó que faltan el almacenamiento y sus políticas y que la lectura de perfiles es más amplia que la propiedad exigida, la adecuación mediante una migración formal posterior a la baseline es obligatoria para completar esta funcionalidad.

## Usuarios / actores
- Usuario autenticado que consulta o modifica su propio perfil.
- Supabase Auth, que procesa los cambios de correo y cualquier confirmación asociada.
- Almacenamiento de avatares de la aplicación.

## Historias de usuario
- H1: Como usuario autenticado quiero consultar mis datos de perfil para saber qué información está asociada a mi cuenta.
- H2: Como usuario autenticado quiero editar mis datos personales y de contacto para mantenerlos actualizados.
- H3: Como usuario autenticado quiero cambiar, quitar o restablecer mi avatar para controlar cómo aparezco en la aplicación.
- H4: Como usuario autenticado quiero cambiar mi correo respetando la confirmación requerida para mantener actualizado el acceso a mi cuenta.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: CUANDO un usuario autenticado consulta su perfil, EL SISTEMA muestra su nombre, apellidos, alias, teléfono, correo electrónico y avatar, reflejando los valores disponibles en su cuenta y perfil.
- RF-2: CUANDO el usuario guarda cambios en nombre, apellidos, alias o teléfono, EL SISTEMA actualiza esos datos en su propio perfil y presenta el resultado de la operación.
- RF-3: CUANDO el usuario cambia su correo electrónico, EL SISTEMA solicita el cambio para su propia identidad en el proveedor de autenticación y mantiene el estado del perfil coherente con el proceso de cambio; SI el proveedor requiere confirmación, EL SISTEMA respeta ese requisito y comunica que la confirmación está pendiente.
- RF-4: CUANDO el usuario selecciona un avatar, EL SISTEMA permite cambiar su avatar y asocia al perfil la referencia al nuevo avatar.
- RF-5: CUANDO el usuario solicita eliminar su avatar, EL SISTEMA elimina el archivo correspondiente a su propio avatar del almacenamiento y quita la referencia de avatar de su perfil, mostrando el avatar predeterminado.
- RF-6: CUANDO el usuario solicita volver al avatar predeterminado, EL SISTEMA presenta el avatar predeterminado y deja el perfil sin referencia a un avatar personalizado; si existe un archivo propio asociado, también lo elimina del almacenamiento.
- RF-7: EL SISTEMA limita la consulta y modificación de perfil al usuario autenticado propietario de ese perfil; ningún usuario, incluidos los administradores, gestiona perfiles ajenos mediante esta funcionalidad.
- RF-8: SI no existe sesión válida o la operación solicitada no corresponde al perfil del usuario autenticado, ENTONCES EL SISTEMA no revela ni modifica datos del perfil solicitado.
- RF-9: MIENTRAS se procesa una modificación de perfil, EL SISTEMA informa del estado y del resultado sin presentar como completada una operación que haya fallado.
- RF-10: EL SISTEMA dispone de almacenamiento de avatares operativo para conservar y recuperar los avatares personalizados asociados a los perfiles.
- RF-11: MIENTRAS un usuario autenticado consulta, crea, sustituye o elimina un objeto de avatar, EL SISTEMA verifica la propiedad a partir de la identidad autenticada y exige que la ruta del objeto esté dentro del prefijo propio cuyo primer segmento coincide con el identificador de esa identidad.
- RF-12: SI una operación de avatar aporta una URL o ruta arbitraria, carece de identidad autenticada o apunta fuera del prefijo derivado del identificador del usuario autenticado, ENTONCES EL SISTEMA no considera esa referencia prueba de propiedad y deniega la lectura, creación, sustitución o eliminación sin revelar el objeto.
- RF-13: SI un usuario anónimo, otro usuario autenticado o un administrador intenta consultar o editar un perfil ajeno mediante esta funcionalidad, ENTONCES EL SISTEMA deniega la operación sin revelar los datos del perfil.
- RF-14: CUANDO se habilitan o corrigen el almacenamiento y los controles de acceso necesarios para esta funcionalidad, EL SISTEMA conserva los perfiles y avatares existentes y la adecuación se entrega obligatoriamente mediante una migración formal nueva posterior a la baseline, sin eliminar datos existentes.
- RF-15: CUANDO el usuario reemplaza su avatar, EL SISTEMA elimina el objeto anterior únicamente después de que el nuevo objeto se haya cargado y asociado correctamente a su perfil; SI falla la carga o la asociación, ENTONCES EL SISTEMA conserva tanto la referencia como el objeto del avatar anterior.

## Requisitos no funcionales
- Las operaciones que leen o modifican datos de perfil deben comprobar autenticación y propiedad en una capa de confianza del servidor; la interfaz no constituye por sí sola autorización.
- Los datos de perfil y los objetos de avatar deben quedar accesibles únicamente para su propietario autenticado; no se admite lectura anónima ni acceso de otros usuarios por pertenecer a un rol administrativo.
- Los controles de acceso de esta funcionalidad deben aplicar el principio de mínimo privilegio y no pueden sortearse mediante credenciales que omitan las restricciones de acceso.
- La adecuación confirmada como necesaria de datos, almacenamiento y permisos debe materializarse obligatoriamente en una migración formal nueva posterior a la baseline, ser trazable, preservar los datos existentes y aplicarse y validarse primero en el entorno local aislado.
- El comportamiento se ofrece en la interfaz web existente, en español, siguiendo las convenciones visibles actuales.
- No se establecen requisitos nuevos de disponibilidad o rendimiento.

## Casos límite
- Un perfil sin avatar personalizado se muestra con el avatar predeterminado.
- Los valores de nombre, apellidos, alias y teléfono pueden estar vacíos; no se añaden reglas de obligatoriedad ni formato distintas del comportamiento existente.
- El correo nuevo puede requerir confirmación del proveedor. Hasta completar ese proceso, el sistema no debe comunicar que la dirección ya quedó confirmada.
- Si Auth acepta la solicitud pero exige confirmación, su estado puede diferir temporalmente del correo que el proveedor reconoce como confirmado; la interfaz debe reflejar el estado disponible y no afirmar sincronización confirmada prematuramente.
- Si falla la carga de un avatar nuevo durante un reemplazo, no se presenta el cambio como completado y se conservan el objeto y la referencia del avatar anterior.
- Si el avatar nuevo se carga pero falla su asociación al perfil, se conservan el objeto y la referencia del avatar anterior y este no se elimina por la mera existencia del objeto nuevo.
- El objeto anterior solo puede borrarse tras comprobar que el nuevo avatar quedó cargado y asociado correctamente; una URL devuelta o aportada por el cliente no demuestra por sí sola que la asociación se completó.
- En una eliminación explícita, si falla el borrado del objeto propio o la limpieza de su referencia, no se comunica que ambas acciones se completaron correctamente. En un reemplazo, si el nuevo avatar ya quedó asociado pero falla el borrado del anterior, no se comunica que la limpieza terminó correctamente y se mantiene la nueva asociación sin borrar el objeto nuevo.
- Las operaciones de avatar no pueden eliminar ni reemplazar archivos que no pertenezcan al usuario autenticado.
- Una referencia de avatar con una URL aparentemente válida, incluida una URL almacenada en el propio perfil, no acredita la propiedad si su ruta no pertenece al prefijo derivado de la identidad autenticada.
- Un cambio de correo rechazado por el proveedor no debe impedir que el sistema informe por separado del resultado de otros campos que sí se hayan guardado.
- Si el almacenamiento de avatares no existe o no está operativo, el sistema informa del fallo y no presenta la carga, sustitución o eliminación como completada.
- Si faltan controles de acceso o existe una configuración previa más permisiva, la funcionalidad no se considera segura ni finalizada hasta que el aislamiento por propietario haya sido aplicado y verificado.
- Los perfiles y avatares preexistentes deben conservarse durante la adecuación de permisos; una referencia histórica que no permita acreditar propiedad no autoriza a leer, sustituir ni borrar el objeto.
- Si solo una parte de la adecuación de seguridad está aplicada, el sistema no debe ampliar temporalmente el acceso a perfiles u objetos ni declarar operativa la funcionalidad completa.

## Supuestos y dependencias
- La ausencia local confirmada del almacenamiento de avatares y sus políticas, junto con la lectura local de perfiles más amplia que la propiedad exigida, obliga a realizar cambios formales de almacenamiento y acceso dentro del alcance de implementación de esta spec; no se presume que esos cambios estén aplicados en ningún otro entorno.
- Los cambios persistentes se incorporarán obligatoriamente como una migración formal nueva posterior a la baseline, sin alterar esta última, y la migración deberá preservar los datos existentes y aplicarse y verificarse primero en el entorno local aislado.
- La aplicación en un entorno remoto seguirá siendo una acción manual del usuario y requerirá su autorización independiente; los agentes no operarán sobre el entorno remoto.
- Los datos y políticas existentes deben tratarse de forma conservadora: se adaptan los permisos sin borrar perfiles ni objetos.

## Riesgos
- Hasta que la migración obligatoria se aplique y verifique localmente, la lectura amplia de perfiles y la ausencia del almacenamiento y sus políticas impiden considerar segura o completa la funcionalidad.
- Una comprobación de propiedad basada solo en una URL o referencia manipulable permitiría actuar sobre rutas ajenas; el riesgo se mitiga vinculando toda operación a la identidad autenticada y a su prefijo propio.
- Un reemplazo que borre primero el avatar anterior puede dejar al usuario sin su avatar vigente si falla la carga o la asociación del nuevo; el orden exigido por RF-15 evita esa pérdida.
- La aplicación remota accidental podría afectar datos o permisos fuera del entorno validado; solo el usuario puede realizarla manualmente con autorización independiente y los agentes no operan sobre remoto.

## Fuera de alcance
- Consulta o gestión de perfiles de terceros, incluso por administradores.
- Cambios en roles, permisos, registro, inicio/cierre de sesión o recuperación de contraseña.
- Cambios generales en el proveedor de autenticación o en su política de confirmación de correo.
- Cambios de esquema, almacenamiento o permisos que no sean necesarios para disponer del almacenamiento de avatares y garantizar el aislamiento por propietario definido en esta spec.
- Modificar la baseline existente o usar scripts históricos como sustituto de una migración formal nueva.
- Aplicar cambios, inspeccionar datos o configurar políticas en entornos remotos; esa aplicación corresponde manualmente al usuario con autorización independiente.
- Gestión de cualquier archivo del bucket que no sea el avatar propio del usuario.
- Nuevos atributos de perfil o reglas de validación que no estén especificados aquí o no se desprendan del comportamiento existente.

## Criterios de finalización
- Los RF son verificables con los flujos de consulta, actualización de datos, cambio de correo y gestión del avatar, incluyendo resultados de error.
- Se comprueba que un usuario anónimo, otro usuario autenticado y un administrador no pueden consultar ni alterar el perfil objetivo, mientras el propietario autenticado sí puede consultar y editar el suyo.
- Se comprueba que el almacenamiento de avatares está operativo y que lectura, creación, sustitución y borrado de objetos solo se permiten cuando la identidad autenticada coincide con el prefijo propio de la ruta; una URL o ruta arbitraria no concede acceso.
- Se comprueba que el avatar predeterminado aparece al quitar/restablecer el avatar personalizado y que no se leen, sustituyen ni borran archivos ajenos.
- Se comprueba que, durante un reemplazo, el avatar anterior solo se elimina después de cargar y asociar correctamente el nuevo, y que un fallo de carga o asociación conserva tanto su objeto como su referencia; la eliminación explícita sigue borrando el objeto propio y limpiando su referencia.
- Las confirmaciones requeridas por Supabase Auth se respetan y se informa del estado sin afirmar una confirmación no completada.
- Existe obligatoriamente una migración formal nueva posterior a la baseline para corregir los hallazgos locales de datos, almacenamiento y permisos; está revisada para preservar datos existentes y se aplica y verifica primero en local sin modificar la baseline.
- La implementación respeta `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md`; la presencia de una migración no se toma como evidencia de aplicación local o remota, y la aplicación remota queda pendiente de la acción manual del usuario.
- Se verifican los fallos parciales de avatar y de adecuación de permisos sin comunicar éxito total ni ampliar acceso durante estados incompletos.

## Dudas abiertas
- No hay dudas funcionales bloqueantes con las decisiones recibidas. El orden del reemplazo queda definido por RF-15; otros fallos parciales deben informarse sin prometer atomicidad ni contradecir la conservación obligatoria del avatar anterior cuando falle la carga o la asociación del nuevo.

## Fuentes y límites de evidencia
- La solicitud funcional define los campos, la propiedad del perfil, el manejo de avatar y el alcance de cambio de correo establecidos en esta especificación.
- El código actual de `components/user-profile-form.tsx` aporta evidencia de los campos existentes, validaciones visibles, uso del bucket `avatars`, guardado de `avatar_url` y llamada a Supabase Auth para cambio de correo. Esta evidencia no convierte las limitaciones actuales en requisitos ni acredita el estado de entornos remotos.
- `components/simple-navigation.tsx` muestra consumo del avatar y búsqueda en `avatars`; `lib/types.ts` declara campos de perfil utilizados por consumidores existentes.
- `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md` son las referencias normativas para separación cliente/servidor, autorización, almacenamiento y cambios de base de datos. `docs/constitution.md` no está presente en el repositorio inspeccionado; no se infieren reglas adicionales de ese archivo ausente.
- La inspección local previa confirmó que el almacenamiento `avatars` y sus controles de acceso no estaban disponibles y que la lectura de `user_profiles` era más amplia que la propiedad exigida. Este hallazgo hace obligatoria una migración formal nueva posterior a la baseline, que preserve datos y se aplique y verifique primero en local; no acredita el estado actual de ningún entorno remoto ni autoriza a operarlo.
- La feature no amplía administración de perfiles, no autoriza el uso de credenciales privilegiadas para eludir controles de acceso ni autoriza operaciones remotas de Supabase. La documentación de base de datos establece que el historial versionado no prueba el estado aplicado en cada entorno.
