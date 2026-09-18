/* ===========================================================
   LIVE — reproductor, sala de espera, chat y reacciones
   =========================================================== */

const cajaMensajes = document.getElementById('cajaMensajes');
const inputMensaje = document.getElementById('inputMensaje');

const MENSAJE_FIJADO = {
  nombre: 'Bitto',
  hora: 'Fijado',
  texto: '¡Hola! Qué bueno tenerte por acá. Cuéntanos en qué empresa trabajas, desde qué ciudad te conectas y déjanos tus preguntas en el chat. ¡Te leemos al tiro!'
};

let intervaloCountdown = null;

/* ---------- Video principal ---------- */

document.getElementById('vimeoplayer').addEventListener('load', function () {
  if (this.src && this.src.includes('vimeo')) {
    const loader = document.getElementById('video-loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(function () { loader.style.display = 'none'; }, 600);
    }
  }
});

/* ---------- Ajuste del video (contain, sin zoom) ---------- */

function ajustarCobertura(wrapper, iframe, ratio) {
  if (!wrapper || !iframe) return;
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  if (!w || !h) return;

  let anchoVideo, altoVideo;
  if (w / h > ratio) {
    altoVideo = h;
    anchoVideo = h * ratio;
  } else {
    anchoVideo = w;
    altoVideo = w / ratio;
  }

  iframe.style.width  = anchoVideo + 'px';
  iframe.style.height = altoVideo + 'px';
  iframe.style.left   = ((w - anchoVideo) / 2) + 'px';
  iframe.style.top    = ((h - altoVideo)  / 2) + 'px';
}

function ajustarCoberturaVideos() {
  ajustarCobertura(document.getElementById('videoWrapper'), document.getElementById('vimeoplayer'), 16 / 9);
  ajustarCobertura(document.getElementById('loopVideoBox'), document.getElementById('loopVideo'), 16 / 9);
}

window.addEventListener('resize', ajustarCoberturaVideos);

if (window.ResizeObserver) {
  const roVideo = new ResizeObserver(ajustarCoberturaVideos);
  document.addEventListener('DOMContentLoaded', function () {
    const vw = document.getElementById('videoWrapper');
    const lb = document.getElementById('loopVideoBox');
    if (vw) roVideo.observe(vw);
    if (lb) roVideo.observe(lb);
  });
}

function iniciarTransmision() {
  if (new Date() >= EVENT_START_TIME) {
    cargarVideo();
  } else {
    mostrarCountdown();
  }
}

function cargarVideo() {
  const countdown = document.getElementById('countdown-screen');
  if (countdown) countdown.style.display = 'none';
  detenerLoop();
  document.getElementById('vimeoplayer').src = VIMEO_EMBED_URL;
  requestAnimationFrame(ajustarCoberturaVideos);
}

/* ---------- Sala de espera ---------- */

function mostrarCountdown() {
  const loader = document.getElementById('video-loader');
  const countdown = document.getElementById('countdown-screen');
  if (loader) loader.style.display = 'none';
  if (countdown) countdown.style.display = 'flex';

  iniciarLoop();
  requestAnimationFrame(ajustarCoberturaVideos);
  actualizarFechaEvento();
  actualizarCountdown();
  if (intervaloCountdown) clearInterval(intervaloCountdown);
  intervaloCountdown = setInterval(actualizarCountdown, 1000);
}

let loopWatchdog = null;
let loopConSonido = true;

function activarSonido() {
  const iframe = document.getElementById('loopVideo');
  const btn = document.getElementById('btnSonido');
  if (!iframe) return;

  loopConSonido = true;
  iframe.setAttribute('src', LOOP_VIDEO_URL_SONIDO);

  if (btn) {
    btn.innerHTML = '<span class="sonido-icon">&#128266;</span> Silenciar';
    btn.classList.add('activo');
  }
}

function silenciarLoop() {
  const iframe = document.getElementById('loopVideo');
  const btn = document.getElementById('btnSonido');
  if (!iframe) return;

  loopConSonido = false;
  iframe.setAttribute('src', LOOP_VIDEO_URL);

  if (btn) {
    btn.innerHTML = '<span class="sonido-icon">&#128263;</span> Activar audio';
    btn.classList.remove('activo');
  }
}

function toggleSonido() {
  if (loopConSonido) {
    silenciarLoop();
  } else {
    activarSonido();
  }
}

function iniciarLoop() {
  const iframe = document.getElementById('loopVideo');
  if (!iframe) return;
  if (iframe.getAttribute('src')) return;

  loopConSonido = true;
  iframe.setAttribute('src', LOOP_VIDEO_URL_SONIDO);

  const btn = document.getElementById('btnSonido');
  if (btn) {
    btn.innerHTML = '<span class="sonido-icon">&#128266;</span> Silenciar';
    btn.classList.add('activo');
  }

  if (loopWatchdog) clearInterval(loopWatchdog);
  loopWatchdog = setInterval(function () {
    const el = document.getElementById('loopVideo');
    const cs = document.getElementById('countdown-screen');
    const visible = cs && cs.style.display !== 'none';
    if (!el || !visible || document.hidden) return;
    el.setAttribute('src', loopConSonido ? LOOP_VIDEO_URL_SONIDO : LOOP_VIDEO_URL);
  }, 300000);
}

function detenerLoop() {
  if (loopWatchdog) clearInterval(loopWatchdog);
  const iframe = document.getElementById('loopVideo');
  if (iframe) iframe.setAttribute('src', '');
}

function actualizarFechaEvento() {
  const el = document.getElementById('countdownFecha');
  if (!el) return;

  const formateador = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Santiago'
  });

  let texto = formateador.format(EVENT_START_TIME);
  texto = texto.charAt(0).toUpperCase() + texto.slice(1);
  el.textContent = texto + ' - 10:00 hrs. de Chile';
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

/* ---------- Agregar a Google Calendar ---------- */

function agregarAlCalendario() {
  const inicioUTC = '20260923T130000Z';
  const finUTC    = '20260923T140000Z';

  const titulo    = 'En vivo: Prevención de lavado de activos y financiamiento del terrorismo';
  const detalles  = 'Ingresa a la plataforma y disfruta del evento.\n\nEnlace: https://www.lxp.ubitslearning.com/learner/content/220173';
  const ubicacion = 'En línea';

  const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text='     + encodeURIComponent(titulo)
    + '&dates='    + inicioUTC + '/' + finUTC
    + '&details='  + encodeURIComponent(detalles)
    + '&location=' + encodeURIComponent(ubicacion)
    + '&ctz=America/Santiago';

  window.open(url, '_blank', 'noopener');
}

/* ---------- Agregar a Outlook Calendar ---------- */

function agregarAOutlook() {
  const inicioUTC = '2026-09-23T13:00:00Z';
  const finUTC    = '2026-09-23T14:00:00Z';

  const titulo    = 'En vivo: Prevención de lavado de activos y financiamiento del terrorismo';
  const detalles  = 'Ingresa a la plataforma y disfruta del evento.\n\nEnlace: https://www.lxp.ubitslearning.com/learner/content/220173';
  const ubicacion = 'En línea';

  const url = 'https://outlook.office.com/calendar/0/deeplink/compose'
    + '?allday=false'
    + '&subject='  + encodeURIComponent(titulo)
    + '&body='     + encodeURIComponent(detalles)
    + '&location=' + encodeURIComponent(ubicacion)
    + '&startdt='  + inicioUTC
    + '&enddt='    + finUTC
    + '&path=%2Fcalendar%2Faction%2Fcompose'
    + '&rru=addevent';

  window.open(url, '_blank', 'noopener');
}

/* ---------- Chat ---------- */

function toggleChat() {
  const sidebar = document.getElementById('chat-sidebar');
  const btn = document.getElementById('btnToggleChat');
  const videoSec = document.getElementById('videoSection');

  isChatOpen = !isChatOpen;
  if (isChatOpen) {
    sidebar.style.display = 'flex';
    btn.style.display = 'none';
    if (window.innerWidth > 768) videoSec.style.width = 'calc(100% - 355px)';
  } else {
    sidebar.style.display = 'none';
    btn.style.display = 'flex';
    videoSec.style.width = '100%';
  }
  setTimeout(ajustarCoberturaVideos, 320);
}

let mensajesPendientes = [];
let ultimosMensajesServidor = [];

function procesarDatos(datos) {
  if (!datos) return;

  // Contador de personas conectadas
  if (typeof datos.conectados === 'number') {
    actualizarContador(datos.conectados);
  }

  if (Array.isArray(datos.mensajes)) {
    const firma = JSON.stringify(datos.mensajes);
    if (cajaMensajes.dataset.ultimoMensaje !== firma) {
      ultimosMensajesServidor = datos.mensajes;

      mensajesPendientes = mensajesPendientes.filter(function (p) {
        return !ultimosMensajesServidor.some(function (m) {
          return m.cid && m.cid === p.cid;
        });
      });

      renderMensajes();
      cajaMensajes.dataset.ultimoMensaje = firma;
    }
  }

  (datos.reacciones || []).forEach(function (reacc) {
    if (emojisAnimados.indexOf(reacc.id) === -1) {
      crearEmojiFlotante(reacc.emoji);
      emojisAnimados.push(reacc.id);
    }
  });
  if (emojisAnimados.length > 200) emojisAnimados = emojisAnimados.slice(-100);
}

/* ---------- Contador de conectados ---------- */

function actualizarContador(n) {
  const el = document.getElementById('contadorNumero');
  if (!el) return;
  const actual = parseInt(el.textContent, 10);
  if (actual === n) return;

  el.textContent = n;
  // Pequeña animación de pulso cuando cambia
  const cont = document.getElementById('contadorConectados');
  if (cont) {
    cont.classList.add('pulso');
    setTimeout(function () { cont.classList.remove('pulso'); }, 600);
  }
}

/* ---------- Render de mensajes ---------- */

function renderMensajes() {
  const debeBajar = cajaMensajes.scrollHeight - cajaMensajes.scrollTop - cajaMensajes.clientHeight < 120;

  cajaMensajes.innerHTML = '';
  cajaMensajes.appendChild(nodoMensaje(MENSAJE_FIJADO, 'mensaje fijado'));

  ultimosMensajesServidor.forEach(function (msg) {
    cajaMensajes.appendChild(nodoMensaje(msg, 'mensaje'));
  });

  mensajesPendientes.forEach(function (msg) {
    const copia = Object.assign({}, msg, { hora: 'Enviando...' });
    cajaMensajes.appendChild(nodoMensaje(copia, 'mensaje pendiente'));
  });

  if (debeBajar) cajaMensajes.scrollTop = cajaMensajes.scrollHeight;
}

function nodoMensaje(msg, clase) {
  const div = document.createElement('div');
  div.className = clase;
  div.innerHTML =
    '<div class="usuario">' + escapeHtml(msg.nombre || 'Anonimo') + ' <span class="hora">' + escapeHtml(msg.hora || '') + '</span></div>' +
    '<div class="texto">' + escapeHtml(msg.texto || '') + '</div>';
  return div;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}

/* ---------- Sondeo ---------- */

let fallosSeguidos = 0;
let timerPoll = null;

function proximoIntervalo() {
  const backoff = Math.min(POLL_BASE_MS * Math.pow(2, fallosSeguidos), POLL_MAX_MS);
  return backoff + Math.random() * POLL_JITTER_MS;
}

async function pedirDatos() {
  if (document.hidden) return;
  reintentarRegistro();
  const res = await apiCall('getDatos');
  fallosSeguidos = (res && !res.error) ? 0 : Math.min(fallosSeguidos + 1, 3);
}

function programarPoll() {
  if (timerPoll) clearTimeout(timerPoll);
  timerPoll = setTimeout(async function () {
    await pedirDatos();
    programarPoll();
  }, proximoIntervalo());
}

function iniciarChat() {
  renderMensajes();
  pedirDatos();
  programarPoll();
}

document.addEventListener('visibilitychange', function () {
  if (!document.hidden) pedirDatos();
});

/* ---------- Envio ---------- */

function enviar() {
  const texto = inputMensaje.value.trim();
  if (!texto) return;
  inputMensaje.value = '';

  const cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  mensajesPendientes.push({ cid: cid, nombre: usuarioActual, texto: texto });
  renderMensajes();

  apiCall('guardarMensaje', { cid: cid, nombre: usuarioActual, texto: texto })
    .then(function () { pedirDatos(); });
}

function enviarReaccion(emoji) {
  crearEmojiFlotante(emoji);
  apiCall('guardarReaccion', { emoji: emoji });
}

function crearEmojiFlotante(emoji) {
  const el = document.createElement('div');
  el.className = 'floating-emoji';
  el.innerText = emoji;
  el.style.transform = 'translateX(' + (Math.random() * 80 - 40) + 'px)';
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, 2500);
}

inputMensaje.addEventListener('keypress', function (event) {
  if (event.key === 'Enter') { event.preventDefault(); enviar(); }
});

/* ---------- Registro pendiente ---------- */

let reintentandoRegistro = false;

async function reintentarRegistro() {
  if (reintentandoRegistro) return;

  let pendiente;
  try {
    pendiente = JSON.parse(localStorage.getItem('registroPendiente') || 'null');
  } catch (e) { return; }
  if (!pendiente) return;

  reintentandoRegistro = true;
  const res = await apiCall('guardarRegistro', pendiente);
  if (res && !res.error && res.success !== false) {
    localStorage.removeItem('registroPendiente');
  }
  reintentandoRegistro = false;
}
