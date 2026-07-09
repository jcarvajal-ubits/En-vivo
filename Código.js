const SHEET_ID = '1OFc84Jz2CrGOvOYzQM2kNTR8qyJnLpHxpxLNmd3vVhU';

// Esta función recibe las peticiones desde tu frontend
function doPost(e) {
  let result = {};

  try {
    // Validación por si llega una petición vacía
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibieron datos en el body");
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'guardarRegistro') {
      result.success = guardarRegistro(body.nombre, body.correo, body.empresa);
    } else if (action === 'guardarMensaje') {
      result.data = guardarMensaje(body.nombre, body.texto);
    } else if (action === 'guardarReaccion') {
      result.data = guardarReaccion(body.emoji);
    } else if (action === 'getDatos') {
      result.data = getDatos();
    } else {
      throw new Error("Acción no reconocida: " + action);
    }
  } catch (error) {
    result.error = error.toString();
  }

  // Devolvemos una respuesta JSON al frontend
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Guarda datos del Lobby con LockService para evitar choques
function guardarRegistro(nombre, correo, empresa) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // Espera hasta 10 segundos si otra persona está registrándose
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    // Busca "Hoja 1", si no la encuentra usa la primera hoja disponible
    let sheet = ss.getSheetByName('Hoja 1') || ss.getSheets()[0];
    sheet.appendRow([new Date(), nombre, correo, empresa]);
    SpreadsheetApp.flush(); 
    return true; 
  } catch (e) {
    throw new Error("Error en guardarRegistro: " + e.toString());
  } finally {
    lock.releaseLock();
  }
}

// Guarda mensajes con LockService
function guardarMensaje(nombre, texto) {
  if (!nombre || !texto) return getDatos(); 
  
  const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date().toLocaleDateString();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000); 
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sheetPreguntas = ss.getSheetByName('Preguntas');
    
    if (!sheetPreguntas) {
      sheetPreguntas = ss.insertSheet('Preguntas');
      sheetPreguntas.appendRow(['Fecha', 'Hora', 'Usuario', 'Pregunta']);
      sheetPreguntas.getRange("A1:D1").setFontWeight("bold");
    }
    
    sheetPreguntas.appendRow([fecha, hora, nombre, texto]);
    SpreadsheetApp.flush(); 
  } catch(e) {
    Logger.log("Error guardando en sheet Preguntas: " + e);
  } finally {
    lock.releaseLock();
  }

  const props = PropertiesService.getScriptProperties();
  let chatData = props.getProperty('CHAT_GLOBAL');
  let chat = chatData ? JSON.parse(chatData) : [];
  
  chat.push({ hora: hora, nombre: nombre, texto: texto });
  if (chat.length > 50) chat.shift();
  
  props.setProperty('CHAT_GLOBAL', JSON.stringify(chat));
  props.setProperty('CACHE_TIME', '0'); 

  return getDatos();
}

// Sincroniza reacciones
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

// Función maestra
function getDatos() {
  const props = PropertiesService.getScriptProperties();
  const now = new Date().getTime();
  let cacheTime = parseInt(props.getProperty('CACHE_TIME') || '0');
  let chat = [];
  
  if (now - cacheTime > 3000) {
    try {
      const ss = SpreadsheetApp.openById(SHEET_ID);
      const sheetPreguntas = ss.getSheetByName('Preguntas');
      
      if (sheetPreguntas) {
        const lastRow = sheetPreguntas.getLastRow();
        if (lastRow > 1) {
          const data = sheetPreguntas.getDataRange().getValues();
          const filasMensajes = data.slice(1);
          const ultimosMensajes = filasMensajes.slice(-50);
          
          chat = ultimosMensajes.map(row => {
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

  let reaccData = props.getProperty('REACCIONES_GLOBAL');
  let reacciones = reaccData ? JSON.parse(reaccData) : [];
  reacciones = reacciones.filter(r => now - r.time < 10000);
  
  return { mensajes: chat, reacciones: reacciones };
}
