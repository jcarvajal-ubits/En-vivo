/* ===========================================================
   CONFIG — endpoint del backend, fechas del evento y helper de API
   Live Chile · Prevención de lavado de activos y financiamiento del terrorismo
   =========================================================== */

// ⚠️ REEMPLAZA esta URL por la del NUEVO Apps Script publicado ("Implementar" -> "Aplicación Web")
const API_URL = "https://script.google.com/a/macros/ubits.co/s/AKfycbzq5qzRtP9cR5o1teTneJZMWDrQKc1iSqtFAgpBUp4S3__Ae6VZirSycL1eoHFflE0N/exec";

// ---- Hora de inicio de la transmisión ----
const EVENT_START_TIME = new Date("2026-09-23T10:00:00-03:00");

// Video del live (evento de Vimeo). 
const VIMEO_EMBED_URL = "https://vimeo.com/event/6177107/embed?autoplay=1";

// Video de 10 seg que se repite en loop sobre el reconteo.
const LOOP_VIDEO_BASE = "https://player.vimeo.com/video/1226034175?autoplay=1&loop=1&autopause=0&badge=0&title=0&byline=0&portrait=0&controls=0";
const LOOP_VIDEO_URL        = LOOP_VIDEO_BASE + "&muted=1";
const LOOP_VIDEO_URL_SONIDO = LOOP_VIDEO_BASE + "&muted=0";

// Tiempo máximo (ms) de espera al backend antes de mostrar error
const API_TIMEOUT_MS = 12000;

// ---- Sondeo del chat ----
const POLL_BASE_MS = 4500;
const POLL_JITTER_MS = 2000;
const POLL_MAX_MS = 25000; // tope cuando hay errores seguidos

let usuarioActual = "";
let correoActual = "";
let isChatOpen = false;
let emojisAnimados = [];

async function apiCall(action, data = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, ...data }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { error: `El servidor respondió con un error (${response.status}). Intenta de nuevo.` };
    }

    const result = await response.json();
    if (result.error) console.error("Error del backend:", result.error);
    if (result.data) procesarDatos(result.data);
    return result;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { error: "El servidor está demorando demasiado. Revisa tu conexión e intenta de nuevo." };
    }

    console.error("Error en la API:", error);
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo." };
  }
}

/* -----------------------------------------------------------
   ID de sesión.
   Se genera uno NUEVO en cada carga de página: así cada visita
   cuenta como una entrada nueva (la columna "Veces que entró"
   sube en cada registro real).
   El backend solo lo usa para descartar reintentos DENTRO de la
   misma visita (por si la red falla y la web reintenta el envío).
   ----------------------------------------------------------- */
function idSesion() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
