/* ===========================================================
   CONFIG — endpoint del backend, estado global y helper de API
   =========================================================== */

// URL del endpoint (Google Apps Script) para guardar información y administrar el chat
const API_URL = "https://script.google.com/macros/s/AKfycbxYtUZ_idI5eAPMTM4mdQqfMbc8Mfc5pI0hBO6xU4sifzBUR8knoK4mTvJDy6YaUvTN/exec";

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
