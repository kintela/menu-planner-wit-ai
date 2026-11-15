# Spec 003 — Recetas y categorías

**Estado: aprobada e implementada**

## Contexto y objetivo
Consolidar el comportamiento existente y el objetivo confirmado del recetario compartido para que cualquier visitante pueda descubrir recetas sin iniciar sesión y cada usuario autenticado pueda aportar y gestionar únicamente las suyas, con administración global, categorías comunes, valoraciones y un ciclo de vida seguro de imágenes. La revisión retrospectiva evidencia que ya existen los campos, relaciones y flujos principales, pero también que varios controles actuales confían en datos del cliente, usan privilegios amplios o exponen más identidad de autor de la permitida; esta especificación fija el resultado funcional y de seguridad que debe prevalecer sin presumir el estado desplegado de ningún entorno.

## Usuarios / actores
- Visitante sin sesión, con acceso público de solo lectura a recetas, categorías y valoraciones agregadas.
- Usuario autenticado con rol `user_restricted` o `user_full`, que puede crear recetas y categorías, utilizar categorías globales, valorar recetas ajenas y gestionar sus propias recetas.
- Administrador autenticado, que puede gestionar todas las recetas y administrar el catálogo global de categorías.
- Autor o propietario de una receta, responsable de sus datos, asociaciones e imagen.

## Historias de usuario
- H1: Como visitante quiero consultar y buscar recetas públicas para conocer su contenido sin crear una cuenta.
- H2: Como usuario autenticado quiero crear recetas y gestionar las mías para contribuir al recetario compartido.
- H3: Como administrador quiero gestionar cualquier receta y mantener las categorías globales para conservar el catálogo correcto y ordenado.
- H4: Como usuario autenticado quiero crear y asociar categorías globales para clasificar recetas.
- H5: Como usuario autenticado quiero valorar recetas ajenas y cambiar o retirar mi valoración para reflejar mi opinión actual.
- H6: Como visitante quiero ver la media y el número de valoraciones para estimar la aceptación de una receta.
- H7: Como autor quiero subir, sustituir o retirar la imagen de mi receta sin perder referencias válidas ni borrar archivos ajenos.
- H8: Como persona usuaria quiero identificar públicamente al autor mediante su alias sin que se expongan sus datos personales.

## Requisitos funcionales (criterios de aceptación en EARS)
- RF-1: EL SISTEMA permite consultar públicamente, sin sesión, el listado y el detalle de las recetas, sus categorías, su imagen, la identidad pública de autor y sus valoraciones agregadas.
- RF-2: MIENTRAS un visitante no tenga sesión, EL SISTEMA mantiene el recetario en modo de solo lectura y no permite crear, editar ni eliminar recetas o categorías, gestionar imágenes ni crear, actualizar o retirar valoraciones.
- RF-3: CUANDO una persona consulta o filtra el listado, EL SISTEMA conserva la búsqueda existente por nombre, ingredientes e identificador de receta y los filtros existentes por categoría y origen mediante IA; para usuarios autenticados conserva además el filtro de recetas propias y para administradores el filtro por autor.
- RF-4: EL SISTEMA conserva para cada receta los campos existentes acreditados: nombre, ingredientes, preparación, imagen, indicador de generación mediante IA, fecha de creación, vídeo, fuente original, calorías y propietario; el nombre y el propietario son obligatorios, y una receta puede estar asociada a cero o más categorías globales.
- RF-5: CUANDO cualquier usuario autenticado, incluidos `user_restricted` y `user_full`, crea una receta válida, EL SISTEMA la registra como propiedad de la identidad autenticada y no acepta que el solicitante atribuya la receta a otra identidad.
- RF-6: CUANDO el propietario autenticado modifica su receta, EL SISTEMA permite la acción; CUANDO solicita eliminarla, EL SISTEMA permite la eliminación únicamente si la receta no está referenciada por ningún menú. CUANDO un administrador autenticado modifica cualquier receta, EL SISTEMA permite la acción; CUANDO solicita eliminarla, EL SISTEMA también permite la eliminación únicamente si la receta no está referenciada por ningún menú. SI existe cualquier referencia de menú, ENTONCES EL SISTEMA bloquea la eliminación sin borrar en cascada la referencia ni la receta.
- RF-7: SI un usuario autenticado que no es propietario ni administrador intenta modificar o eliminar una receta, ENTONCES EL SISTEMA deniega la acción sin alterar la receta, sus categorías, su imagen, sus valoraciones ni sus asociaciones con menús.
- RF-8: EL SISTEMA comprueba en servidor la sesión, la identidad, el rol y la propiedad para toda acción destructiva o de escritura sobre recetas, categorías, valoraciones e imágenes; ninguna identidad, cabecera, identificador de propietario o URL aportados por el cliente constituyen autorización.
- RF-9: EL SISTEMA mantiene un catálogo global de categorías visible con las recetas públicas y utilizable por todos los usuarios autenticados.
- RF-10: CUANDO cualquier usuario autenticado, incluidos `user_restricted` y `user_full`, crea una categoría global cuyo nombre, después de eliminar los espacios exteriores, no está vacío, EL SISTEMA la deja disponible para clasificar recetas; SI el nombre queda vacío después de eliminar los espacios exteriores, ENTONCES EL SISTEMA rechaza la creación; SI ya existe una categoría con el mismo nombre sin distinguir mayúsculas, minúsculas ni espacios exteriores, ENTONCES EL SISTEMA evita crear el duplicado.
- RF-11: CUANDO el propietario o un administrador crea o edita una receta, EL SISTEMA permite asociar o desasociar cualquiera de las categorías globales existentes sin crear asociaciones duplicadas.
- RF-12: CUANDO un administrador modifica el nombre de una categoría, EL SISTEMA conserva sus asociaciones con recetas; SI un usuario no administrador intenta editar una categoría, ENTONCES EL SISTEMA deniega la acción.
- RF-13: CUANDO un administrador solicita eliminar una categoría vacía, EL SISTEMA la elimina; SI la categoría conserva al menos una asociación con una receta, ENTONCES EL SISTEMA bloquea su eliminación e informa de que antes debe vaciarse o fusionarse.
- RF-14: CUANDO un administrador fusiona una categoría de origen en otra categoría de destino distinta, EL SISTEMA transfiere al destino todas las asociaciones de recetas de la categoría de origen, evita duplicados para las recetas que ya tenían el destino y elimina la categoría de origen únicamente después de completar la transferencia.
- RF-15: SI un usuario no administrador intenta editar, eliminar o fusionar categorías, ENTONCES EL SISTEMA deniega la acción sin cambiar el catálogo ni sus asociaciones.
- RF-16: CUANDO un usuario autenticado valora una receta ajena, EL SISTEMA acepta únicamente un número entero entre 1 y 5 y mantiene como máximo una valoración de ese usuario para esa receta.
- RF-17: CUANDO un usuario autenticado vuelve a valorar una receta ajena que ya había valorado, EL SISTEMA actualiza su valoración existente; CUANDO solicita retirarla, EL SISTEMA la elimina.
- RF-18: SI el propietario de una receta intenta valorar su propia receta, ENTONCES EL SISTEMA deniega la creación o actualización de la valoración; esta prohibición también se aplica a un administrador cuando es propietario de esa receta.
- RF-19: EL SISTEMA muestra públicamente para cada receta la media derivada de sus valoraciones vigentes y el número total de valoraciones, sin revelar la identidad de quienes han valorado; cuando no existen valoraciones muestra un estado sin valoraciones y un recuento de cero.
- RF-20: CUANDO una receta está referenciada por cualquier menú semanal, EL SISTEMA bloquea su eliminación para propietarios y administradores, conserva todas las referencias e informa de que deben retirarse manualmente de los menús antes de volver a intentarlo.
- RF-21: EL SISTEMA preserva las asociaciones existentes entre recetas y menús y el contrato por el que las relaciones de elementos de menú se presentan a los consumidores del listado como identificadores de menú; ninguna operación de recetas elimina de forma forzada esas asociaciones.
- RF-22: EL SISTEMA permite la lectura pública de la imagen vigente de una receta; únicamente el propietario o un administrador autorizado para gestionar esa receta puede subir, asociar, sustituir o retirar su imagen.
- RF-23: CUANDO se sube una imagen gestionada por la aplicación para una receta, EL SISTEMA vincula el objeto con la receta y con el ámbito autorizado de su gestión de forma que una URL o ruta aportada por el cliente no baste para acreditar propiedad ni permiso sobre el objeto.
- RF-24: CUANDO el propietario o un administrador sustituye una imagen gestionada, EL SISTEMA carga y asocia de forma segura la nueva imagen antes de intentar eliminar el objeto anterior; solo elimina el objeto anterior acreditado como imagen gestionada vigente de esa receta y nunca elimina una imagen externa.
- RF-25: CUANDO el propietario o un administrador retira una imagen, EL SISTEMA actualiza primero la receta para que deje de referenciarla y solo después intenta eliminar el objeto si está acreditado como gestionado por la aplicación para esa receta; una URL externa deja de asociarse, pero nunca se elimina en su origen.
- RF-26: CUANDO se elimina una receta sin referencias de menú, EL SISTEMA elimina su imagen vigente únicamente si es un objeto gestionado y acreditado para esa receta, y lo hace después de confirmar la eliminación de la receta; no elimina imágenes externas ni objetos ajenos.
- RF-27: SI una operación de imagen falla total o parcialmente, ENTONCES EL SISTEMA comunica con veracidad qué cambio se completó y cuál no, no declara éxito total y no revierte mediante el borrado de la imagen nueva una asociación que ya haya quedado vigente.
- RF-28: EL SISTEMA presenta públicamente al autor de una receta únicamente mediante su alias; SI no existe un alias público no vacío, ENTONCES EL SISTEMA muestra exactamente «Usuario».
- RF-29: EL SISTEMA no incluye en la representación pública del autor nombre, apellidos, nombre completo, correo electrónico, teléfono, avatar ni identificadores internos de perfil o usuario, aunque esos datos existan en el perfil privado; la ausencia de una lectura pública del perfil completo no impide ofrecer la proyección pública mínima definida en RF-28.

## Requisitos no funcionales
- Seguridad y privacidad: la autorización de todas las escrituras se decide en servidor y se refuerza en la capa persistente con mínimo privilegio; no se admite acceso anónimo de escritura ni el uso de credenciales privilegiadas para eludir autenticación, propiedad, rol o políticas de almacenamiento.
- Integridad: las fusiones de categorías y los cambios de asociaciones no deben dejar resultados parciales presentados como completos ni producir asociaciones duplicadas.
- Integridad de imágenes: solo puede borrarse un objeto cuya condición de imagen gestionada vigente de la receta y cuyo ámbito autorizado se hayan acreditado; el orden de sustitución, retirada y borrado debe evitar referencias rotas y pérdidas prematuras.
- Privacidad: las respuestas y vistas públicas deben limitar la identidad del autor a alias o «Usuario» y las valoraciones a sus agregados.
- Compatibilidad: se mantienen los campos, la búsqueda, los filtros, las categorías, las imágenes y las asociaciones de menú ya existentes que no contradigan los requisitos de seguridad y permisos aquí definidos.
- Evolución de datos: cualquier cambio de esquema, restricciones, políticas o almacenamiento necesario debe ser una migración formal posterior a la baseline, preservar datos existentes y validarse sin inferir el estado de entornos no comprobados.
- La interfaz web y sus mensajes visibles se mantienen en español. No se fijan objetivos nuevos de rendimiento o disponibilidad.

## Casos límite
- Una receta inexistente o un identificador inválido no se presenta como receta válida ni permite operaciones de escritura.
- Una receta puede tener ingredientes o preparación vacíos, no tener calorías, imagen, vídeo, fuente, categorías ni valoraciones; solo el nombre y el propietario son obligatorios según la evidencia del modelo actual.
- Una búsqueda sin coincidencias y un filtro sin resultados muestran un estado vacío sin modificar los datos ni ampliar permisos.
- Un nombre de categoría vacío o compuesto solo por espacios se rechaza; los espacios exteriores no convierten en distintos dos nombres que, una vez recortados y comparados sin distinguir mayúsculas y minúsculas, son iguales.
- Un visitante puede buscar, filtrar, abrir detalles y ver agregados, pero cualquier intento directo de escritura se rechaza aunque la interfaz no muestre la acción.
- El cambio funcional confirmado permite crear recetas y categorías también a `user_restricted`, aunque los permisos retrospectivos de roles lo describan como solo lectura; la autorización objetivo de esta spec prevalece para este dominio.
- Un administrador puede gestionar una receta ajena y su imagen, pero no puede valorar una receta propia; administrar una receta no convierte al administrador en propietario de objetos arbitrarios.
- Una categoría con recetas no puede eliminarse directamente. La fusión requiere origen y destino existentes y distintos; si una receta ya está asociada al destino, se conserva una única asociación.
- Si una fusión falla antes de completarse, no se elimina la categoría de origen ni se comunica una fusión completa; las asociaciones ya existentes no deben duplicarse.
- Una valoración decimal, textual, menor que 1 o mayor que 5 se rechaza; dos solicitudes concurrentes del mismo usuario para la misma receta no pueden producir dos valoraciones vigentes.
- Al retirar o actualizar una valoración, la media y el recuento públicos reflejan únicamente las valoraciones vigentes; no se muestra quién valoró.
- Ni el propietario ni un administrador pueden forzar el borrado de una receta usada por uno o varios menús. Un error al comprobar el uso en menús bloquea el borrado por seguridad en lugar de asumir que no hay referencias.
- Una imagen externa puede asociarse o desasociarse como referencia, pero su recurso remoto nunca se borra. Una URL con apariencia de pertenecer al almacenamiento de la aplicación no acredita por sí sola que sea un objeto gestionado por esa receta.
- Si falla la carga de una imagen nueva, la receta y su imagen anterior permanecen vigentes. Si la carga termina pero falla la asociación, la imagen anterior permanece referenciada y no se borra; el posible objeto nuevo no se presenta como imagen activa.
- Si la nueva imagen ya quedó asociada y falla el borrado de la anterior, se mantiene la asociación nueva y se informa del fallo parcial. Si la referencia se retiró o la receta se eliminó y después falla el borrado del objeto gestionado, se informa del residuo pendiente sin afirmar limpieza completa.
- Los objetos históricos cuya gestión o pertenencia no pueda acreditarse no se borran automáticamente.
- Un alias nulo, vacío o compuesto solo por espacios se presenta como «Usuario»; no se usa ningún dato personal como fallback.
- La proyección pública de autor puede coexistir con el perfil privado propietario definido en la spec 002, pero nunca amplía la lectura pública del perfil completo.
- La evidencia versionada de modelo, scripts o migraciones no demuestra por sí sola qué cambios están aplicados local o remotamente; los datos de baseline no deben reproducirse con información personal en esta spec.
- El estado T9 de autenticación y sus bloqueos de interfaz pertenecen a otro alcance y no constituyen evidencia de validación funcional de recetas, categorías, valoraciones o imágenes.

## Fuera de alcance
- Crear, editar, eliminar o rediseñar menús semanales; solo se preservan sus asociaciones con recetas y se bloquea el borrado de recetas referenciadas.
- Eliminar automáticamente una receta de menús o mantener una opción de borrado forzado.
- Gestión general de perfiles, avatares o datos personales; únicamente se define la proyección pública mínima del autor necesaria para recetas.
- Mostrar públicamente quién emitió una valoración o un historial de valoraciones.
- Moderación, aprobación, comentarios, favoritos, compartición privada o visibilidad privada de recetas.
- Generar recetas, imágenes o menús mediante inteligencia artificial, cambiar sus modelos o alterar su coste; solo se conserva el indicador existente de receta generada mediante IA.
- Añadir campos nuevos de receta, categorías jerárquicas o categorías privadas por usuario.
- Aplicar migraciones u operar sobre entornos remotos; una migración versionada no acredita que haya sido aplicada.
- Resolver el estado T9 de autenticación, que es independiente de esta funcionalidad.

## Criterios de finalización
- Todos los RF quedan cubiertos por verificaciones automatizadas y por una demostración de los flujos principales con visitante, `user_restricted`, `user_full`, administrador, propietario y usuario ajeno.
- Se comprueba que listado y detalle son públicos y de solo lectura para visitantes, incluidas categorías, alias seguro y media/recuento de valoraciones.
- Se comprueba en servidor que cualquier usuario autenticado puede crear recetas y categorías, que propietario y administrador gestionan las recetas permitidas y que ningún otro usuario puede alterarlas.
- Se comprueba que solo un administrador puede editar, eliminar o fusionar categorías, que solo se elimina una categoría vacía y que la fusión transfiere asociaciones sin duplicados antes de eliminar el origen.
- Se comprueba el rango 1–5, la unicidad por usuario y receta, la actualización, la retirada, el veto a valorar la receta propia y el recálculo público de agregados.
- Se comprueba que una receta usada por cualquier menú no puede eliminarse ni siquiera por administrador y que sus asociaciones y el contrato de identificadores de menú permanecen intactos.
- Se comprueba el ciclo completo de imágenes gestionadas y externas, incluidos permisos, orden seguro, objetos ajenos y cada fallo parcial; ninguna vía anónima o privilegiada elude autorización o propiedad.
- Se comprueba que ninguna representación pública de receta o autor expone nombre, apellidos, nombre completo, correo, teléfono, avatar o identificadores internos de perfil/usuario.
- Los cambios persistentes necesarios se entregan como migraciones formales posteriores a la baseline, preservan los datos existentes y se validan en el entorno autorizado; no se afirma despliegue sin evidencia independiente.
- La validación y la implementación respetan las reglas normativas de `docs/ARCHITECTURE.md`, `docs/AUTH.md` y `docs/DATABASE.md`.

## Dudas abiertas
- No hay dudas funcionales bloqueantes. Las decisiones recibidas fijan acceso público, permisos por actor, categorías globales, valoraciones, bloqueo por menús, ciclo de imágenes e identidad pública del autor.

## Evidencia retrospectiva y gaps
- **Modelo de recetas:** la referencia versionada acredita nombre, ingredientes, preparación, URL de imagen, indicador de IA, fecha de creación, URL de vídeo, URL de fuente, calorías y propietario. También acredita asociaciones muchos-a-muchos de recetas y categorías sin duplicados, una valoración entera de 1 a 5 por usuario y receta, y referencias desde elementos de menú. Esta evidencia describe el repositorio, no el estado aplicado de ningún entorno.
- **Lectura y presentación:** el listado actual consulta recetas con sus categorías y muestra búsqueda, filtros, categorías, imágenes y datos del autor. El detalle actual consulta la receta y datos del autor y presenta la imagen y el autor, pero no consulta ni presenta categorías. El listado conserva la transformación de relaciones de menú a identificadores de menú. Gap: las consultas y tipos actuales incluyen identificadores internos y nombre completo, nombre y apellidos; además usan esos datos como fallback público, contrario a RF-28 y RF-29. La referencia persistente permite leer recetas y categorías públicamente, pero la lectura pública de asociaciones de categoría y valoraciones no queda acreditada de forma coherente.
- **Creación y gestión de recetas:** existen formularios y operaciones para crear, editar y eliminar. Gaps: la creación acepta del cliente el propietario mientras opera con privilegios elevados; la edición confía en una identidad aportada en cabecera; el borrado puede continuar sin identidad y ofrece un modo forzado que elimina referencias de menú. No se acredita autorización server-side completa para administrador, propietario y usuario ajeno conforme a RF-5–RF-8 y RF-20.
- **Categorías:** existen selección, creación, edición, borrado con recuento y fusión con evitación de asociaciones duplicadas. Gaps: parte de estas operaciones se realiza directamente desde el navegador; los permisos observados permiten gestión a usuarios no administradores y restringen a `user_restricted`, mientras el objetivo confirmado permite a todo autenticado crear/usar y reserva edición, borrado y fusión al administrador. La protección de categoría no vacía se observa en interfaz, pero no queda acreditada como regla autoritativa ante concurrencia o llamadas directas.
- **Valoraciones:** existen lectura de media/recuento, creación y actualización, y el modelo acredita rango y unicidad. Gaps: no existe flujo observado para retirar la valoración; la prohibición de valorar la receta propia está aplicada en interfaz pero no queda acreditada en una capa de confianza; la referencia con seguridad por filas habilitada no contiene políticas específicas de valoraciones, por lo que ni el acceso público agregado ni las escrituras autorizadas quedan demostrados.
- **Imágenes:** existen URL externa, carga de archivos y lectura pública. Gaps: la carga actual no acredita sesión, propiedad ni vínculo seguro con la receta, usa privilegios elevados, puede alterar la configuración de almacenamiento y los reemplazos pueden borrar el objeto anterior antes de asociar de forma segura el nuevo. La baseline inspeccionada no acredita la definición ni las políticas del almacenamiento de imágenes de recetas. Tampoco se distingue de forma fiable un objeto gestionado de una URL externa para borrarlo. Se requiere adecuación formal si estos controles necesitan esquema, metadatos o políticas persistentes.
- **Borrado y menús:** existe una comprobación de referencias y un aviso, pero también una vía que borra las referencias y la receta. Ese comportamiento contradice la decisión confirmada de bloqueo absoluto y retirada manual previa. La relación persistente observada admite borrado en cascada, por lo que la protección debe quedar garantizada antes de borrar y no confiar solo en la interfaz.
- **Pruebas:** hay pruebas parciales de búsqueda, selección y conteo de categorías y presentación de tarjetas, varias desalineadas con las exportaciones o formas de datos actuales. No se encontró cobertura suficiente de autorización server-side, roles, retirada y autoevaluación de valoraciones, fusión autoritativa, bloqueo de borrado por menús, privacidad del autor o ciclo seguro de imágenes. La infraestructura general de pruebas tiene bloqueos conocidos, de modo que la mera presencia de esos archivos no acredita los RF.
- **Límite de evidencia:** se inspeccionaron implementación, modelo versionado, operaciones de servidor, almacenamiento, referencias SQL y pruebas sin ejecutar operaciones remotas ni asumir que la baseline, scripts o políticas están desplegados. Las discrepancias anteriores son gaps respecto al comportamiento objetivo, no requisitos para conservar conductas inseguras.
