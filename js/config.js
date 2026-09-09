/* ===========================================================
   CONFIG — endpoint del backend, estado global y helper de API
   =========================================================== */

// URL del endpoint (Google Apps Script) para guardar información y administrar el chat
const API_URL = "https://script.google.com/macros/s/AKfycbxYtUZ_idI5eAPMTM4mdQqfMbc8Mfc5pI0hBO6xU4sifzBUR8knoK4mTvJDy6YaUvTN/exec";

// ---- Control de horario de inicio de la transmisión ----
// El video debe empezar a mostrarse 10 min antes de la hora "oficial" del evento
// (por el intro de 10 min). Aquí siempre se usa la hora de COLOMBIA (UTC-5, sin
// horario de verano, así que el offset -05:00 es válido todo el año).
//
// PRUEBA ACTUAL: hoy a las 6:30 PM hora Colombia.
// Para el evento real, cambia esta línea a la fecha del evento y la hora en que
// debe EMPEZAR A CARGAR EL VIDEO (10 min antes de la hora "oficial" mostrada al público).
// Ejemplo evento real (si el evento inicia 10:00 AM COL): "2026-09-15T09:50:00-05:00"
const EVENT_START_TIME = new Date("2026-09-09T16:31:00-05:00");

// URL de embed de Vimeo que se carga cuando llega la hora
const VIMEO_EMBED_URL = "https://vimeo.com/event/6177107/embed?autoplay=1";

// Tiempo máximo (ms) que se espera al backend antes de mostrar error en vez de
// quedarse "pegado" indefinidamente en el botón de conexión
const API_TIMEOUT_MS = 12000;

let usuarioActual = "";
let correoActual = ""; // Guarda el correo para gestionar métricas de salida
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
      console.error("Tiempo de espera agotado al contactar el backend.");
      return { error: "El servidor está tardando demasiado en responder. Verifica tu conexión e intenta de nuevo." };
    }

    console.error("Error en la API:", error);
    return { error: "No se pudo conectar con el servidor. Intenta de nuevo." };
  }
}
