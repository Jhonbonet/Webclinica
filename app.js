/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (VERSION INTEGRAL SINCRO-FIJA)
   Maneja la autenticación sin bloqueos y renderizado fluido.
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwhx5kaU0e-5zDYQM3D3oOeqcYKpsQIP6eSMrgZjuBikyP69fuMuQck0SqROBwpnLRw4g/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

let currentUser = null;
let allPatients  = [];

window.addEventListener("DOMContentLoaded", () => {
  // Asegurar visibilidad correcta de pantallas al inicio
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");
  
  if (loginScreen) loginScreen.style.setProperty("display", "flex", "important");
  if (dashboardScreen) dashboardScreen.style.display = "none";

  // Control dinámico del ojo de contraseña
  const btnTogglePassword = document.getElementById("btnTogglePassword");
  const passwordInput = document.getElementById("password");
  const eyeIcon = document.getElementById("eyeIcon");

  if (btnTogglePassword && passwordInput && eyeIcon) {
    btnTogglePassword.addEventListener("click", (e) => {
      e.preventDefault();
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        eyeIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
      } else {
        passwordInput.type = "password";
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
      }
    });
  }

  // Cargar sesión guardada si existe
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (err) {
    sessionStorage.removeItem("asenorte_user");
  }

  // Enlazar formularios
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
});

// ── PROCESAMIENTO DE LOGIN FIJO ──
async function handleLogin(e) {
  e.preventDefault();
  
  const userIn = document.getElementById("username")?.value.trim();
  const passIn = document.getElementById("password")?.value.trim();
  const btn    = document.getElementById("btnLogin");
  const errEl  = document.getElementById("loginError");

  if (errEl) hide(errEl);

  if (!userIn || !passIn) {
    if (errEl) showError(errEl, "Completa todos los campos obligatorios.");
    return;
  }

  if (btn) setLoading(btn, true, "Iniciar Sesión");

  try {
    // Envío seguro optimizado para Apps Script sin disparar CORS preflight restrictivo
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "login",
        usuario: userIn,
        password: passIn
      })
    });

    if (!response.ok) throw new Error(`HTTP Código: ${response.status}`);
    const res = await response.json();

    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      if (errEl) showError(errEl, res.message || "Credenciales incorrectas.");
    }
  } catch (error) {
    console.error("Detalle Error Acceso:", error);
    if (errEl) showError(errEl, "Error de red o denegación de acceso desde el servidor.");
  } finally {
    if (btn) setLoading(btn, false, "Iniciar Sesión");
  }
}

function openDashboard() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");

  if (loginScreen) { loginScreen.style.display = "none"; loginScreen.classList.remove("active"); }
  if (dashboardScreen) { dashboardScreen.style.display = "block"; dashboardScreen.classList.add("active"); }

  const userLabel = document.getElementById("userLabel");
  if (userLabel && currentUser) userLabel.textContent = currentUser.nombre;
}

function logout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  window.location.reload();
}

function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }
function showError(el, msg) { if (el) { el.textContent = msg; show(el); } }

function setLoading(btn, loading, html) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading 
    ? `<div class="spinner"></div> <span style="margin-left:8px;">Cargando...</span>` 
    : `<span>${html}</span>`;
}
