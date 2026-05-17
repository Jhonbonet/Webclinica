/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (SISTEMA DE CONTROL DE ACCESO FIJO)
   Maneja login, navegación y enlace directo a Google Sheets.
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwmAIpiYi3EfTyYfZCoaQzsU_-LLsoDK1U9x2iv72E_KZN3SzI_VyDZs1Z2VrCTS5m4HQ/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

let currentUser = null;
let allPatients  = [];

// ── Inicialización Segura del DOM ─────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");

  // Forzar estados visuales correctos al arrancar
  if (loginScreen) loginScreen.style.setProperty("display", "flex", "important");
  if (dashboardScreen) dashboardScreen.style.display = "none";

  // Lógica del selector de visibilidad de contraseña (Ojito)
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

  // Vincular eventos de IMC con protección contra nulos (Evita bloqueos en Chrome/Edge)
  document.getElementById("svPeso")?.addEventListener("input", calcIMC);
  document.getElementById("svTalla")?.addEventListener("input", calcIMC);

  // Intentar recuperar sesión académica previa
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (err) {
    sessionStorage.removeItem("asenorte_user");
  }

  // Escuchar el envío del formulario de acceso de forma segura
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
});

// ── Procesamiento de Autenticación con Google Apps Script ──────────
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

  // Bloquear botón para evitar múltiples clics concurrentes
  if (btn) setLoading(btn, true, "Iniciar Sesión");

  try {
    // Petición optimizada sin cabeceras restrictivas para evadir bloqueos CORS de Edge/Chrome
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

    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const res = await response.json();

    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      if (errEl) showError(errEl, res.message || "Credenciales incorrectas.");
    }
  } catch (error) {
    console.error("Error de enlace:", error);
    if (errEl) showError(errEl, "No se pudo conectar con el servidor. Verifica las columnas de tu Sheet o limpia la caché.");
  } finally {
    if (btn) setLoading(btn, false, "Iniciar Sesión");
  }
}

// ── Activación y Despliegue de la Interfaz del Dashboard ───────────
function openDashboard() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");

  if (loginScreen) { loginScreen.style.display = "none"; loginScreen.classList.remove("active"); }
  if (dashboardScreen) { dashboardScreen.style.display = "block"; dashboardScreen.classList.add("active"); }

  // Cargar datos en los elementos de perfil si existen en el HTML
  const userLabel = document.getElementById("userLabel");
  const avatarEl = document.querySelector(".avatar");
  
  if (userLabel && currentUser) userLabel.textContent = currentUser.nombre;
  if (avatarEl && currentUser) avatarEl.textContent = getInitials(currentUser.nombre);

  // Configurar pestaña inicial del entorno clínico
  switchTab("registrar");
}

// ── Conmutador de Pestañas (Registrar / Buscar) ────────────────────
function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(btn => btn.classList.remove("active"));

  const targetPanel = document.getElementById(`tab-${tabId}`);
  if (targetPanel) targetPanel.classList.add("active");

  document.querySelectorAll(`[onclick="switchTab('${tabId}')"]`).forEach(btn => btn.classList.add("active"));
}

// ── Cálculo Automatizado de Masa Corporal (IMC) ───────────────────
function calcIMC() {
  const peso = parseFloat(document.getElementById("svPeso")?.value);
  const tallaCm = parseFloat(document.getElementById("svTalla")?.value);
  const imcInput = document.getElementById("svImc");

  if (peso && tallaCm && imcInput) {
    const tallaM = tallaCm / 100;
    const imc = (peso / (tallaM * tallaM)).toFixed(1);
    imcInput.value = isNaN(imc) ? "" : imc;
  }
}

// ── Salida del Sistema ────────────────────────────────────────────
function logout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  window.location.reload();
}

// ── Funciones de Soporte y Estructura ─────────────────────────────
function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }
function showError(el, msg) { if (el) { el.textContent = msg; show(el); } }
function getInitials(name) { if (!name) return "?"; return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?"; }

function setLoading(btn, loading, htmlText) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading 
    ? `<div class="spinner"></div> <span style="margin-left:8px;">Cargando...</span>` 
    : `<span>${htmlText}</span>`;
}
