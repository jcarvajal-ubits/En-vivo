/* ===========================================================
   LIVE — reproductor de video, chat en vivo y reacciones
   =========================================================== */

const cajaMensajes = document.getElementById('cajaMensajes');
const inputMensaje = document.getElementById('inputMensaje');

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
