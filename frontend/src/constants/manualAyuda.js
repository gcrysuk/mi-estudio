// Contenido del manual de ayuda (/ayuda). Editable sin tocar componentes.
// Cada artículo: { id, titulo, contenido }. El contenido admite HTML simple
// (párrafos, <strong>, <ul>/<li>) que AyudaPage renderiza con dangerouslySetInnerHTML.

export const MANUAL_AYUDA = [
  {
    id: 'carpetas',
    titulo: 'Carpetas',
    icono: 'FolderOpen',
    articulos: [
      {
        id: 'crear-carpeta',
        titulo: 'Crear una carpeta nueva',
        contenido: `
          <p>Una carpeta representa un expediente o un asunto que estás llevando. Se crea con el botón "Nueva carpeta"; el único dato obligatorio es el nombre.</p>
          <p>El resto de los campos son opcionales pero te van a servir para ordenarte mejor:</p>
          <ul>
            <li><strong>Cliente / Parte:</strong> a quién representás. Lo buscás entre tus personas ya cargadas (podés agregar más de una).</li>
            <li><strong>Contraparte:</strong> la otra parte del asunto. También se busca entre tus personas, o podés escribir un nombre suelto si todavía no la tenés cargada como persona.</li>
            <li><strong>Parte:</strong> si representás como actor o como demandado.</li>
            <li><strong>Organismo:</strong> el juzgado, fiscalía u organismo interviniente (con buscador; si no existe, lo podés crear al vuelo).</li>
            <li><strong>Tipo, Estado y Objeto de la carpeta:</strong> clasificaciones tuyas para ordenar y filtrar (también se crean al vuelo desde el mismo buscador).</li>
            <li><strong>Número de expediente</strong> y <strong>descripción</strong> libre.</li>
            <li><strong>Link MEV (opcional):</strong> si el expediente está en la MEV, pegá acá la URL para poder abrirla después con un click desde la carpeta.</li>
          </ul>
        `,
      },
      {
        id: 'buscar-filtrar-carpetas',
        titulo: 'Buscar y filtrar carpetas',
        contenido: `
          <p>En el listado de carpetas podés buscar por texto (nombre, expediente, persona, organismo) y combinarlo con filtros: estado, tipo, estado MEV, días sin movimiento y "compartida con" un usuario en particular. Los filtros quedan guardados aunque cierres y vuelvas a entrar.</p>
          <p>Las columnas de la tabla son clickeables para ordenar (por nombre, expediente, persona, estado, tipo, objeto, organismo, fecha, etc.) y podés elegir qué columnas mostrar u ocultar con el ícono de columnas, según qué datos te interesa ver de un vistazo.</p>
          <p>El ícono de ojo en cada fila abre una vista rápida con los datos principales de la carpeta sin salir del listado. También podés imprimir o exportar el listado filtrado con el botón correspondiente.</p>
        `,
      },
      {
        id: 'compartir-carpeta',
        titulo: 'Compartir una carpeta con otro usuario',
        contenido: `
          <p>Desde el detalle de la carpeta (o seleccionando varias desde el listado) usá la opción "Compartir" y buscá al usuario por su nombre de usuario.</p>
          <p>Al compartir elegís un permiso:</p>
          <ul>
            <li><strong>Puede editar:</strong> el otro usuario puede ver y modificar la carpeta y sus movimientos.</li>
            <li><strong>Hacer propietario:</strong> le transferís la propiedad completa de la carpeta. A partir de ese momento vos pasás a ser colaborador y el otro usuario es quien puede, entre otras cosas, quitarte el acceso a vos. Esta acción no se puede deshacer fácilmente, así que el sistema te pide confirmación aparte.</li>
          </ul>
          <p>Podés ver con quién está compartida cada carpeta y quitarle el acceso a un colaborador en cualquier momento con el botón "Quitar acceso".</p>
        `,
      },
      {
        id: 'sync-mev',
        titulo: 'Sincronizar con la MEV',
        contenido: `
          <p>El sistema revisa automáticamente los mails que llegan de la MEV cada 15 minutos y, si reconoce a qué carpeta corresponden, actualiza el estado del expediente y agrega el movimiento correspondiente.</p>
          <p>No hay un botón para forzar esa sincronización manualmente: es un proceso automático que corre solo en segundo plano. Si un mail de la MEV no se puede asociar automáticamente a ninguna carpeta, te va a aparecer un aviso en la campanita de notificaciones para que lo asignes vos a mano (o lo descartes si no corresponde).</p>
        `,
      },
      {
        id: 'estados-mev',
        titulo: 'Qué significan los estados MEV',
        contenido: `
          <p>"A Despacho" quiere decir que el expediente está esperando que el juzgado dicte alguna resolución o proveído. "En Letra" significa que ya hay algo resuelto y el expediente está a disposición de las partes para su consulta o retiro.</p>
          <p>Estos estados los informa la MEV, así que solo aparecen en carpetas que tienen un expediente vinculado a ese sistema. Muchas carpetas —trámites extrajudiciales, expedientes de otros fueros o jurisdicciones que no usan la MEV, consultas, etc.— nunca van a tener un estado MEV, y eso es normal: no todo lo que cargás como carpeta pasa necesariamente por la MEV.</p>
        `,
      },
      {
        id: 'historial-estados',
        titulo: 'Historial de cambios de estado',
        contenido: `
          <p>Cada vez que la MEV informa un cambio de estado en un expediente, el sistema guarda ese cambio con su fecha. Desde el detalle de la carpeta podés ver ese historial completo y así reconstruir cuánto tiempo estuvo el expediente en cada estado.</p>
        `,
      },
      {
        id: 'detalle-carpeta',
        titulo: 'El detalle de una carpeta',
        contenido: `
          <p>Al entrar a una carpeta ves sus datos principales (cliente, organismo, propietario, descripción, estado MEV si tiene) y la lista completa de sus movimientos, con filtros rápidos para ver Todos, los que vencen en los próximos 7 días, o los vencidos.</p>
          <p>Desde ahí también podés: editar los datos de la carpeta, compartirla, exportarla en PDF, y si tiene un link MEV cargado, abrirlo directamente con el botón correspondiente.</p>
        `,
      },
    ],
  },

  {
    id: 'movimientos',
    titulo: 'Movimientos',
    icono: 'ClipboardList',
    articulos: [
      {
        id: 'crear-movimiento',
        titulo: 'Crear un movimiento nuevo',
        contenido: `
          <p>Un movimiento es cualquier actuación, tarea o hecho que registrás dentro de una carpeta: una presentación, un llamado, una reunión, un escrito, etc.</p>
          <p>Se crea desde el botón "Nuevo movimiento" (arriba, en la barra superior), desde dentro de una carpeta, o directamente desde el Kanban o el Calendario. Como mínimo necesita un título y una carpeta; el resto de los campos —tipo, estado, complejidad, fechas, descripción, responsable— son opcionales pero te van a servir para ordenarte mejor.</p>
          <p>También podés cargar una o más <strong>fechas de recordatorio</strong> independientes de la fecha de vencimiento: te van a avisar en la campanita de notificaciones el día que corresponda.</p>
        `,
      },
      {
        id: 'tipos-movimiento',
        titulo: 'Tipos de movimiento',
        contenido: `
          <p>Los tipos te sirven para clasificar tus movimientos (por ejemplo: "Escrito", "Audiencia", "Llamado", etc.) y después poder filtrarlos o identificarlos rápido por color en las tablas y en el tablero Kanban.</p>
          <p>Podés crear, editar y borrar tus propios tipos desde el ícono de engranaje del formulario de movimiento ("Configurar tipos y estados"). Si borrás un tipo que ya estaba usado en algún movimiento, ese movimiento no se borra: simplemente queda sin tipo asignado.</p>
        `,
      },
      {
        id: 'complejidad',
        titulo: 'Nivel de complejidad',
        contenido: `
          <p>Cada movimiento puede marcarse como complejidad Alta, Media o Baja. Es un dato subjetivo, para tu propio uso: te ayuda a priorizar visualmente qué tareas requieren más atención cuando estás mirando una lista larga de movimientos o el tablero Kanban.</p>
        `,
      },
      {
        id: 'editor-texto',
        titulo: 'El editor de texto: Descripción, Transcripción y Minuta',
        contenido: `
          <p>Cada movimiento tiene tres pestañas de texto:</p>
          <ul>
            <li><strong>Descripción:</strong> el contenido principal del movimiento.</li>
            <li><strong>Transcripción:</strong> pensada para volcar texto dictado o grabado (hay un botón de grabación de voz en la pestaña de Descripción).</li>
            <li><strong>Minuta:</strong> un resumen que podés generar automáticamente a partir de la descripción, o escribir a mano. Se puede imprimir aparte.</li>
          </ul>
          <p>El editor tiene formato básico (negrita, cursiva, subrayado, tachado, color, listas) y un botón para expandirlo a pantalla completa si estás escribiendo algo largo. También podés correr el corrector ortográfico sobre el texto de la pestaña activa, que te muestra las palabras dudosas con sugerencias de corrección.</p>
        `,
      },
      {
        id: 'fecha-vencimiento',
        titulo: 'Fecha y hora de vencimiento',
        contenido: `
          <p>Si el movimiento tiene un plazo, cargá la fecha de vencimiento con el calendario y elegí la hora con el selector de horarios (funciona en pasos de 15 minutos, igual que en Google Calendar: podés desplegarlo y elegir una opción, o escribir directamente una hora como "14:30" para saltar a esa opción).</p>
          <p>Al crear un movimiento nuevo, la hora se precarga automáticamente con la hora actual redondeada hacia el próximo cuarto de hora, para que no tengas que calcularla vos.</p>
        `,
      },
      {
        id: 'filtros-tabla-movimientos',
        titulo: 'Filtros de la tabla de movimientos',
        contenido: `
          <p>En la vista de movimientos podés filtrar por tipo, estado, complejidad, responsable y rango de fechas, además de buscar por texto. Los filtros se pueden combinar entre sí y se mantienen aplicados hasta que los limpiés. Igual que en otras tablas del sistema, podés elegir qué columnas ver y ordenar haciendo click en los encabezados.</p>
        `,
      },
      {
        id: 'dias-sin-movimiento',
        titulo: 'Días sin movimiento',
        contenido: `
          <p>Es la cantidad de días que pasaron desde el último movimiento que vos (o alguien del estudio) cargó en esa carpeta, sin importar qué estado tenga el expediente en la MEV.</p>
          <p>Es un dato distinto al estado MEV: una carpeta puede llevar mucho tiempo "A Despacho" en la MEV y sin embargo tener movimientos recientes cargados por vos (llamados, escritos, gestiones), o al revés. Los "días sin movimiento" reflejan tu propia actividad registrada, no la del juzgado.</p>
        `,
      },
    ],
  },

  {
    id: 'calendario',
    titulo: 'Calendario',
    icono: 'Calendar',
    articulos: [
      {
        id: 'ver-vencimientos-calendario',
        titulo: 'Ver vencimientos en formato calendario',
        contenido: `
          <p>El calendario muestra en formato mensual todos los movimientos que tienen fecha de vencimiento cargada, para que puedas ver de un vistazo cómo se distribuye tu carga de trabajo en el mes. Cada día muestra hasta 3 eventos y, si hay más, un indicador de "+N más".</p>
          <p>Al hacer click en un día se abre un panel al costado con el detalle de todos los eventos de esa fecha (carpeta, descripción y hora).</p>
        `,
      },
      {
        id: 'crear-evento-calendario',
        titulo: 'Crear un movimiento directo desde el calendario',
        contenido: `
          <p>Seleccioná un día y usá el botón "Nuevo movimiento" del panel lateral para abrir el formulario con ese día ya precargado como fecha de vencimiento (a las 23:59), sin tener que ir primero a la carpeta.</p>
        `,
      },
      {
        id: 'editar-vencimiento-calendario',
        titulo: 'Editar la fecha de un vencimiento desde el calendario',
        contenido: `
          <p>En el panel de eventos de un día, los vencimientos propios del sistema tienen un ícono de lápiz para cambiarles rápido la fecha y hora sin tener que abrir el movimiento completo.</p>
        `,
      },
      {
        id: 'conectar-google-calendar',
        titulo: 'Conectar Google Calendar',
        contenido: `
          <p>Podés conectar tu cuenta de Google desde el botón correspondiente en la parte superior del calendario. Una vez conectado, el botón "Sincronizar" sube tus vencimientos como eventos a tu Google Calendar, para que también te avisen desde ahí (por ejemplo, en el celular). El sistema recuerda cuáles ya envió, así que podés apretar Sincronizar las veces que quieras sin que se dupliquen.</p>
          <p>Los eventos que ya tenés cargados en tu Google Calendar también se muestran mezclados en esta vista, identificados con un color distinto, con un link para abrirlos directamente en Google Calendar. Podés desconectar tu cuenta de Google en cualquier momento desde el mismo botón.</p>
        `,
      },
      {
        id: 'colores-calendario',
        titulo: 'Colores y referencias del calendario',
        contenido: `
          <p>Cada evento se pinta según su situación:</p>
          <ul>
            <li><strong>Amarillo — Vencimiento:</strong> un vencimiento cargado, todavía lejos en el tiempo.</li>
            <li><strong>Naranja — Vence pronto:</strong> un vencimiento próximo a cumplirse (dentro de los próximos 7 días).</li>
            <li><strong>Rojo — Vencido:</strong> un vencimiento cuya fecha ya pasó.</li>
            <li><strong>Verde — Google Calendar:</strong> un evento que viene de tu cuenta de Google conectada.</li>
          </ul>
        `,
      },
      {
        id: 'imprimir-calendario',
        titulo: 'Imprimir el calendario',
        contenido: `
          <p>El botón "Imprimir" genera un listado con todos los eventos del mes visible (fecha, evento, carpeta y tipo), listo para imprimir o guardar como PDF.</p>
        `,
      },
    ],
  },

  {
    id: 'kanban',
    titulo: 'Kanban',
    icono: 'Kanban',
    articulos: [
      {
        id: 'vista-tablero',
        titulo: 'Vista de tablero por estado',
        contenido: `
          <p>El Kanban muestra tus movimientos organizados en columnas según su estado (por ejemplo: Pendiente, En curso, Completado, según los estados que tengas configurados). Es una forma visual de ver en qué etapa está cada tarea sin tener que abrir una tabla.</p>
          <p>Cada tarjeta muestra el título, la carpeta, el tipo, la fecha de vencimiento (coloreada según la urgencia), el estado, la complejidad y el responsable. Haciendo click en el nombre de una columna vas directo a la tabla de Movimientos filtrada por ese estado.</p>
        `,
      },
      {
        id: 'mover-columna',
        titulo: 'Mover un movimiento de columna',
        contenido: `
          <p>Arrastrá la tarjeta de un movimiento de una columna a otra para cambiarle el estado. El cambio se guarda automáticamente, no hace falta ningún paso adicional. También podés crear un movimiento directamente en una columna puntual con el botón "+" que aparece en el encabezado de cada columna: se crea ya con ese estado asignado.</p>
        `,
      },
      {
        id: 'vista-rapida-kanban',
        titulo: 'Vista rápida (ícono de ojo) y edición',
        contenido: `
          <p>Cada tarjeta tiene, al pasar el mouse, un ícono de ojo que abre el detalle completo del movimiento en una ventana sin salir del tablero, y un ícono de lápiz para editarlo directamente.</p>
        `,
      },
      {
        id: 'buscar-zoom-kanban',
        titulo: 'Buscar y hacer zoom en el tablero',
        contenido: `
          <p>El buscador de arriba filtra las tarjetas visibles por título, carpeta o responsable en todas las columnas a la vez.</p>
          <p>Los controles de zoom (arriba a la derecha) te permiten alejar o acercar el tablero para ver más columnas a la vez o leer mejor las tarjetas; el botón del medio restablece el zoom al 100%. Esta preferencia se guarda para la próxima vez que entres.</p>
        `,
      },
      {
        id: 'configurar-kanban',
        titulo: 'Configurar el tablero',
        contenido: `
          <p>Con el botón "Configurar" elegís qué estados se muestran como columnas (podés ocultar los que no uses) y en qué orden aparecen, arrastrándolos con el ícono de agarre. Los estados marcados como "final" en el sistema se identifican con una etiqueta aparte.</p>
        `,
      },
    ],
  },

  {
    id: 'dashboard',
    titulo: 'Dashboard',
    icono: 'LayoutDashboard',
    articulos: [
      {
        id: 'tarjetas-generales',
        titulo: 'Tarjetas generales',
        contenido: `
          <p>Las primeras cuatro tarjetas del dashboard son un pantallazo rápido de tu actividad del día:</p>
          <ul>
            <li><strong>Vencen hoy:</strong> cantidad de movimientos con vencimiento el día de hoy.</li>
            <li><strong>Vencen esta semana:</strong> movimientos que vencen dentro de los próximos 7 días.</li>
            <li><strong>Carpetas activas:</strong> cantidad de carpetas que tenés en curso (no archivadas).</li>
            <li><strong>Pendientes:</strong> movimientos que están en un estado "pendiente".</li>
          </ul>
          <p>Cada una te lleva, con un click, al listado correspondiente ya filtrado.</p>
        `,
      },
      {
        id: 'tarjetas-alerta',
        titulo: 'Qué es cada tarjeta de alerta MEV',
        contenido: `
          <p>Las tres tarjetas de la sección MEV te avisan sobre expedientes que podrían necesitar seguimiento:</p>
          <ul>
            <li><strong>A Despacho +90 días:</strong> expedientes que llevan más de 90 días sin cambio de estado en la MEV estando "A Despacho".</li>
            <li><strong>En Letra +90 días:</strong> lo mismo, pero para expedientes que están hace más de 90 días en estado "En Letra".</li>
            <li><strong>Carpetas inactivas +3 meses:</strong> carpetas sin ningún movimiento cargado por vos en los últimos 3 meses, sin importar el estado MEV que tengan.</li>
          </ul>
          <p>Cada tarjeta tiene un engranaje en la esquina que te permite cambiar ese umbral (por ejemplo, poner 6 meses en vez de 3, o usar días/años en lugar de meses) según cómo prefieras vigilar tus carpetas. Al hacer click sobre la tarjeta se abre el listado completo de las carpetas que están en esa situación.</p>
        `,
      },
      {
        id: 'dias-sin-movimiento-vs-mev',
        titulo: 'Días sin movimiento vs. días en estado MEV',
        contenido: `
          <p>Son dos cosas distintas y pueden no coincidir. "Días sin movimiento" es tiempo sin actividad cargada por vos en la carpeta (llamados, escritos, gestiones). "Días en un estado MEV" es el tiempo que el expediente lleva parado en esa etapa dentro del juzgado, según lo informa la MEV.</p>
          <p>Una carpeta puede tener movimientos recientes tuyos y, al mismo tiempo, llevar meses "A Despacho" sin que el juzgado resuelva nada — o viceversa. Por eso conviene mirar ambos datos por separado.</p>
        `,
      },
    ],
  },

  {
    id: 'resumen',
    titulo: 'Resumen',
    icono: 'LayoutList',
    articulos: [
      {
        id: 'tabla-resumen',
        titulo: 'Vista de resumen por carpeta',
        contenido: `
          <p>Esta vista muestra una tabla con el último movimiento cargado en cada carpeta, para que puedas tener una foto rápida de en qué está cada expediente sin tener que entrar carpeta por carpeta.</p>
          <p>Podés buscar por carpeta o movimiento, filtrar por estado, tipo o situación de vencimiento (vencidos, próximos 7 días, vigentes), elegir qué columnas mostrar y ordenar haciendo click en los encabezados. Las filas se colorean en rojo o amarillo según estén vencidas o próximas a vencer. Al hacer click en una fila se abre el detalle completo de ese movimiento, y también podés imprimir o exportar la tabla filtrada.</p>
        `,
      },
    ],
  },

  {
    id: 'notificaciones',
    titulo: 'Notificaciones',
    icono: 'Bell',
    articulos: [
      {
        id: 'campanita',
        titulo: 'La campanita',
        contenido: `
          <p>El ícono de campana en la barra superior centraliza tus avisos, agrupados en dos secciones:</p>
          <ul>
            <li><strong>Actividad del sistema:</strong> asignaciones de movimientos, cambios de estado, carpetas compartidas con vos, cambios de estado MEV, y mails que llegaron desde la MEV pero que el sistema no pudo asociar automáticamente a ninguna carpeta (con un botón "Asignar" para que lo hagas vos).</li>
            <li><strong>Vencimientos:</strong> las fechas de recordatorio que vos mismo cargaste en tus movimientos (ver "Crear un movimiento nuevo" en la sección Movimientos).</li>
          </ul>
          <p>Desde ahí podés marcar cada aviso como leído o ir directo al movimiento o carpeta correspondiente. El link "Ver todas las notificaciones" te lleva a la página completa con más filtros e historial.</p>
          <p>Podés elegir qué tipos de notificación querés recibir desde tu perfil, en la sección de configuración de notificaciones.</p>
        `,
      },
      {
        id: 'pagina-notificaciones',
        titulo: 'Página completa de notificaciones',
        contenido: `
          <p>Además de lo que ves en la campanita, la página de notificaciones te deja filtrar por tipo específico (asignaciones, cambios de estado, carpetas compartidas, o cualquiera de los avisos de MEV) y ver también las que ya marcaste como leídas.</p>
        `,
      },
      {
        id: 'marcar-leidas',
        titulo: 'Marcar como leídas',
        contenido: `
          <p>Podés marcar una notificación puntual como leída (o volver a marcarla como no leída), o usar la opción "Marcar todas leídas" para limpiar el conteo de una sola vez. Las notificaciones leídas se pueden eliminar del listado con "Eliminar leídas" cuando ya no las necesitás.</p>
        `,
      },
    ],
  },

  {
    id: 'informes',
    titulo: 'Informes',
    icono: 'BarChart3',
    articulos: [
      {
        id: 'demora-organismos',
        titulo: 'Demora de organismos (A Despacho → En Letra)',
        contenido: `
          <p>Este informe te muestra, organismo por organismo, cuánto tardan en promedio tus expedientes en pasar de "A Despacho" a "En Letra". Se arma con el historial de sincronización MEV, así que necesita que ya haya habido al menos un cambio de estado registrado.</p>
          <ul>
            <li><strong>Transiciones:</strong> cuántas veces se completó ese pasaje (A Despacho → En Letra) en carpetas de ese organismo.</li>
            <li><strong>Promedio (días):</strong> el promedio de días que tardaron las transiciones que ya se completaron. No incluye los expedientes que siguen esperando.</li>
            <li><strong>Mayor tiempo a Despacho:</strong> el período más largo que una carpeta estuvo "A Despacho" en ese organismo, con un link directo a esa carpeta. Si ese período todavía no terminó (la carpeta sigue A Despacho hoy), vas a ver el badge <strong>"EN CURSO"</strong> junto al dato, indicando que ese número va a seguir creciendo.</li>
          </ul>
        `,
      },
    ],
  },

  {
    id: 'mi-plan',
    titulo: 'Mi Plan',
    icono: 'CreditCard',
    articulos: [
      {
        id: 'donde-esta',
        titulo: 'Dónde ver el estado de tu plan',
        contenido: `
          <p>La sección "Mi Plan" está al final de la página de tu perfil (el mismo lugar donde editás tus datos personales). Ahí vas a ver un cartel con tu estado actual: <strong>Trial activo</strong>, <strong>Activo</strong>, <strong>Pago pendiente</strong> o <strong>Cuenta suspendida</strong>.</p>
        `,
      },
      {
        id: 'periodo-prueba',
        titulo: 'Período de prueba',
        contenido: `
          <p>Al registrarte tenés un período de prueba gratuito de 90 días con acceso completo al sistema. Mientras estás en trial vas a ver una barra de progreso con cuánto te queda y la fecha exacta en que vence. Si todavía no activaste el pago, un botón "Activar suscripción" te lleva a Mercado Pago para registrar tu tarjeta.</p>
        `,
      },
      {
        id: 'pago-mercadopago',
        titulo: 'Cómo funciona el pago con Mercado Pago',
        contenido: `
          <p>El pago se gestiona a través de Mercado Pago mediante una suscripción con débito automático mensual. Una vez activo, en esta sección vas a ver el monto mensual, la fecha del próximo cobro y la del último cobro realizado.</p>
        `,
      },
      {
        id: 'plan-vencido',
        titulo: 'Qué pasa si se vence el plan sin pagar',
        contenido: `
          <p>Si hay un problema con un cobro, la cuenta pasa a estado "Pago pendiente" (moroso) y tenés 30 días para regularizarlo actualizando tu método de pago desde el mismo botón. Si no se regulariza en ese plazo, la cuenta queda suspendida hasta que reactivés la suscripción.</p>
        `,
      },
    ],
  },

  {
    id: 'mi-perfil',
    titulo: 'Mi Perfil',
    icono: 'User',
    articulos: [
      {
        id: 'cuenta',
        titulo: 'Datos de cuenta',
        contenido: `
          <p>Arriba de todo en tu perfil vas a ver, solo de lectura, tu nombre de usuario, tu email, el plan que tenés contratado y si tu email ya está verificado. No se editan desde acá.</p>
        `,
      },
      {
        id: 'datos-personales-perfil',
        titulo: 'Datos personales',
        contenido: `
          <p>Nombre, apellido, teléfono y CUIL/CUIT. Son tus datos básicos de contacto e identificación.</p>
        `,
      },
      {
        id: 'datos-profesionales',
        titulo: 'Datos profesionales',
        contenido: `
          <p>Acá cargás los datos que identifican tu ejercicio profesional:</p>
          <ul>
            <li><strong>Colegio de Abogados</strong> y <strong>matrícula</strong> (tomo, folio y número): tus datos de matriculación.</li>
            <li><strong>Condición fiscal:</strong> Monotributista, Responsable Inscripto, Exento o Consumidor Final.</li>
            <li><strong>Domicilio real:</strong> tu domicilio físico.</li>
            <li><strong>Email electrónico (notificaciones judiciales):</strong> es tu domicilio electrónico a efectos procesales, el mail que usás para recibir notificaciones judiciales. Es un dato de referencia para vos; guardarlo acá no lo constituye automáticamente ante ningún organismo.</li>
          </ul>
        `,
      },
      {
        id: 'config-notificaciones-perfil',
        titulo: 'Configuración de notificaciones',
        contenido: `
          <p>Podés activar o desactivar, con un check cada uno, qué tipos de aviso querés recibir en la campanita: asignaciones de movimientos, cambios de estado, carpetas compartidas, y los tres avisos de MEV (nuevos movimientos, cambios de estado, y errores de sincronización).</p>
        `,
      },
      {
        id: 'cambiar-contraseña',
        titulo: 'Cambiar o agregar contraseña',
        contenido: `
          <p>Si te registraste con usuario y contraseña, acá podés cambiarla (mínimo 8 caracteres, con una mayúscula y un número). Si te registraste con Google, esta sección te va a ofrecer <strong>agregar</strong> una contraseña adicional, para poder entrar también con usuario y contraseña además de con tu cuenta de Google.</p>
        `,
      },
      {
        id: 'ayuda-contextual',
        titulo: 'Activar o desactivar la ayuda contextual',
        contenido: `
          <p>La ayuda contextual son los pequeños globos de texto que aparecen al pasar el mouse sobre ciertos íconos o datos del sistema, explicando qué significan. Se activa o desactiva desde el menú del ícono de ayuda (el signo de pregunta) en la barra superior, no desde esta página.</p>
        `,
      },
      {
        id: 'modo-oscuro',
        titulo: 'Modo oscuro',
        contenido: `
          <p>Podés cambiar entre modo claro y modo oscuro con el ícono de sol/luna en la barra superior. La preferencia se guarda para tus próximas visitas.</p>
        `,
      },
    ],
  },
];
