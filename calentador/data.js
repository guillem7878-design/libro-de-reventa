// Datos del panel. Claude actualiza este fichero cuando le cuentas novedades.
// Plan de 31 días pensado para maximizar el índice de confianza con uso real:
// una sola cuenta, sin automatizar, sin compras cruzadas, sin cuentas de amigos.
//
// "suma" indica qué parte del índice sube ese día:
//   Perfil (15) · Antigüedad (25) · Artículos (10) · Operaciones (15) · Valoraciones (20) · Uso regular (15)
window.DATA = {
  account: { alias: "Mi cuenta Vinted", createdAt: null }, // createdAt: "2026-10-07"
  plan: [
    { d:1, title:"Crear la cuenta", suma:"Base de la cuenta y antigüedad (empieza a contar hoy)",
      steps:[
        "Usa siempre el mismo móvil y la misma conexión (wifi de casa o tus datos). Nada de VPN ni emuladores.",
        "Descarga la app oficial de Vinted y regístrate con tu email real principal, el que uses a diario.",
        "Crea una contraseña única de 12 caracteres o más (mejor con un gestor de contraseñas).",
        "Confirma el email desde el mensaje que te llega.",
        "Nombre de usuario sencillo: tu nombre o un apodo. Sin números aleatorios ni palabras como shop, store o reseller.",
        "Cierra la app. No publiques, busques ni compres nada hoy."],
      dont:"No uses emails temporales y no crees ninguna otra cuenta." },
    { d:2, title:"Perfil: foto, descripción y ubicación", suma:"Perfil completo (+ confianza del comprador)",
      steps:[
        "Foto de perfil real, nítida y cuadrada, con luz natural. Sin logos, sin texto y sin fotos de internet.",
        "Descripción de 2 frases, por ejemplo: «Vendo ropa y zapatillas que ya no uso. Envío rápido con seguimiento y trato cuidado.»",
        "Ubicación: tu ciudad o provincia real.",
        "Comprueba que el idioma y el país de la app son los tuyos."],
      dont:"No pongas enlaces, redes sociales, teléfono ni la palabra «tienda» en la descripción." },
    { d:3, title:"Envío, cobro y teléfono", suma:"Perfil completo (datos que Vinted comprueba)",
      steps:[
        "Añade tu dirección de envío real (la misma que usarás para recibir paquetes).",
        "Configura el cobro con Vinted Pay: la cuenta bancaria tiene que estar a tu nombre.",
        "Añade tu teléfono y verifícalo con el SMS de confirmación.",
        "Comprueba que nombre, dirección y banco coinciden entre sí."],
      dont:"No uses datos bancarios, direcciones ni teléfonos de otra persona." },
    { d:4, title:"Verificación y ajustes", suma:"Perfil completo y verificado",
      steps:[
        "Si Vinted te ofrece verificar la identidad, hazlo hoy con tu documento real y fotos nítidas, sin reflejos.",
        "Activa las notificaciones de mensajes y ofertas: responder rápido te ayudará después.",
        "Navega 5 minutos por anuncios de ropa y zapatillas sin hacer nada más."],
      dont:"No ofertes ni compres todavía." },
    { d:5, title:"Navegar con intención real", suma:"Uso regular",
      steps:[
        "Busca 3 cosas que te interesen de verdad (una prenda, unas zapatillas, un accesorio).",
        "Guarda como favoritos 3 o 4 anuncios que de verdad te gusten.",
        "Entra en 2 o 3 perfiles de vendedores con buenas valoraciones y fíjate en cómo escriben títulos y descripciones.",
        "Copia mentalmente la estructura de los mejores anuncios: título claro, 5 o 6 fotos, estado y medidas."],
      dont:"No des likes en masa, no sigas a muchas cuentas y no compres." },
    { d:6, title:"Día de descanso", suma:"Antigüedad (el tiempo es el factor que más pesa)",
      steps:["Abre la app 2 o 3 minutos y mira las notificaciones.","Cierra."],
      dont:"Nada más. Descansar también es parte del ritmo." },
    { d:7, title:"Preparar las fotos de los primeros artículos", suma:"Artículos (la calidad de las fotos mejora las ventas)",
      steps:[
        "Haz una lista de 10 artículos de casa que de verdad quieras vender (ropa, accesorios, objetos). Empieza por los que tengan marca y estén en buen estado.",
        "Elige 2 y haz las fotos con luz natural junto a una ventana y un fondo liso (sábana blanca, suelo claro o pared lisa).",
        "Haz de 5 a 6 fotos por artículo: frontal, trasera, etiqueta de marca, etiqueta de talla y composición, un detalle y cualquier defecto.",
        "Fotos verticales o cuadradas y sin filtros. Nada de imágenes de internet.",
        "Apunta para cada uno: marca, talla, color, estado, medidas y motivo de venta."],
      dont:"No uses fotos que no sean tuyas." },
    { d:8, title:"Descripciones y precios", suma:"Artículos (anuncios bien hechos se venden antes)",
      steps:[
        "Plantilla de descripción: «[Prenda] [marca] talla [X], color [Y]. Estado: [muy bueno / bueno], [sin defectos / defecto concreto]. Medidas: [hombros / largo]. Motivo de venta: ya no lo uso. Envío con seguimiento en 48 h.»",
        "Título con el formato marca + prenda + talla + color.",
        "Mira 5 a 8 anuncios parecidos y pon un precio entre un 10 y un 15 % por debajo de la mediana. Evita precios muy bajos: parecen sospechosos.",
        "Prepara fotos y texto de los 2 siguientes artículos."],
      dont:"No subas nada todavía." },
    { d:9, title:"Subir el artículo 1", suma:"Artículos",
      steps:[
        "Sube las fotos en este orden: frontal, trasera, etiqueta, detalle, defecto.",
        "Escribe el título y la descripción con tu plantilla. Elige la categoría exacta, el estado real y el tamaño de paquete.",
        "Revisa la vista previa y publica.",
        "Apúntalo en la pestaña Artículos del panel."],
      dont:"No subas otro artículo hoy." },
    { d:10, title:"Entrar y responder", suma:"Uso regular (responder rápido mejora tu reputación)",
      steps:[
        "Abre la app y responde cualquier mensaje u oferta con educación, en menos de 2 horas si puedes.",
        "Navega 3 a 5 minutos y guarda algún favorito si te interesa."],
      dont:"No bajes el precio todavía." },
    { d:11, title:"Día de descanso", suma:"Antigüedad",
      steps:["Mira solo las notificaciones y responde si hay mensajes."],
      dont:"No subas ni compres." },
    { d:12, title:"Subir el artículo 2", suma:"Artículos",
      steps:[
        "Mismo proceso que el día 9: fotos propias, título, categoría, estado, descripción y precio.",
        "Revisa la vista previa, publica y apúntalo en el panel."],
      dont:"No subas más de uno hoy." },
    { d:13, title:"Entrar y responder", suma:"Uso regular",
      steps:[
        "Responde mensajes y ofertas.",
        "Si alguien te hace una oferta razonable (a partir del 80 % del precio), acéptala o contraofrece con educación."],
      dont:"No hagas ofertas tú por hacer." },
    { d:14, title:"Revisión semanal 2", suma:"Uso regular",
      steps:[
        "Mira cuántos mensajes, ofertas y visitas has tenido en los 2 artículos.",
        "Mejora la foto principal o el título del que tenga menos visitas.",
        "Mira el índice de confianza del panel y el siguiente paso que te sugiere."],
      dont:"No bajes el precio aún." },
    { d:15, title:"Subir el artículo 3", suma:"Artículos",
      steps:[
        "Fotos propias, título, categoría, estado, descripción y precio.",
        "Publica y apúntalo en el panel."],
      dont:"Solo uno." },
    { d:16, title:"Primera compra real", suma:"Operaciones (compras reales) y valoraciones",
      steps:[
        "Elige algo que necesites de verdad y que cueste poco (5 a 15 €).",
        "Elige un vendedor con muchas valoraciones buenas y un envío con seguimiento.",
        "Escribe un mensaje educado y paga con Vinted Pay, sin sacar nunca la conversación fuera de la app."],
      dont:"No compres a amigos ni a cuentas vinculadas a ti." },
    { d:17, title:"Entrar y gestionar", suma:"Uso regular",
      steps:[
        "Responde mensajes. Si vendiste algo, imprime la etiqueta y prepara el envío.",
        "Navega 3 a 5 minutos."],
      dont:"No subas nada hoy." },
    { d:18, title:"Subir el artículo 4", suma:"Artículos",
      steps:["Fotos propias, título, categoría, estado, descripción y precio.","Publica y apúntalo en el panel."],
      dont:"Solo uno." },
    { d:19, title:"Valorar la primera compra y hacer la segunda", suma:"Operaciones y valoraciones",
      steps:[
        "Cuando llegue la primera compra, revísala, confirma la recepción en la app y valora al vendedor con honestidad.",
        "Haz la segunda compra real, de poco importe, a otro vendedor distinto (solo si necesitas algo).",
        "Paga con Vinted Pay y mantén toda la conversación dentro de la app.",
        "Responde mensajes."],
      dont:"No compres por comprar: solo lo que necesites, de poco importe y a un vendedor distinto cada vez." },
    { d:20, title:"Subir el artículo 5", suma:"Artículos",
      steps:["Fotos propias, título, categoría, estado, descripción y precio.","Publica y apúntalo en el panel."],
      dont:"Solo uno." },
    { d:21, title:"Tercera compra real y revisión semanal 3", suma:"Operaciones y valoraciones",
      steps:[
        "Haz la tercera compra real de poco importe, a un vendedor distinto de los anteriores (solo si necesitas algo).",
        "Si llegó la segunda compra, confirma la recepción y valora al vendedor.",
        "Si algún artículo lleva 2 semanas sin interés, bájale un 5 a 10 %.",
        "Mira tu índice de confianza y el siguiente paso que te sugiere."],
      dont:"No compres por comprar: solo lo que necesites, de poco importe y a un vendedor distinto cada vez." },
    { d:22, title:"Subir el artículo 6", suma:"Artículos",
      steps:["Fotos propias, título, categoría, estado, descripción y precio.","Publica y apúntalo en el panel."],
      dont:"Solo uno." },
    { d:23, title:"Envíos y pedir valoraciones", suma:"Valoraciones (la clave para llegar a 7)",
      steps:[
        "Envía en 24 a 48 horas todo lo que hayas vendido y avisa al comprador con el número de seguimiento.",
        "Cuando el comprador confirme la recepción, escribe un mensaje breve y educado: «¡Gracias! Si todo ha ido bien, ¿me dejas una valoración?»",
        "Si llegó alguna de tus compras, confírmala y valórala.",
        "Responde mensajes."],
      dont:"No presiones ni insistas más de una vez." },
    { d:24, title:"Subir el artículo 7 y cuarta compra", suma:"Artículos, operaciones y valoraciones",
      steps:[
        "Si llegó la tercera compra, confírmala y valora al vendedor.",
        "Sube el artículo 7 con el mismo proceso de siempre y apúntalo en el panel.",
        "Haz la cuarta compra real de poco importe, a otro vendedor distinto (solo si necesitas algo)."],
      dont:"No compres por comprar: solo lo que necesites, de poco importe y a un vendedor distinto cada vez." },
    { d:25, title:"Subir el artículo 8", suma:"Artículos",
      steps:["Fotos propias, título, categoría, estado, descripción y precio.","Publica y apúntalo en el panel.","Responde mensajes y ofertas."],
      dont:"Solo uno." },
    { d:26, title:"Quinta compra real", suma:"Operaciones y valoraciones",
      steps:[
        "Haz la quinta compra real de poco importe, a un vendedor distinto de los anteriores (solo si necesitas algo).",
        "Paga con Vinted Pay y mantén toda la conversación dentro de la app.",
        "Si llegó alguna compra pendiente, confírmala y valórala."],
      dont:"No compres por comprar: solo lo que necesites, de poco importe y a un vendedor distinto cada vez." },
    { d:27, title:"Subir el artículo 9 y gestionar ventas", suma:"Artículos y valoraciones",
      steps:[
        "Sube el artículo 9.",
        "Si llegó la cuarta compra, confírmala y valora al vendedor.",
        "Gestiona cualquier venta pendiente: envío, seguimiento y petición de valoración.",
        "Registra en la pestaña Artículos las ventas que hayas cerrado, con su valoración."],
      dont:"Solo un artículo." },
    { d:28, title:"Subir el artículo 10 y revisión semanal 4", suma:"Artículos y revisión",
      steps:[
        "Sube el artículo 10 para llegar a unos 10 anuncios publicados.",
        "Anota en el panel todas las ventas, compras y valoraciones que tengas.",
        "Mira el índice de confianza y el desglose: el panel te dice qué te falta."],
      dont:"No subas zapatillas todavía." },
    { d:29, title:"Preparar las zapatillas (sin subir)", suma:"Pruebas de compra (criterio para desbloquear las Samba)",
      steps:[
        "Reúne la prueba de compra de cada par: factura, email del pedido o captura del pedido. Sin prueba no subas ese par.",
        "Haz de 8 a 12 fotos propias de cada par: laterales, frontal, talón, lengüeta, plantilla, suela, costuras, etiqueta interior con el código de artículo, y la caja con su etiqueta.",
        "Apunta modelo exacto, colorway, talla y estado.",
        "Si te llegó la quinta compra, confírmala y valora; si aún no, hazlo en cuanto llegue."],
      dont:"No subas nada todavía." },
    { d:30, title:"Descripción y precio de las zapatillas", suma:"Pruebas de compra y coherencia del anuncio",
      steps:[
        "Redacta la descripción: marca, modelo exacto, colorway, talla, estado y si tienes caja o ticket.",
        "Mira anuncios vendidos de ese modelo y fija un precio realista, sin quedarte muy por debajo del mercado.",
        "Decide con qué par empiezas: solo 1 de prueba.",
        "Marca en la pestaña Cuenta que tienes la prueba de compra guardada."],
      dont:"No uses frases como «alternativa perfecta a…» ni compares con otros modelos." },
    { d:31, title:"Decidir el primer par", suma:"Desbloqueo de las Samba",
      steps:[
        "Mira el indicador «Listo para Samba»: debe tener antigüedad, valoraciones, artículos, sin avisos y la prueba de compra.",
        "Si está en verde, sube 1 solo par con tus fotos y la descripción. No subas otro hasta que se resuelva o se venda.",
        "Si no está en verde, sigue 3 días más con uso normal y repite esta revisión: es normal que las valoraciones tarden.",
        "Si entra en revisión, aporta lo que pidan y no lo re-subas."],
      dont:"No subas varios pares ni borres y re-subas el anuncio." }
  ],
  // estado: activo | revision | vendido | rechazado
  listings: [
    // { fecha:"2026-10-20", articulo:"Samba OG", modelo:"Blanco 42", coste:60, precio:90, estado:"activo", prueba:"captura pedido", motivo:"", precioVenta:null, comisionEnvio:null, valoracion:null, notas:"" }
  ],
  activity: [
    // { fecha:"2026-10-07", subidos:0, ventas:0, compras:0, valoraciones:0, avisos:0, notas:"" }
  ],
  ratings: [
    // { fecha:"2026-10-25", estrellas:5, comentario:"" }
  ]
};
