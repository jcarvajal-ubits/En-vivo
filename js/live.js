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

  resaltarHorarioLocal();
  actualizarCountdown();
  if (intervaloCountdown) clearInterval(intervaloCountdown);
  intervaloCountdown = setInterval(actualizarCountdown, 1000);
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

function procesarDatos(datos) {
  if (!datos) return;

  const esNuevoChat = cajaMensajes.dataset.ultimoMensaje !== JSON.stringify(datos.mensajes);
  if (esNuevoChat) {
    const bienvenidaHTML = `
      <div class="mensaje">
        <div class="usuario">🦊 Bitto <span class="hora">Fijado</span></div>
        <div class="texto">¡Bienvenidos al lanzamiento oficial de la app! Prepárense para descubrir el futuro del talento. 🚀</div>
      </div>`;

    cajaMensajes.innerHTML = bienvenidaHTML;

    datos.mensajes.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'mensaje';
      div.innerHTML = `<div class="usuario">${escapeHtml(msg.nombre)} <span class="hora">${escapeHtml(msg.hora)}</span></div><div class="texto">${escapeHtml(msg.texto)}</div>`;
      cajaMensajes.appendChild(div);
    });
    cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
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
  apiCall('guardarMensaje', { nombre: usuarioActual, texto: texto });
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
