# Myndvs

Un solo lugar para no olvidar nada: notas, audios, imágenes, dibujos, calendario y tareas. Es liviana (sin frameworks), abre al instante, funciona sin señal y se instala en el celu como una app.

## Qué tiene
- **Barra de carga rápida** (abajo): escribís y apretás Enter. La app adivina qué es y lo muestra en el botón de la izquierda (tocándolo lo cambiás):
  - `idea para el podcast #fragotime` → **nota**
  - `- comprar alimento para Vaca` → **tarea** (el guion adelante la hace tarea)
  - `mañana pagar la luz` → **tarea** para mañana
  - `vie 21:30 cena con Ulises`, `mañana 16 dentista`, `el sábado de 16 a 18 asado` → **evento**
- **Micrófono**: graba un audio y lo guarda como nota (con vúmetro y duración).
- **Cámara**: guarda fotos o imágenes (se achican solas para no ocupar de más).
- **Lápiz**: abre una hoja para dibujar (6 colores, 3 grosores, goma, deshacer). El dibujo se recorta solo. Tocándolo dentro de la nota, se sigue editando.
- **Notas** estilo Keep: colores, fijar, archivar, papelera (30 días), listas con `[ ]` que se tildan desde la tarjeta, `#etiquetas` para filtrar, filtros de audios e imágenes.
- **Calendario propio**: mes compacto con puntitos por día, eventos de todo el día o con horario, que se repiten (diario, semanal con días elegidos, mensual, anual, con fecha de fin) y borrar una sola fecha de una repetición.
- **Tareas**: atrasadas, hoy, próximas, sin fecha y hechas, con deshacer.
- **Hoy**: agenda del día, tareas, notas fijadas y últimos pensamientos, y tu nivel de Lifebgood.
- **Buscador** que busca en todo.
- **Sin señal**: todo vive en el celu (IndexedDB) y se sincroniza cuando vuelve la conexión.

## Tutorial
La primera vez que abrís la app arranca un **tutorial interactivo** (22 pasos, algunos los hacés vos: anotar, crear una tarea, un evento, completarla). Se vuelve a ver desde **Ajustes → Tutorial**. Cada vez que la app suma algo, el tutorial suma sus pasos y te ofrece ver **solo las novedades**.

## Sincronización
- **Google Calendar y Google Tasks**: el calendario es independiente (vive en la app), pero se sincroniza en las dos direcciones con tu calendario principal y tu lista de tareas principal. Lo que cambiás acá sube a Google a los 3 segundos; lo de Google baja al abrir o al tocar el puntito de arriba. Los avisos del celu los sigue dando Google Calendar.
- **Notas, audios, imágenes y dibujos**: se guardan en dos Gists privados de tu GitHub (`myndvs.json` con el texto y otro con los archivos), así lo que anotás en el celu aparece en la compu.
- **Copia de seguridad**: Ajustes → Exportar / Importar (un archivo con todo, archivos incluidos).

El puntito de arriba: verde = al día, amarillo = falta subir algo o conectar Google (tocalo), rojo = error (en Ajustes dice cuál), gris = sin conectar.

## Conexión con Lifebgood
Las dos apps viven en `klasito7.github.io`, así que comparten el navegador:
- Myndvs usa solo el **ID de cliente de Google** y el **token de GitHub** que ya cargaste en Lifebgood (o en FUNVS). No hay que configurar nada más.
- En **Hoy** ves tu nivel, la XP de hoy y las misiones pendientes de Lifebgood.
- Todo lo que agendás en Myndvs le llega a Lifebgood como misión (por Google). En cada evento o tarea elegís **En Lifebgood: Automática / Principal / Secundaria / Solo aviso**, y Lifebgood lo respeta.
- Lo que cumplís en Lifebgood se tacha en Google y Myndvs lo ve al sincronizar.
- Myndvs deja un resumen en `localStorage['myndvs-bridge']` (eventos y tareas de los próximos 7 días) por si Lifebgood lo quiere usar.

## Cargar el token de GitHub
Si FUNVS o Lifebgood ya están en el mismo navegador, Myndvs lo toma solo. Si no:
1. Abrí https://github.com/settings/tokens/new?scopes=gist&description=Myndvs (ya viene con el permiso **gist** marcado).
2. Expiration: **No expiration**. No marques nada más. **Generate token**.
3. Copiá el token (`ghp_…`) y pegalo en Ajustes → Nube → **Guardar**. Guardalo en un lugar seguro para tus otros aparatos (GitHub lo muestra una sola vez).

## Primer uso con Google (una sola vez)
Si Lifebgood está en el mismo navegador, el ID de cliente se toma solo. Si no, copialo de https://console.cloud.google.com/apis/credentials (proyecto Lifebgood → tu ID de cliente de OAuth → **ID de cliente**) y pegalo en Ajustes → Google.

1. En tu proyecto de Google Cloud (el de Lifebgood) tienen que estar habilitadas **Google Calendar API** y **Google Tasks API** (ya lo están si Lifebgood sincroniza tareas).
2. El origen `https://klasito7.github.io` ya está autorizado, así que el mismo ID sirve.
3. Abrí Myndvs y tocá el puntito de arriba: aparece la ventana de Google; aceptá.

El permiso de Google dura una hora; después, al tocar el puntito se renueva.

Si Google rechaza algo, Ajustes dice cuál API fue y por qué:
- **"La Google Tasks/Calendar API está apagada"** → botón **Habilitarla en Google Cloud** (proyecto Lifebgood → Habilitar), esperar un minuto y sincronizar.
- **"No quedó marcado el permiso"** → **Volver a conectar** y marcar todas las casillas en la ventana de Google.
Calendario y tareas se sincronizan por separado: si falla uno, el otro sigue andando.

## Contraseña y seguridad
- **Contraseña opcional** (Ajustes → Contraseña): cifra todo lo guardado con AES-GCM de 256 bits. La clave sale de tu contraseña con PBKDF2-SHA256 (600.000 vueltas); la contraseña no se guarda en ningún lado. Se pide una vez por día: la clave queda en el aparato hasta la medianoche (no se puede exportar) y después se borra. Tras 5 intentos fallidos hay que esperar cada vez más.
- Con contraseña también van cifrados la nube (los Gists solo tienen datos ilegibles) y las copias de seguridad. Al activarla, los Gists viejos sin cifrar se borran y se vuelven a crear.
- En otro aparato, la nube pide la misma contraseña. Si la quitás, quitala en todos.
- Si te la olvidás, lo cifrado no se puede recuperar.
- Lo que sincronizás con Google Calendar y Tasks queda en tu cuenta de Google como siempre (Google tiene que poder leerlo para avisarte).
- La app tiene una política de seguridad de contenido (CSP) que solo deja cargar código propio y de Google, y todo lo que entra de la nube o de un archivo se limpia antes de mostrarse.
- Ojo: Myndvs comparte sitio (`klasito7.github.io`) con tus otras apps. Mientras está desbloqueada, cualquier página de ese sitio podría leerla; por eso conviene que esas apps no carguen código de terceros que no conozcas.

## Privacidad
No hay servidor propio. Tus datos viajan directo entre tu navegador, Google (calendario y tareas) y tu GitHub (notas, en Gists privados). Nada más.

## Estructura
- `index.html`: la pantalla.
- `css/app.css`: estilos.
- `js/parse.js`: entiende las frases de la carga rápida.
- `js/app.js`: base de datos, vistas, grabación, dibujo y sincronización.
- `js/diario.js`: el diario y su importador.
- `js/tour.js`: el tutorial interactivo (pasos en `STEPS`).
- `sw.js`: modo sin señal.
