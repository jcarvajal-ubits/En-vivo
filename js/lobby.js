/* ===========================================================
   LOBBY — flujo del formulario: paso 1 (registro) y paso 2 (encuesta)
   =========================================================== */

let pasoActivo = 'step1';

// Ajusta la altura del contenedor deslizante al contenido del paso activo,
// para que no quede espacio en blanco cuando un paso es más corto que el otro.
function ajustarAlturaWrapper() {
  const wrapper = document.getElementById('stepWrapper');
  const paso = document.getElementById(pasoActivo);
  if (wrapper && paso) {
    wrapper.style.height = paso.scrollHeight + 'px';
  }
}

window.addEventListener('resize', ajustarAlturaWrapper);

// Recalcula la altura una vez que la tipografía Inter termina de cargar
// (si se mide antes, con la fuente de reemplazo, el resultado puede quedar
// un poco corto y cortar el botón).
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(ajustarAlturaWrapper);
}
window.addEventListener('load', ajustarAlturaWrapper);

// Despliegue condicional de los campos adicionales de los formularios
document.querySelectorAll('input[name="q1"]').forEach(r => r.addEventListener('change', (e) => {
  const inputOtra = document.getElementById('inputOtraArea');
  if (e.target.value === 'Otra') {
    inputOtra.style.display = 'block'; inputOtra.required = true; inputOtra.focus();
  } else {
    inputOtra.style.display = 'none'; inputOtra.required = false; inputOtra.value = '';
  }
  ajustarAlturaWrapper();
}));

document.querySelectorAll('input[name="q3"]').forEach(r => r.addEventListener('change', (e) => {
  const inputOtra = document.getElementById('inputOtraHerramienta');
  if (e.target.value === 'Otra') {
    inputOtra.style.display = 'block'; inputOtra.required = true; inputOtra.focus();
  } else {
    inputOtra.style.display = 'none'; inputOtra.required = false; inputOtra.value = '';
  }
  ajustarAlturaWrapper();
}));

// Controla la transición de interfaz del primer bloque de datos al segundo
function irPaso2(event) {
  event.preventDefault();

  const nombre = document.getElementById('regNombre').value.trim();
  const correo = document.getElementById('regCorreo').value.trim();
  const empresa = document.getElementById('regEmpresa').value.trim();

  if (!nombre || !correo || !empresa) return;

  usuarioActual = nombre;
  correoActual = correo;

  // Transición animada de pantalla
  document.getElementById('stepContainer').style.transform = 'translateX(-50%)';
  document.getElementById('step1').style.opacity = '0';
  document.getElementById('step1').style.pointerEvents = 'none';
  document.getElementById('step2').style.opacity = '1';
  document.getElementById('step2').style.pointerEvents = 'auto';
  pasoActivo = 'step2';
  ajustarAlturaWrapper();
}

// Gestiona la unificación, empaquetado y envío de toda la data del registro al finalizar
async function finalizarRegistro(event) {
  event.preventDefault();

  // Recolección de variables del bloque inicial
  const nombre = document.getElementById('regNombre').value.trim();
  const correo = document.getElementById('regCorreo').value.trim();
  const empresa = document.getElementById('regEmpresa').value.trim();

  // Recolección de variables del bloque secundario
  let q1 = document.querySelector('input[name="q1"]:checked')?.value;
  let q2 = document.querySelector('input[name="q2"]:checked')?.value;
  let q3 = document.querySelector('input[name="q3"]:checked')?.value;

  if (q1 === 'Otra') q1 = document.getElementById('inputOtraArea').value.trim();
  if (q3 === 'Otra') q3 = document.getElementById('inputOtraHerramienta').value.trim();

  const btn = document.getElementById('btnEntrarFinal');
  const errorEl = document.getElementById('formError');

  if (!q1 || !q2 || !q3) {
    errorEl.innerText = "Por favor responde todas las preguntas para continuar.";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width: 18px; height: 18px; border-width: 2px; margin-bottom: 0;"></div> Conectando...`;
  errorEl.innerText = "";

  // Generación del objeto global para transmisión
  const payload = {
    nombre,
    correo,
    empresa,
    q1_area: q1,
    q2_uso_ia: q2,
    q3_herramienta: q3
  };

  console.log("Enviando todo a Google:", payload);

  // Ejecución hacia el backend
  const result = await apiCall('guardarRegistro', payload);

  if (!result || result.error || result.success === false) {
    errorEl.innerText = "Error: " + (result?.error || "Ocurrió un problema de red.");
    btn.disabled = false;
    btn.innerHTML = "Entrar al Live 🚀";
    return;
  }

  // Animación de salida de la pantalla de lobby
  document.getElementById('lobby-screen').style.opacity = '0';

  // Muestra el video si ya es la hora, o la cuenta regresiva si aún no llega
  iniciarTransmision();

  setTimeout(() => {
    document.getElementById('lobby-screen').style.display = 'none';
    iniciarChat();
    if (window.innerWidth > 768) {
      setTimeout(toggleChat, 1000);
    }
  }, 600);
}

// Altura inicial del wrapper (paso 1 activo por defecto)
ajustarAlturaWrapper();
