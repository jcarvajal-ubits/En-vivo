/* ===========================================================
   CONFIG — endpoint del backend, estado global y helper de API
   =========================================================== */

// URL del endpoint (Google Apps Script) para guardar información y administrar el chat
const API_URL = "https://script.google.com/macros/s/AKfycbxYtUZ_idI5eAPMTM4mdQqfMbc8Mfc5pI0hBO6xU4sifzBUR8knoK4mTvJDy6YaUvTN/exec";

// ===========================================================
// Hora en la que el VIDEO debe empezar a mostrarse (no la hora del evento).
// Colombia es UTC-5 todo el año (no tiene horario de verano), por eso
// el offset "-05:00" se deja fijo.
//
// PRUEBA ACTUAL: 7 de septiembre de 2026, 6:30 PM hora Colombia.
//
// Para el evento real, recuerda que el video debe arrancar 10 minutos
// ANTES de la hora anunciada (por el intro de 10 min). Ejemplo: si el
// evento es a las 10:00 AM hora Colombia, aquí debes poner "09:50:00".
// Solo cambia la fecha y la hora de la siguiente línea:
const EVENT_START_TIME = new Date("2026-09-07T18:30:00-05:00");

// Enlace de embed de Vimeo que se inyecta en el reproductor
const VIMEO_EMBED_URL = "https://vimeo.com/event/6043961/embed?autoplay=1";

// ---- Control de horario de inicio de la transmisión ----
// El video debe empezar a mostrarse 10 min antes de la hora "oficial" del evento
// (por el intro de 10 min). Aquí siempre se usa la hora de COLOMBIA (UTC-5, sin
// horario de verano, así que el offset -05:00 es válido todo el año).
//
// PRUEBA ACTUAL: hoy a las 6:30 PM hora Colombia.
// Para el evento real, cambia esta línea a la fecha del evento y la hora en que
// debe EMPEZAR A CARGAR EL VIDEO (10 min antes de la hora "oficial" mostrada al público).
// Ejemplo evento real (si el evento inicia 10:00 AM COL): "2026-09-15T09:50:00-05:00"
const EVENT_START_TIME = new Date("2026-09-07T18:30:00-05:00");

// URL de embed de Vimeo que se carga cuando llega la hora
const VIMEO_EMBED_URL = "https://vimeo.com/event/6043961/embed?autoplay=1";

let usuarioActual = "";
let correoActual = ""; // Guarda el correo para gestionar métricas de salida
let isChatOpen = false;
let emojisAnimados = [];

async function apiCall(action, data = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, ...data })
    });
    const result = await response.json();
    if (result.error) console.error("Error del backend:", result.error);
    if (result.data) procesarDatos(result.data);
    return result;
  } catch (error) {
    console.error("Error en la API:", error);
    return { error: error.toString() };
  }
}
