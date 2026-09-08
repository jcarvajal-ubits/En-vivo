/* ===========================================================
   LIVE — reproductor de video, chat en vivo y reacciones
   =========================================================== */

const cajaMensajes = document.getElementById('cajaMensajes');
const inputMensaje = document.getElementById('inputMensaje');

let intervaloCountdown = null;

// Remueve la pantalla de carga cuando el componente de video notifica su renderización
document.getElementById('vimeoplayer').addEventListener('load', function() {
  if (this.src && this.src.includes('vimeo')) {
    const loader = document.getElementById('video-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.style.display = 'none', 600);
    }
  }
});

// Decide si hay que mostrar el video ya o la sala de espera con cuenta regresiva
function iniciarTransmision() {
  const ahora = new Date();
  if (ahora >= EVENT_START_TIME) {
    cargarVideo();
  } else {
    mostrarCountdown();
  }
}

// Inyecta el enlace de Vimeo en el iframe (dispara el evento 'load' de arriba)
function cargarVideo() {
  const countdown = document.getElementById('countdown-screen');
  if (countdown) countdown.style.display = 'none';
  document.getElementById('vimeoplayer').src = VIMEO_EMBED_URL;
}

// Muestra la sala de espera y actualiza el reloj cada segundo
function mostrarCountdown() {
  const loader = document.getElementById('video-loader');
  const countdown = document.getElementById('countdown-screen');
  if (loader) loader.style.display = 'none';
  if (countdown) countdown.style.display = 'flex';

  actualizarFechaEvento();
  resaltarHorarioLocal();
  actualizarCountdown();
  if (intervaloCountdown) clearInterval(intervaloCountdown);
  intervaloCountdown = setInterval(actualizarCountdown, 1000);
}

// Escribe la fecha completa del evento (ej. "Jueves 10 de septiembre de 2026")
// calculándola siempre a partir de EVENT_START_TIME, para que nunca quede
// desincronizada si más adelante se cambia la fecha en config.js
function actualizarFechaEvento() {
  const el = document.getElementById('countdownFecha');
  if (!el) return;

  const formateador = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota'
  });

  let texto = formateador.format(EVENT_START_TIME);
  texto = texto.charAt(0).toUpperCase() + texto.slice(1);
  el.textContent = '📅 ' + texto;
}

// Detecta el huso horario del navegador del visitante y resalta la fila
// de la tabla que le corresponde (sin pedir permisos ni ubicación exacta:
// se basa en el offset UTC que el propio navegador ya expone).
function resaltarHorarioLocal() {
  const filas = document.querySelectorAll('.schedule-row');

  // getTimezoneOffset() da minutos "detrás" de UTC (positivo si vas atrás),
  // por eso se invierte el signo para obtener el offset real (ej. Colombia = -5)
  const offsetHoras = -new Date().getTimezoneOffset() / 60;

  // Offsets disponibles en la tabla del evento
  const offsetsDisponibles = [-6, -5, -4, -3];

  // Se busca el offset más cercano al del visitante (por si su país no está
  // en la lista pero comparte huso horario con alguno que sí lo está)
  const offsetMasCercano = offsetsDisponibles.reduce((mejor, actual) =>
    Math.abs(actual - offsetHoras) < Math.abs(mejor - offsetHoras) ? actual : mejor
  );

  filas.forEach(fila => {
    const esCoincidencia = parseInt(fila.dataset.utcOffset, 10) === offsetMasCercano;
    fila.classList.toggle('active', esCoincidencia);
  });
}

function actualizarCountdown() {
  const restante = EVENT_START_TIME - new Date();

  if (restante <= 0) {
    clearInterval(intervaloCountdown);
    cargarVideo();
    return;
  }

  const horas = Math.floor(restante / 3600000);
  const minutos = Math.floor((restante % 3600000) / 60000);
  const segundos = Math.floor((restante % 60000) / 1000);

  document.getElementById('cdHoras').innerText = String(horas).padStart(2, '0');
  document.getElementById('cdMinutos').innerText = String(minutos).padStart(2, '0');
  document.getElementById('cdSegundos').innerText = String(segundos).padStart(2, '0');
}

function toggleChat() {
  const sidebar = document.getElementById('chat-sidebar');
  const btn = document.getElementById('btnToggleChat');
  const videoSec = document.getElementById('videoSection');

  isChatOpen = !isChatOpen;
  if (isChatOpen) {
    sidebar.style.display = 'flex';
    btn.style.display = 'none';
    if (window.innerWidth > 768) {
      videoSec.style.width = 'calc(100% - 355px)';
    }
  } else {
    sidebar.style.display = 'none';
    btn.style.display = 'flex';
    videoSec.style.width = '100%';
  }
}

// Mensajes que el propio usuario acaba de enviar y que todavía no han sido
// confirmados por el backend (se muestran al instante, "optimistamente",
// para que el chat se sienta inmediato aunque la respuesta del servidor tarde).
let mensajesPendientes = [];
let ultimosMensajesServidor = [];

function procesarDatos(datos) {
  if (!datos) return;

  const esNuevoChat = cajaMensajes.dataset.ultimoMensaje !== JSON.stringify(datos.mensajes);
  if (esNuevoChat) {
    ultimosMensajesServidor = datos.mensajes;

    // Cualquier mensaje pendiente que ya llegó del servidor deja de mostrarse
    // como "pendiente" (se elimina de la lista local para no duplicarlo).
    mensajesPendientes = mensajesPendientes.filter(pendiente =>
      !ultimosMensajesServidor.some(m => m.nombre === pendiente.nombre && m.texto === pendiente.texto)
    );

    renderMensajes();
    cajaMensajes.dataset.ultimoMensaje = JSON.stringify(datos.mensajes);
  }

  datos.reacciones.forEach(reacc => {
    if (!emojisAnimados.includes(reacc.id)) {
      crearEmojiFlotante(reacc.emoji);
      emojisAnimados.push(reacc.id);
    }
  });
  if (emojisAnimados.length > 100) emojisAnimados = emojisAnimados.slice(-50);
}

// Dibuja el chat completo: mensaje fijado + mensajes confirmados del servidor
// + mensajes propios que aún están "en camino" (optimistas).
function renderMensajes() {
  const bienvenidaHTML = `
    <div class="mensaje">
      <div class="usuario">🦊 Bitto <span class="hora">Fijado</span></div>
      <div class="texto">¡Bienvenidos al lanzamiento oficial de la app! Prepárense para descubrir el futuro del talento. 🚀</div>
    </div>`;

  cajaMensajes.innerHTML = bienvenidaHTML;

  ultimosMensajesServidor.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'mensaje';
    div.innerHTML = `<div class="usuario">${escapeHtml(msg.nombre)} <span class="hora">${escapeHtml(msg.hora)}</span></div><div class="texto">${escapeHtml(msg.texto)}</div>`;
    cajaMensajes.appendChild(div);
  });

  mensajesPendientes.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'mensaje pendiente';
    div.innerHTML = `<div class="usuario">${escapeHtml(msg.nombre)} <span class="hora">Enviando...</span></div><div class="texto">${escapeHtml(msg.texto)}</div>`;
    cajaMensajes.appendChild(div);
  });

  cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

function pedirDatos() {
  apiCall('getDatos');
}

function enviar() {
  const texto = inputMensaje.value.trim();
  if (!texto) return;
  inputMensaje.value = '';

  // Se muestra de inmediato como "pendiente" mientras el backend lo confirma,
  // así el chat no se siente lento aunque la respuesta del servidor tarde.
  mensajesPendientes.push({ nombre: usuarioActual, texto: texto });
  renderMensajes();

  apiCall('guardarMensaje', { nombre: usuarioActual, texto: texto }).then(() => {
    // En cuanto el servidor confirma, se adelanta el siguiente sondeo para
    // que el mensaje real reemplace a la versión "pendiente" lo antes posible.
    pedirDatos();
  });
}

function enviarReaccion(emoji) {
  crearEmojiFlotante(emoji);
  apiCall('guardarReaccion', { emoji: emoji });
}

function crearEmojiFlotante(emoji) {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.innerText = emoji;
  const randomLeftOffset = Math.random() * 80 - 40;
  el.style.transform = `translateX(${randomLeftOffset}px)`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); }, 2500);
}

inputMensaje.addEventListener("keypress", function(event) {
  if (event.key === "Enter") { event.preventDefault(); enviar(); }
});

function iniciarChat() {
  pedirDatos();
  setInterval(pedirDatos, 3500);
}

// Registra y envía el evento de abandono de sesión
window.addEventListener('beforeunload', function() {
  if (correoActual !== "" && document.getElementById('lobby-screen').style.display === 'none') {
    const payload = JSON.stringify({
      action: 'desconexion',
      correo: correoActual
    });
    navigator.sendBeacon(API_URL, payload);
  }
});
