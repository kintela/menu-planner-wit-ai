# Spec 004 — Planificación de menús semanales

## Contexto y objetivo
Consolidar la planificación semanal para que cada persona autenticada organice de forma explícita y segura sus comidas y cenas, pueda utilizar cualquier receta pública, reutilice una semana anterior sin alterar el origen y distinga con claridad los cambios pendientes de los ya guardados. La funcionalidad debe proteger la propiedad de cada menú, permitir el soporte administrativo autorizado, conservar las semanas pasadas y evitar pérdidas accidentales o estados semanales incompletos.

## Usuarios / actores
- Usuario autenticado con rol `user_restricted` o `user_full`, que consulta y gestiona sus propios menús semanales.
- Administrador autenticado, que gestiona sus propios menús y puede consultar y modificar los menús de cualquier usuario dentro de los mismos límites temporales.
- Visitante sin sesión, que no tiene acceso a los menús semanales.
- Propietario del menú, que es el usuario para quien se planifica la semana, aunque la modificación autorizada la realice un administrador.

## Historias de usuario
- H1: Como usuario autenticado quiero planificar mis comidas y cenas por semana para organizar qué recetas prepararé cada día.
- H2: Como usuario autenticado quiero guardar expresamente mis cambios para controlar cuándo pasan a ser persistentes.
- H3: Como usuario autenticado quiero reutilizar un menú guardado sin alterar su semana de origen para ahorrar tiempo al planificar otra semana.
- H4: Como usuario autenticado quiero recibir un aviso antes de abandonar cambios sin guardar para no perderlos accidentalmente.
- H5: Como usuario autenticado quiero marcar de forma reversible un plato como sacado del congelador para recordar esa condición sin modificar el inventario.
- H6: Como administrador quiero seleccionar un usuario y gestionar sus menús autorizados para prestarle soporte sin acceder a datos personales innecesarios.
- H7: Como usuario quiero consultar semanas pasadas sin poder alterarlas para preservar la planificación histórica tal como quedó guardada.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: MIENTRAS una persona no tenga una sesión autenticada válida, EL SISTEMA deniega la consulta, creación, modificación, vaciado y reutilización de cualquier menú semanal.
- RF-2: EL SISTEMA permite a los usuarios autenticados con rol `user_restricted`, `user_full` o `admin` consultar y gestionar los menús cuyo propietario es su propia identidad autenticada.
- RF-3: CUANDO un administrador autenticado selecciona otro usuario, EL SISTEMA permite consultar todos sus menús y modificar únicamente sus semanas actual y futuras; SI un usuario no administrador intenta seleccionar o actuar sobre otro propietario, ENTONCES EL SISTEMA deniega la operación sin revelar ni alterar sus menús.
- RF-4: EL SISTEMA autoriza cada lectura y escritura en servidor a partir de la sesión vigente, el rol, el propietario objetivo, la semana y la acción solicitada; esta funcionalidad nunca usa `service-role` ni otro mecanismo que omita RLS, y ningún dato aportado por el cliente constituye autorización.
- RF-5: EL SISTEMA usa `Europe/Madrid` como zona horaria autoritativa para determinar la fecha actual, el lunes de cada semana y la transición entre semana pasada, actual y futura, con el mismo resultado en todas las vistas y operaciones.
- RF-6: EL SISTEMA representa cada semana desde el lunes hasta el domingo, ambos incluidos, y asigna los días con índices consecutivos del 0 para el lunes al 6 para el domingo.
- RF-7: EL SISTEMA mantiene exactamente un menú como máximo por propietario y fecha de inicio semanal, con la fecha de fin correspondiente al domingo de esa misma semana.
- RF-8: EL SISTEMA ofrece para cada uno de los siete días exactamente tres huecos posibles: comida con orden de plato 1, comida con orden de plato 2 y cena con orden de plato 1; cada hueco admite como máximo una receta y puede permanecer vacío.
- RF-9: CUANDO un actor autorizado añade o sustituye una receta en un hueco editable, EL SISTEMA permite elegir cualquier receta pública, sea propia o de otro autor, sin exigir que el propietario del menú sea autor de la receta, y conserva una sola asociación para ese hueco; CUANDO retira la receta, EL SISTEMA deja el hueco vacío en el estado pendiente.
- RF-10: CUANDO se muestra un menú, EL SISTEMA presenta en cada hueco ocupado la receta asociada mediante su representación pública segura, sin ampliar la identidad pública de su autor.
- RF-11: MIENTRAS la semana seleccionada sea la semana natural actual o una semana futura, EL SISTEMA permite a su propietario o a un administrador autorizado modificar sus huecos, reutilizar otro menú, restaurar el destino, cambiar la marca de congelador, guardar y vaciar la semana.
- RF-12: MIENTRAS la semana seleccionada haya finalizado antes del lunes de la semana natural actual, EL SISTEMA la presenta en modo de solo lectura y deniega cualquier intento de añadir, sustituir o retirar recetas, reutilizar o restaurar menús, cambiar la marca de congelador, guardar o vaciar la semana, incluso si el actor es administrador.
- RF-13: CUANDO un actor autorizado modifica huecos o marcas de una semana editable, EL SISTEMA mantiene los cambios como pendientes sin persistirlos automáticamente.
- RF-14: CUANDO un actor autorizado pulsa Guardar sobre una semana editable con al menos un hueco ocupado, EL SISTEMA persiste como una única operación coherente el menú, sus huecos y sus marcas, sustituye el estado guardado anterior de ese destino y comunica el resultado real de la operación.
- RF-15: CUANDO un actor autorizado pulsa Guardar con todos los huecos vacíos, SI la semana tenía un menú guardado, ENTONCES EL SISTEMA elimina sus elementos y el propio menú semanal; SI no lo tenía, ENTONCES EL SISTEMA no crea ningún registro; en ambos casos la semana queda sin menú guardado.
- RF-16: SI el guardado no puede completarse íntegramente, ENTONCES EL SISTEMA no comunica éxito ni deja el menú presentado como una combinación parcial del estado anterior y el nuevo.
- RF-17: CUANDO el guardado termina correctamente, EL SISTEMA toma el resultado persistido como nuevo estado de referencia y deja de considerar que existen cambios pendientes.
- RF-18: CUANDO un actor autorizado solicita reutilizar un menú guardado de otra semana accesible del mismo propietario objetivo, EL SISTEMA copia sus recetas y marcas a los huecos equivalentes del destino solo como cambios pendientes, mantiene intactos el menú y la semana de origen y no persiste el destino hasta que se pulse Guardar.
- RF-19: CUANDO el actor solicita restaurar el destino antes de guardar una copia o cualquier otra modificación pendiente, EL SISTEMA recupera el último estado guardado de la semana de destino sin alterar el menú usado como origen.
- RF-20: MIENTRAS existan cambios pendientes, CUANDO el actor intenta cambiar de semana, cargar o restaurar un menú copiado, cambiar el usuario objetivo de administración o navegar a otra ruta, EL SISTEMA solicita confirmación antes de perderlos; CUANDO intenta recargar la página o cerrar la pestaña, ventana o navegador, EL SISTEMA solicita el aviso nativo siempre que la plataforma lo permita, con texto y presentación controlados por el navegador.
- RF-21: SI el actor cancela una salida sujeta a confirmación, ENTONCES EL SISTEMA conserva la semana, el usuario objetivo y los cambios pendientes actuales; SI confirma, ENTONCES EL SISTEMA descarta únicamente el estado no guardado y continúa la acción cuando esta permanezca bajo su control, sin alterar el estado guardado que abandona.
- RF-22: CUANDO un actor autorizado confirma la acción separada Vaciar semana en una semana editable, EL SISTEMA elimina de inmediato y de forma persistente todos sus elementos y el menú semanal, deja la semana sin menú guardado, limpia el estado presentado y no exige pulsar Guardar; SI cancela, ENTONCES EL SISTEMA no cambia datos ni estado pendiente.
- RF-23: EL SISTEMA presenta Vaciar semana como una acción explícita distinta de dejar todos los huecos vacíos y pulsar Guardar, aunque ambas acciones produzcan finalmente una semana sin menú guardado.
- RF-24: MIENTRAS la semana sea pasada, EL SISTEMA mantiene deshabilitada la acción Vaciar semana y deniega también cualquier intento directo de ejecutarla.
- RF-25: CUANDO un hueco ocupado de una semana editable cambia su indicador «sacado del congelador», EL SISTEMA alterna de forma reversible un valor booleano pendiente asociado exclusivamente a ese elemento de menú; CUANDO se guarda correctamente, EL SISTEMA persiste el valor junto con el hueco.
- RF-26: EL SISTEMA no asigna fecha al indicador «sacado del congelador», no consume, reserva, crea ni modifica existencias y no produce ningún otro efecto sobre el inventario de congeladores.
- RF-27: CUANDO un administrador abre la selección de propietario objetivo, EL SISTEMA ofrece solo la información mínima necesaria para escoger y distinguir usuarios mediante una referencia opaca y una etiqueta pública segura; no expone correo, teléfono, nombre, apellidos, nombre completo, avatar ni identificadores internos.
- RF-28: EL SISTEMA preserva las asociaciones necesarias para mostrar el uso de recetas en menús y bloquea la eliminación de cualquier receta que continúe incluida en un menú guardado.
- RF-29: SI una receta solicitada no existe, no es pública o no resulta accesible, o SI un menú de origen no existe, no pertenece al propietario objetivo o no resulta accesible para el actor, ENTONCES EL SISTEMA falla de forma segura, no copia ni altera datos y no revela si existe un recurso ajeno.
- RF-30: SI una solicitud intenta guardar días, tipos de comida, órdenes de plato, fechas o duplicados fuera de la estructura semanal definida, ENTONCES EL SISTEMA la rechaza sin alterar el menú guardado.

## Requisitos no funcionales
- Seguridad y privacidad: toda lectura y escritura de menús requiere autenticación y autorización efectiva en servidor, con mínimo privilegio y protección persistente por propietario; las capacidades de cliente solo mejoran la experiencia y no actúan como barrera de seguridad.
- Integridad: la unicidad de propietario y semana y la unicidad de cada hueco deben mantenerse también ante solicitudes concurrentes; un guardado no debe producir duplicados ni presentar resultados parciales como completos.
- Privacidad administrativa: la selección de usuario para administrar menús usa una proyección mínima y no convierte los datos privados del perfil en datos necesarios para esta funcionalidad.
- Compatibilidad: se conservan las relaciones vigentes con recetas, la representación pública segura de sus autores y el bloqueo de borrado de recetas referenciadas definidos en la spec 003.
- Conservación de datos: cualquier adecuación necesaria debe preservar los datos válidos existentes y tratar de forma explícita los datos incompatibles, sin descartarlos silenciosamente.
- Consistencia temporal: los límites semanales y la distinción entre semana pasada, actual y futura se evalúan siempre en `Europe/Madrid` para mostrar y autorizar la misma acción.
- La interfaz web, las confirmaciones y los errores visibles se mantienen en español. No se fijan nuevos objetivos de rendimiento o disponibilidad.

## Casos límite
- Una fecha válida que no sea lunes se normaliza o rechaza de forma segura y nunca crea una segunda representación de la misma semana; una fecha inexistente o con formato inválido no permite consultar ni mutar un menú arbitrario.
- Una semana que cruza un mes o un año sigue abarcando desde su lunes hasta su domingo. El domingo pertenece a la semana iniciada el lunes anterior.
- La semana actual completa permanece editable, aunque algunos de sus días ya hayan transcurrido; una semana solo pasa a solo lectura cuando ha finalizado entera.
- Una semana sin menú persistido se muestra con 21 huecos vacíos y puede empezar a editarse sin crear datos hasta Guardar.
- Guardar un estado sin ningún hueco ocupado elimina el menú guardado y sus elementos si existían; si no existían, no crea nada. La semana queda sin menú guardado.
- Vaciar una semana con cambios pendientes elimina, tras confirmación, tanto el contenido persistido de ese destino como el estado pendiente mostrado; no altera ninguna semana usada previamente como origen.
- Reutilizar un menú vacío deja vacío el destino como cambio pendiente y no persiste nada hasta Guardar; Vaciar semana sigue disponible como acción inmediata, separada y con su propia confirmación.
- Reutilizar un menú sobre un destino ya guardado reemplaza en memoria todos sus huecos, incluidos los que deban quedar vacíos; cancelar o restaurar recupera el último estado persistido del destino.
- Cargar otro menú o restaurar el destino con cambios pendientes exige confirmación aunque esos cambios procedan de una reutilización anterior o solo afecten al indicador de congelador.
- Cambiar el usuario objetivo de administración o navegar a otra ruta con cambios pendientes exige la misma confirmación y, al cancelar, conserva tanto el objetivo como el estado actual.
- Al recargar o cerrar con cambios pendientes, algunos navegadores pueden no mostrar aviso, impedir personalizar su texto o no distinguir cierre de pestaña, ventana y navegador; el sistema usa la protección nativa disponible sin prometer capacidades que la plataforma no ofrece.
- Un cambio de fecha o de horario de verano se interpreta según `Europe/Madrid`; todas las vistas y operaciones coinciden sobre qué lunes inicia la semana y cuándo deja de ser editable.
- La misma receta puede ocupar varios huecos porque la unicidad corresponde al hueco, no a la receta; un hueco concreto nunca conserva dos recetas simultáneas.
- El indicador de congelador solo existe para un hueco ocupado. Al retirar o reemplazar su receta no se transfiere implícitamente a otro hueco ni desencadena efectos de inventario.
- Dos intentos concurrentes de crear el menú del mismo propietario y semana no pueden producir dos menús. Un conflicto o fallo se comunica sin afirmar que el último estado solicitado quedó guardado.
- Un administrador puede seleccionar otro propietario y actuar en su nombre solo dentro de esta funcionalidad y de los límites temporales; ello no cambia la propiedad del menú ni concede acceso general a su perfil.
- Etiquetas públicas iguales o ausentes en la selección administrativa deben poder distinguirse sin revelar datos personales ni identificadores internos.
- Un cambio de rol, cierre o caducidad de sesión durante una operación provoca una nueva comprobación autoritativa y el rechazo seguro si el permiso ya no existe.
- Los datos históricos que no cumplan unicidad, fechas semanales o huecos válidos deben detectarse y tratarse de forma explícita; no se descartan ni corrigen silenciosamente.

## Fuera de alcance
- Generación automática, aleatoria o mediante inteligencia artificial de menús, incluida la regeneración de días y las estrategias nutricionales.
- Compartir menús por correo electrónico, generar enlaces de compartición o dar acceso a destinatarios externos.
- Un historial general de menús, auditoría de cambios, versiones, restauración de versiones antiguas o analítica histórica; la selección de un menú guardado para reutilizarlo no constituye ese historial general.
- Crear, editar o eliminar recetas o categorías desde el planificador; se consumen las recetas disponibles y se preservan sus contratos y restricciones vigentes.
- Modificar existencias, cajones, congeladores, reservas, cantidades o fechas del inventario como consecuencia de la marca «sacado del congelador».
- Añadir más comidas, tentempiés, postres o huecos configurables, o cambiar los tres huecos fijos por día.
- Permitir edición de semanas pasadas, incluso por administradores.
- Acceso público, anónimo o mediante enlace a cualquier menú semanal.
- Corregir datos históricos u operar sobre entornos remotos.

## Criterios de finalización
- Todos los RF cuentan con evidencia verificable y con una demostración de los flujos principales para visitante, `user_restricted`, `user_full`, administrador, propietario y usuario ajeno.
- Se demuestra la navegación lunes-domingo y la clasificación uniforme en `Europe/Madrid` de la semana actual y futura como editables y de la semana pasada como solo lectura.
- Se demuestra el ciclo explícito de edición, Guardar, fallo sin resultado parcial, reutilización pendiente, restauración y confirmación en todas las salidas indicadas antes de descartar cambios.
- Se demuestra que guardar todos los huecos vacíos deja la semana sin menú guardado, tanto si existía previamente como si no, y que Vaciar semana es una acción separada, confirmada, inmediata e inaccesible para semanas pasadas.
- Se comprueba que la marca «sacado del congelador» es reversible, solo persiste al guardar y no modifica ningún dato de inventario ni registra fechas.
- Se comprueba la autorización en servidor para anónimo, cada rol autenticado, propietario, usuario ajeno y administrador, incluida la falsificación de propietario y la prohibición absoluta de usar `service-role` o eludir RLS en esta funcionalidad.
- Se comprueba la unicidad por propietario y semana, la unicidad y validez de huecos y el comportamiento seguro ante concurrencia, entradas inválidas y recursos inexistentes o ajenos.
- Se comprueba que la selección administrativa no expone datos personales innecesarios y que propietarios con etiquetas públicas coincidentes pueden distinguirse de forma segura.
- Se demuestra que cualquier receta pública, propia o ajena, puede añadirse sin exponer más información del autor, y que las asociaciones y el bloqueo de borrado de recetas usadas permanecen intactos.
- Cualquier incompatibilidad histórica recibe un tratamiento explícito que preserva los datos válidos existentes.

## Dudas abiertas
- No hay dudas funcionales bloqueantes. Las decisiones confirmadas fijan actores, permisos, recetas disponibles, zona horaria, estructura semanal, edición temporal, guardado explícito, reutilización, protección de cambios pendientes, vaciado y semántica de la marca de congelador.
