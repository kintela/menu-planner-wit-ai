# Spec 007 — Alertas del congelador

## Contexto y objetivo

El congelador acumula alimentos que se olvidan: hoy hay 29 elementos y 11 de ellos llevan más de dos meses congelados, los más antiguos desde el 2025-12-18, casi un año. Existe desde el 2026-02-18 un proceso diario que debería avisar por correo de esos elementos, pero **nunca ha entregado un solo aviso**: la invocación programada se rechaza con 403 antes de consultar nada, porque la comprobación de autorización no reconoce al programador de tareas. El objetivo de esta spec es que ese aviso funcione de verdad, que avise de forma útil en lugar de insistir a diario, y que su autorización sea fiable y comprobable. Se aprovecha para alinear el proceso con el modelo de congelador único de la Spec 005, que hoy no respeta.

## Usuarios / actores

- Persona propietaria del congelador, con rol `admin`, que recibe los avisos y actúa sobre el inventario.
- Personas adicionales configuradas como destinatarias de los avisos.
- Programador de tareas, que invoca el proceso una vez al día sin intervención humana.
- Proveedor de correo, que entrega los avisos.

## Historias de usuario

- H1: Como propietaria del congelador quiero recibir un aviso cuando un alimento lleva demasiado tiempo congelado para consumirlo antes de tener que tirarlo.
- H2: Como destinataria quiero que el aviso llegue una vez y no todos los días para no acostumbrarme a ignorarlo.
- H3: Como propietaria quiero que, si un alimento sigue olvidado mucho tiempo, se me vuelva a recordar.
- H4: Como responsable del sistema quiero que nadie sin autorización pueda consultar el inventario ni provocar envíos de correo.
- H5: Como responsable del sistema quiero poder comprobar que el proceso funciona sin enviar correos reales.

## Requisitos funcionales (criterios de aceptación en EARS)

- RF-1: CUANDO el programador de tareas invoca el proceso una vez al día, EL SISTEMA acredita que la invocación procede del programador autorizado y, solo entonces, ejecuta la revisión del inventario.
- RF-2: SI la invocación no acredita ser del programador autorizado ni corresponde a una persona autenticada con rol `admin`, ENTONCES EL SISTEMA responde «no autorizado» sin revelar ningún dato del inventario, ni su tamaño, ni si existe congelador.
- RF-3: EL SISTEMA considera elegible todo elemento cuya fecha de congelación sea anterior o igual a la fecha resultante de restar a hoy el número de meses configurado como umbral.
- RF-4: MIENTRAS no exista un valor de umbral configurado, EL SISTEMA aplica un umbral de dos meses.
- RF-5: EL SISTEMA revisa únicamente los elementos pertenecientes al congelador único global definido por la Spec 005; si no existe congelador, termina sin avisar y sin error.
- RF-6: CUANDO existe al menos un elemento elegible del que aún no se ha avisado, EL SISTEMA envía un único correo que los agrupa a todos.
- RF-7: CUANDO el envío se completa con éxito, EL SISTEMA registra que esos elementos ya han sido avisados, junto con la fecha del aviso.
- RF-8: SI todos los elementos elegibles ya fueron avisados y ninguno ha alcanzado su recordatorio, ENTONCES EL SISTEMA no envía correo alguno y termina indicando que no hay novedades.
- RF-9: CUANDO han transcurrido los días configurados como periodo de recordatorio desde el último aviso de un elemento que sigue elegible, EL SISTEMA vuelve a incluirlo en el siguiente correo y actualiza su fecha de aviso.
- RF-9 bis: MIENTRAS no exista un periodo de recordatorio configurado, EL SISTEMA aplica 30 días.
- RF-18: CUANDO un correo incluye a la vez elementos avisados por primera vez y recordatorios, EL SISTEMA los presenta en una lista única, sin distinguirlos.
- RF-19: CUANDO se reduce el umbral configurado y ello vuelve elegibles elementos que antes no lo eran, EL SISTEMA los avisa en la siguiente ejecución programada, sin adelantarla.
- RF-10: SI un elemento deja de existir o deja de ser elegible, ENTONCES EL SISTEMA descarta el registro de aviso asociado, de modo que un elemento que vuelva a ser elegible más adelante se trate como nuevo.
- RF-11: EL SISTEMA envía los avisos exclusivamente a la lista de destinatarios configurada; si esa lista está vacía o no existe, no envía correo y termina señalando la falta de configuración.
- RF-12: EL SISTEMA no contiene direcciones de correo escritas en el código.
- RF-13: EL SISTEMA incluye en cada aviso, por elemento, su nombre, su fecha de congelación, el tiempo que lleva congelado, el cajón en que se encuentra, la cantidad y la categoría.
- RF-14: SI el envío del correo falla, ENTONCES EL SISTEMA no marca los elementos como avisados, deja constancia del fallo para diagnóstico y responde indicando el error, sin exponer credenciales ni detalles internos del proveedor de correo.
- RF-15: SI la configuración de correo está incompleta, ENTONCES EL SISTEMA no intenta el envío y responde indicando qué falta, sin revelar valores.
- RF-16: CUANDO una persona autorizada solicita una ejecución de comprobación, EL SISTEMA calcula los elementos elegibles y devuelve el resultado sin enviar correo y sin registrar avisos.
- RF-17: EL SISTEMA redacta el asunto y el contenido de los avisos en castellano.

## Requisitos no funcionales

- Seguridad: la acreditación del programador no puede depender de datos que cualquier cliente pueda falsificar, como el user-agent. El acceso a los datos del inventario se realiza desde servidor y las credenciales no se registran ni se devuelven.
- Privacidad: los avisos contienen datos del inventario doméstico y solo pueden dirigirse a los destinatarios configurados.
- Operación: una ejecución diaria debe completarse en el tiempo de ejecución disponible para una tarea programada y sin intervención manual.
- Observabilidad: el resultado de cada ejecución debe poder distinguirse entre «sin novedades», «aviso enviado» y «fallo», para poder diagnosticarlo sin reproducir el envío.
- Idioma: los textos dirigidos a personas se redactan en castellano.

## Casos límite

- No existe congelador, o existe pero no tiene cajones ni elementos.
- Elementos sin fecha de congelación: no son elegibles y nunca generan aviso.
- Elementos con fecha de congelación futura o incoherente: no son elegibles.
- Un elemento se consume y se registra otro con el mismo nombre: se trata como elemento distinto.
- Un elemento se elimina entre la consulta y el envío.
- El correo se envía pero el registro de avisados falla: el elemento podría volver a avisarse al día siguiente; es preferible repetir un aviso a perderlo.
- Dos ejecuciones concurrentes del proceso: no deben producir dos correos con los mismos elementos.
- Umbral configurado con un valor no numérico, negativo o cero.
- Lista de destinatarios con entradas repetidas, vacías o con espacios.
- El primer aviso tras implantar esta spec incluirá todos los elementos elegibles acumulados, hoy once.

## Fuera de alcance

- Cambiar el modelo de datos del inventario, incluida la incorporación de nuevas fechas o estados a los elementos.
- Alertas basadas en fecha de caducidad: ningún elemento tiene hoy ese dato informado, por lo que no alertarían de nada. Si en el futuro se informa, será materia de otra spec.
- Avisos por canales distintos del correo electrónico.
- Avisos a usuarios distintos de los destinatarios configurados, y cualquier reintroducción de la compartición de congeladores retirada por la Spec 005.
- Interfaz para configurar el umbral, el periodo de recordatorio o los destinatarios desde la aplicación.
- Cambiar la periodicidad de la tarea programada, que sigue siendo diaria.
- Corregir los errores recurrentes observados en las páginas de detalle de recetas, ajenos a esta funcionalidad.

## Criterios de finalización

- Todos los RF cubiertos por tests ejecutables con `node --test`, escritos antes de la implementación, incluidos los de autorización, elegibilidad, primer aviso, silencio sin novedades, recordatorio y fallo de envío.
- Demostración local del flujo completo contra el entorno de desarrollo aislado, con el correo capturado en el buzón local y sin envíos reales.
- Evidencia de que una invocación no autorizada recibe «no autorizado» sin filtrar datos del inventario.
- Verificación de que el código no contiene direcciones de correo.
- Tras el despliegue, comprobación de que la ejecución programada deja de responder 403 y registra un resultado interpretable.
- `npx tsc --noEmit` y `npm run lint` sin errores nuevos atribuibles al cambio.

## Dudas abiertas

Ninguna pendiente. Las tres dudas planteadas en la redacción quedaron resueltas por el usuario el 2026-11-15 y se incorporaron como requisitos:

- Periodo de recordatorio: **30 días** por defecto, configurable (RF-9 bis).
- Presentación: **lista única**, sin distinguir primer aviso de recordatorio (RF-18).
- Reducción del umbral: los nuevos elegibles se avisan **en la siguiente ejecución programada** (RF-19).

## Estado

**Spec aprobada por el usuario el 2026-11-15.** Queda habilitada la fase de plan.
