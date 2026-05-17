/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (VERSIÓN FINAL DE ACCESO FIJO)
   Maneja login, lectura y escritura en Google Sheets sin bloqueos.
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycby5BdMcZftZCysNbYpy9YsHNDheNdfljirEttTk7JPRmpaEJIxlCjheqSOpOeuonZaXJA/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

let currentUser = null;
let allPatients  = [];

// ── Inicialización Única del Sistema ──────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");
  
  if (loginScreen) loginScreen.style.setProperty("display", "flex", "important");
  if (dashboardScreen) dashboardScreen.style.display = "none";

  // Control de visibilidad de contraseña (Ojito)
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

  // Auto-recuperar sesión académica activa
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (err) {
    sessionStorage.removeItem("asenorte_user");
  }

  // Escuchador de Envío de Formulario de Entrada
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
});

// ── PROCESAMIENTO E INGRESO AL SISTEMA ─────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  
  const userIn = document.getElementById("username")?.value.trim();
  const passIn = document.getElementById("password")?.value.trim();
  const btn    = document.getElementById("btnLogin");
  const errEl  = document.getElementById("loginError");

  if (errEl) hide(errEl);

  if (!userIn || !passIn) {
    if (errEl) showError(errEl, "Por favor, digite su usuario y contraseña.");
    return;
  }

  if (btn) setLoading(btn, true, "Iniciar Sesión");

  try {
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

    if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
    
    const res = await response.json();

    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      if (errEl) showError(errEl, res.message || "Usuario o contraseña inválidos.");
    }
  } catch (error) {
    console.error("Error detectado:", error);
    if (errEl) showError(errEl, "Error de enlace: Verifica las columnas de tu Google Sheet o publica una nueva versión del Script.");
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
