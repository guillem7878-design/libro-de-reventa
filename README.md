# Libro de Reventa

App de reventa (ventas, stock, compras, devoluciones y móviles) que funciona como web instalable
en el móvil y en el ordenador, con los datos sincronizados en tiempo real entre los dos.

- **Móvil:** pantalla de inicio con 4 botones grandes (Venta, Compra, Devolución, Añadir stock). Desliza hacia arriba para entrar a la app completa.
- **Ordenador:** panel completo con barra lateral.
- **Sincronización:** Supabase (base de datos + login + tiempo real + fotos).
- **Instalable:** PWA con icono propio, pantalla completa y funcionamiento básico sin conexión (para consultar; apuntar necesita conexión).
- **Avisos:** venta apuntada desde otro dispositivo y stock bajo.

**Web publicada:** https://guillem7878-design.github.io/libro-de-reventa/ (GitHub Pages, rama `main`).
Cada `git push` a `main` la actualiza en un minuto.

No hay paso de compilación: son archivos estáticos.

## 1. Crear la base de datos (5 minutos, gratis)

1. Entra en [supabase.com](https://supabase.com) y crea un proyecto (región cercana, p. ej. Frankfurt).
2. Abre **SQL Editor › New query**, pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**.
3. En **Authentication › Providers › Email**, desactiva **Confirm email** para poder crear tu cuenta sin esperar un correo.
4. En **Project Settings › API** copia **Project URL** y la clave **anon public**.
5. Pégalas en [`config.js`](config.js).

> La clave `anon` es pública por diseño; los datos los protegen las reglas RLS del esquema (cada cuenta solo ve lo suyo).
> No pongas nunca la clave `service_role`.

## 2. Publicar la web

La app necesita una URL `https://` para poder instalarse y mandar avisos. Opciones gratuitas:

| Opción | Repo privado | Notas |
| --- | --- | --- |
| **GitHub Pages** | Solo con GitHub Pro | En cuenta gratuita exige repo público. Ajustes › Pages › Deploy from branch › `main` / root. |
| **Cloudflare Pages** | Sí | Conecta el repo y deja vacíos build command y output (`/`). |
| **Netlify** | Sí | Igual: sin build, directorio de publicación `/`. |

Si publicas con un repo público, el código será visible, pero tus datos no: viven en tu Supabase.
Aun así, antes de hacerlo público, borra la carpeta `migracion/` (ya está en `.gitignore`).

## 3. Instalar

- **Android / Chrome:** abre la URL › menú › *Instalar app*.
- **iPhone / Safari:** abre la URL › Compartir › *Añadir a pantalla de inicio*. Los avisos solo funcionan con la app instalada (iOS 16.4 o superior).
- **Ordenador (Chrome / Edge):** icono de instalar en la barra de direcciones › *Instalar*.

Entra con el mismo correo y contraseña en todos los dispositivos.

## 4. Pasar tus datos de Claude

En `migracion/datos-claude.json` está la copia de los datos del artifact de Claude.
En la app: **Ajustes › Importar copia** y elige ese archivo. Incluye ejemplos; bórralos con el aviso naranja «Borrar» que sale arriba.

## Calentar una cuenta (31 días)

El panel de calentamiento (el del agente de reventa de Adidas Samba) vive dentro de la app, en `calentador/`.
Se abre desde **Móviles › Calentar** o **Ajustes › Calentar una cuenta**.

- Plan día a día, índice de confianza, roadmap, artículos, valoraciones e incidencias.
- **Tres pestañas** (Cuenta 1, 2 y 3), cada una con el mismo menú y sus propios datos. Cambias de una a otra arriba y con el lápiz le pones nombre. Lo que ya tenías empezado queda en la Cuenta 1.
- Se guarda en tu Supabase (documento `warmups/current`), así que lo ves igual en el móvil y en el ordenador. Usa la misma sesión que la app.
- **Enviar a la app:** cuando la cuenta esté calentada, pulsa el botón. Crea el móvil en **Móviles** como *Calentada*, con su IBAN si lo pones, y guarda el resumen (alta, días, valoraciones, media e índice). Si aún no cumple todas las comprobaciones, te lo avisa antes de enviar.
- **Calentar otra cuenta** guarda la anterior en el historial y empieza de cero.
- Si tenías datos en el panel antiguo (guardados en tu navegador), en **Registro › Restaurar copia** puedes subir la copia que descargaste de allí.

## Avisos

- Funcionan con la app abierta o en segundo plano (ordenador con la app instalada, móvil con la app instalada).
- Actívalos en **Ajustes › Avisos** en cada dispositivo.
- Avisos con la app **completamente cerrada** requieren Web Push: una función de servidor (por ejemplo una Edge Function de Supabase) y claves VAPID. El service worker ya está preparado para recibirlos, pero ese servidor no está incluido.

## Estructura

```
index.html              la app
sync.js                 conexión con Supabase: login, datos en tiempo real, fotos, avisos, copias
sw.js                   service worker (sin conexión y avisos)
manifest.webmanifest    datos de instalación
config.js               tu URL y clave de Supabase
supabase/schema.sql     tabla, reglas de seguridad y almacenamiento de fotos
vendor/supabase.js      supabase-js 2.45.4 (copia local)
icons/                  iconos (make-icons.js los genera)
```

## Notas

- Los cambios se guardan al instante en la nube; sin conexión la app avisa de que no se pudo guardar.
- Para actualizar la app, sube los cambios al repo: el service worker carga siempre la versión más reciente cuando hay conexión.
