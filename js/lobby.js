/* ===========================================================
   LOBBY — registro (paso único, sin encuesta)
   =========================================================== */

async function finalizarRegistro(event) {
  event.preventDefault();

  const nombre = document.getElementById('regNombre').value.trim();
  const correo = document.getElementById('regCorreo').value.trim();
  const empresa = document.getElementById('regEmpresa').value.trim();
  const btn = document.getElementById('btnEntrarFinal');
  const errorEl = document.getElementById('formError');

  if (!nombre || !correo || !empresa) return;

  usuarioActual = nombre;
  correoActual = correo;

  btn.disabled = true;
  btn.classList.add('cargando');
  btn.innerHTML = `<span class="spinner btn-spinner"></span> Conectando...`;
  errorEl.innerText = "";

  // regId: mismo id en cada intento de esta persona, así el backend
  // descarta reintentos duplicados en vez de contarlos como otra entrada.
  const datos = { nombre, correo, empresa, regId: idSesion() };
  const result = await apiCall('guardarRegistro', datos);

  // Un solo intento acá, para no hacer esperar el doble a la persona.
  // Si falla, NO se queda afuera: entra al live y el registro se reintenta
  // solo en segundo plano (con el mismo regId, así que sigue sin duplicar).
  if (!result || result.error || result.success === false) {
    try { localStorage.setItem('registroPendiente', JSON.stringify(datos)); } catch (e) {}
    console.warn('Registro diferido:', result?.error);
  }

  // Salida del lobby hacia la pantalla del live
  document.getElementById('lobby-screen').style.opacity = '0';
  iniciarTransmision();

  setTimeout(() => {
    document.getElementById('lobby-screen').style.display = 'none';
    iniciarChat();
    if (window.innerWidth > 768) setTimeout(toggleChat, 1000);
  }, 600);
}
