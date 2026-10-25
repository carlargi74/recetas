# Recetas

Recetario familiar autoalojado: pega un enlace de TikTok, Instagram o YouTube (o sube un video) y la aplicación
descarga el video, lo analiza con IA (Gemini) y guarda para siempre la receta completa:
ingredientes, pasos, tiempos, categoría, etiquetas, fotogramas y el video original.
Cada receta tiene una infografía bonita que se puede descargar como imagen o compartir
con un enlace público.

- **Web + PWA**: instalable en Android (y iPhone) desde el navegador, sin Play Store.
- **Privada**: solo entran los usuarios que tú crees. Recetas compartibles con enlace público opcional.
- **Búsqueda**: por nombre, ingrediente o etiqueta, sin importar acentos. Filtro por categorías.
- **Nutrición**: valores por ración estimados por IA (calorías, macros, fibra, sal, colesterol,
  vitaminas y minerales). Se calculan al añadir cada receta y se pueden recalcular.
- **Perfiles**: una ficha por persona (edad, sexo, altura, peso, actividad, alergias, datos
  médicos...), con o sin cuenta en la app. Todos los datos son opcionales.
- **Menús a medida**: para el periodo que quieras (un día, una semana, un mes, una cena especial),
  con el objetivo que elijas (bajar peso, ganar músculo, cuidar la salud...) y para las personas
  que elijas. La IA prioriza tus recetas y, si falta algo, crea recetas nuevas sin video. Vistas
  semanal, mensual, diaria y lista; imprimibles y compartibles con enlace público.
- **Listas de la compra**: a partir de un menú (cualquier tramo de días y comidas) o de una
  selección de recetas, escaladas a los comensales. Se guardan para siempre, se pueden compartir
  con un enlace y los ticks de "comprado" se sincronizan entre quienes la tengan abierta.



## Arquitectura


| Componente  | Tecnología                                                   |
| ----------- | ------------------------------------------------------------ |
| Backend     | Python + FastAPI, SQLite, yt-dlp, ffmpeg, API de Gemini      |
| Frontend    | React + Vite, PWA                                            |
| Proxy HTTPS | Tu Nginx Proxy Manager existente                             |
| Despliegue  | Docker Compose (la app escucha en el puerto 8420 del miniPC) |


Todos los datos (base de datos, videos, imágenes) viven en la carpeta `./data`.

## Despliegue en el miniPC (Ubuntu 24.04 + Docker)



### 1. Prepara el DNS

En el panel DNS de tu dominio, crea un registro `A` para `recetas.ablerninggroup.es`
apuntando a la IP pública de tu casa (si tu IP cambia, usa un cliente DDNS).
Los puertos 80 y 443 ya los gestiona tu Nginx Proxy Manager.

### 2. Copia el proyecto y configúralo

```bash
# En el miniPC
git clone <tu-repositorio> recetas   # o copia la carpeta por scp/rsync
cd recetas
cp .env.example .env
nano .env
```

Rellena el `.env`:

- `GEMINI_API_KEY`: tu clave de [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- `SECRET_KEY`: genera una con `openssl rand -hex 32`
- `ADMIN_USERNAME` y `ADMIN_PASSWORD`: tu usuario administrador inicial



### 3. Arranca

```bash
docker compose up -d --build
```

La primera vez tarda unos minutos (compila el frontend y descarga las imágenes).
La app queda escuchando en el puerto **8420** del miniPC.

### 4. Crea el proxy host en Nginx Proxy Manager

En la interfaz de Nginx Proxy Manager, **Hosts → Proxy Hosts → Add Proxy Host**:

- **Domain Names**: `recetas.ablerninggroup.es`
- **Scheme**: `http`
- **Forward Hostname / IP**: la IP local del miniPC (ej. `192.168.1.X`)
- **Forward Port**: `8420`
- Activa **Block Common Exploits** y **Websockets Support**
- Pestaña **SSL**: solicita un certificado Let's Encrypt, activa **Force SSL** y **HTTP/2**
- Pestaña **Advanced**, añade esto para permitir subir videos grandes:
  ```nginx
  client_max_body_size 500m;
  proxy_read_timeout 300s;
  proxy_send_timeout 300s;
  ```

Después entra en `https://recetas.ablerninggroup.es`, inicia sesión con el usuario
administrador y crea las cuentas de tu familia desde el menú **Usuarios**.

### 5. Instala la app en el móvil

Abre la web en Chrome (Android) y toca **"Añadir a pantalla de inicio"** /
**"Instalar aplicación"**. Se instala como una app más, con su icono.

## Mantenimiento



### Actualizar yt-dlp (importante)

TikTok cambia su web a menudo y las descargas pueden dejar de funcionar hasta que
yt-dlp se actualiza. Si las recetas por enlace empiezan a fallar, reconstruye:

```bash
docker compose build --no-cache app && docker compose up -d
```

Hazlo también de vez en cuando de forma preventiva (una vez al mes, por ejemplo).
Mientras tanto siempre puedes usar la opción "Subir video".

### Copias de seguridad

Basta con copiar la carpeta `data/` (contiene la base de datos, videos e imágenes):

```bash
tar czf backup-recetas-$(date +%F).tar.gz data/
```



### Coste de la IA

Con `gemini-2.5-flash`, analizar un video de TikTok de ~1 minuto cuesta del orden de
céntimos (o menos). El cálculo nutricional, las listas y los menús son llamadas solo de
texto, mucho más baratas (un menú de un mes son unas 5 llamadas). Con uso familiar normal,
el gasto mensual es de céntimos de euro.

### Al actualizar desde una versión sin nutrición

La base de datos se migra sola al arrancar. Las recetas existentes que no tengan valores
nutricionales se calculan automáticamente en segundo plano (una llamada a Gemini por receta),
así que tras actualizar verás aparecer la nutrición en pocos minutos.

## Desarrollo en local

```bash
# Backend (necesita ffmpeg en el PATH)
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (con proxy hacia el backend en :8000)
cd frontend
npm install
npm run dev
```



## Notas

- Los videos y las imágenes se sirven con nombres aleatorios no adivinables, pero sin
autenticación (necesario para que funcionen los enlaces públicos compartidos y los
reproductores de video). No subas contenido sensible.
- Si TikTok bloquea la descarga desde tu IP ("Your IP address is blocked"), suele ser
temporal; también puedes descargar el video con otra app y subir el archivo.

