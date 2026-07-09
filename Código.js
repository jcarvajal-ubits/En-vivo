const SHEET_ID = '1OFc84Jz2CrGOvOYzQM2kNTR8qyJnLpHxpxLNmd3vVhU';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('UBITS Live Stream');
}

// Guarda datos del Lobby
function guardarRegistro(nombre, correo, empresa) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
    sheet.appendRow([new Date(), nombre, correo, empresa]);
    return true; 
  } catch (e) {
    return false; 
  }
}

// Guarda mensajes directamente en el Sheet "Preguntas" y actualiza la vista rápida
function guardarMensaje(nombre, texto) {
  if (!nombre || !texto) return getDatos(); 
  
  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date().toLocaleDateString();

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheetPreguntas = ss.getSheetByName('Preguntas');
    
    if (!sheetPreguntas) {
      sheetPreguntas = ss.insertSheet('Preguntas');
      sheetPreguntas.appendRow(['Fecha', 'Hora', 'Usuario', 'Pregunta']);
      sheetPreguntas.getRange("A1:D1").setFontWeight("bold");
    }
    
    sheetPreguntas.appendRow([fecha, hora, nombre, texto]);
    SpreadsheetApp.flush(); // Fuerza la escritura inmediata
    
  } catch(e) {
    Logger.log("Error guardando en sheet Preguntas: " + e);
  }

  // Guardamos en las propiedades del script para asegurar actualización instantánea local
  const props = PropertiesService.getScriptProperties();
  let chatData = props.getProperty('CHAT_GLOBAL');
  let chat = chatData ? JSON.parse(chatData) : [];
  
  chat.push({ hora: hora, nombre: nombre, texto: texto });
  if (chat.length > 50) chat.shift();
  
  props.setProperty('CHAT_GLOBAL', JSON.stringify(chat));
  props.setProperty('CACHE_TIME', '0'); // Rompe el caché para forzar sincronización técnica

  return getDatos();
}

// Sincroniza reacciones de emojis
function guardarReaccion(emoji) {
  const props = PropertiesService.getScriptProperties();
  let reaccData = props.getProperty('REACCIONES_GLOBAL');
  let reacciones = reaccData ? JSON.parse(reaccData) : [];
  
  reacciones.push({
    id: Math.random().toString(36).substr(2, 9),
    emoji: emoji,
    time: new Date().getTime()
  });
  
  const now = new Date().getTime();
  reacciones = reacciones.filter(r => now - r.time < 10000);
  
  props.setProperty('REACCIONES_GLOBAL', JSON.stringify(reacciones));
  return getDatos();
}

// Función maestra optimizada para lectura libre de bloqueos en iframes
function getDatos() {
  const props = PropertiesService.getScriptProperties();
  const now = new Date().getTime();
  let cacheTime = parseInt(props.getProperty('CACHE_TIME') || '0');
  let chat = [];
  
  // Sincronización robusta con Google Sheets cada 3 segundos
  if (now - cacheTime > 3000) {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheetPreguntas = ss.getSheetByName('Preguntas');
      
      if (sheetPreguntas) {
        const lastRow = sheetPreguntas.getLastRow();
        if (lastRow > 1) {
          // Cargamos los datos de manera directa usandogetDataRange() para saltar bloqueos de seguridad del iframe
          const data = sheetPreguntas.getDataRange().getValues();
          
          // Filtramos las últimas 50 filas excluyendo el encabezado de forma segura
          const filasMensajes = data.slice(1); // Quita la fila 1 (encabezados)
          const ultimosMensajes = filasMensajes.slice(-50); // Agarra los últimos 50
          
          chat = ultimosMensajes.map(row => {
            // Aseguramos que la hora mantenga el formato string correcto al leerse
            let horaFormateada = row[1];
            if (horaFormateada instanceof Date) {
              horaFormateada = horaFormateada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return { hora: String(horaFormateada), nombre: String(row[2]), texto: String(row[3]) };
          });
          
          props.setProperty('CHAT_GLOBAL', JSON.stringify(chat));
          props.setProperty('CACHE_TIME', now.toString());
        } else {
          props.setProperty('CHAT_GLOBAL', JSON.stringify([]));
          props.setProperty('CACHE_TIME', now.toString());
        }
      }
    } catch (e) {
      let chatData = props.getProperty('CHAT_GLOBAL');
      chat = chatData ? JSON.parse(chatData) : [];
    }
  } else {
    let chatData = props.getProperty('CHAT_GLOBAL');
    chat = chatData ? JSON.parse(chatData) : [];
  }

  // Leer reacciones de emojis
  let reaccData = props.getProperty('REACCIONES_GLOBAL');
  let reacciones = reaccData ? JSON.parse(reaccData) : [];
  reacciones = reacciones.filter(r => now - r.time < 10000);
  
  return { mensajes: chat, reacciones: reacciones };
}
