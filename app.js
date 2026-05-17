/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (VERSIÓN OPERATIVA COMPLETA)
   Control de interfaz de usuario, navegación por pestañas y API.
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzyd3Q3EqS2r8vh1IFE8l_98CTmxsgm7svb5wWzGOmH4TcyaC1bGlmanAG6KbV9IN8dCw/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

let currentUser = null;
let allPatients  = [];

// ── Inicialización General del Sistema ──────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Asegurar estados visuales limpios
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");
  if (loginScreen) loginScreen.style.setProperty("display", "flex", "important");
  if (dashboardScreen) dashboardScreen.style.display = "none";

  // Captura y lógica del visualizador de contraseña (Ojito)
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
          <line x1="1" y1="1" x2="23" y2="23"></line>`;
      } else {
        passwordInput.type = "password";
        eyeIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>`;
      }
    });
  }

  // Escucha del cálculo del IMC automático
  document.getElementById("svPeso")?.addEventListener("input", calcIMC);
  document.getElementById("svTalla")?.addEventListener("input", calcIMC);

  // Intentar cargar sesión activa existente
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (err) {
    sessionStorage.removeItem("asenorte_user");
  }

  // Escuchadores de eventos globales para formularios
  document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
  document.getElementById("hcForm")?.addEventListener("submit", handleGuardarHistoria);
});

// ── Procesar Inicio de Sesión (Chrome / Edge Fix) ─────────────────
async function handleLogin(e) {
  e.preventDefault();
  const userIn = document.getElementById("username")?.value.trim();
  const passIn = document.getElementById("password")?.value.trim();
  const btn    = document.getElementById("btnLogin");
  const errEl  = document.getElementById("loginError");

  if (errEl) hide(errEl);
  if (!userIn || !passIn) {
    if (errEl) showError(errEl, "Por favor digite sus credenciales completas.");
    return;
  }

  if (btn) setLoading(btn, true, "Iniciar Sesión");

  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "login", usuario: userIn, password: passIn })
    });

    if (!response.ok) throw new Error("Error en la respuesta del servidor web.");
    const res = await response.json();

    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      if (errEl) showError(errEl, res.message || "Usuario o contraseña inválidos.");
    }
  } catch (error) {
    console.error(error);
    if (errEl) showError(errEl, "Error de red o conexión bloqueada en este navegador.");
  } finaly {
    if (btn) setLoading(btn, false, "Iniciar Sesión");
  }
}

// ── Apertura y Renderizado Completo del Dashboard ─────────────────
function openDashboard() {
  const loginScreen = document.getElementById("loginScreen");
  const dashboardScreen = document.getElementById("dashboardScreen");

  if (loginScreen) { loginScreen.style.display = "none"; loginScreen.classList.remove("active"); }
  if (dashboardScreen) { dashboardScreen.style.display = "block"; dashboardScreen.classList.add("active"); }

  // Pintar datos del usuario autenticado
  const userLabel = document.getElementById("userLabel");
  const avatarEl = document.querySelector(".avatar");
  if (userLabel && currentUser) userLabel.textContent = currentUser.nombre;
  if (avatarEl && currentUser) avatarEl.textContent = getInitials(currentUser.nombre);

  // Inicializar navegación interna y cargar historias
  switchTab("registrar");
  fetchHistorias();
}

// ── Navegación entre Pestañas Internas ────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(panel => panel.classList.remove("active"));
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(btn => btn.classList.remove("active"));

  const targetPanel = document.getElementById(`tab-${tabId}`);
  if (targetPanel) targetPanel.classList.add("active");

  document.querySelectorAll(`[onclick="switchTab('${tabId}')"]`).forEach(btn => btn.classList.add("active"));
}

// ── Traer Historias Clínicas desde Google Sheets ─────────────────
async function fetchHistorias() {
  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "getHistorias" })
    });
    const res = await response.json();
    if (res.success) {
      allPatients = res.historias;
      renderPatients(allPatients);
    }
  } catch (err) {
    console.error("Error al cargar pacientes:", err);
  }
}

// Renderizar Tarjetas de Pacientes en la pestaña "Buscar"
function renderPatients(list) {
  const container = document.getElementById("searchResults");
  const empty = document.getElementById("searchEmpty");
  if (!container) return;

  container.innerHTML = "";
  if (list.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "patient-card";
    card.innerHTML = `
      <div class="patient-card-header">
        <h3>${sanitize(p.nombre)}</h3>
        <span class="patient-id">ID: ${sanitize(p.identificacion)}</span>
      </div>
      <div class="patient-card-body">
        <p><strong>DX:</strong> ${sanitize(p.diagnostico || "Sin diagnóstico")}</p>
        <p><strong>Motivo:</strong> ${sanitize(p.motivo || "No especificado")}</p>
        <div class="patient-meta">
          <span>${formatDate(p.fecha)}</span>
          <span>Por: ${sanitize(p.registradoPor)}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Buscador en tiempo real
function searchPatients() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  if (!query) {
    renderPatients(allPatients);
    return;
  }
  const filtered = allPatients.filter(p => 
    String(p.nombre).toLowerCase().includes(query) ||
    String(p.identificacion).toLowerCase().includes(query) ||
    String(p.diagnostico).toLowerCase().includes(query)
  );
  renderPatients(filtered);
}

// ── Guardar Nueva Historia Clínica ───────────────────────────────
async function handleGuardarHistoria(e) {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector("button[type='submit']");
  
  const bodyData = {
    fecha: new Date().toISOString(),
    registradoPor: currentUser ? currentUser.usuario : "Anónimo",
    nombre: document.getElementById("hcNombre").value.trim(),
    identificacion: document.getElementById("hcIdentificacion").value.trim(),
    fechaNacimiento: document.getElementById("hcFechaNac").value,
    sexo: document.getElementById("hcSexo").value,
    grupoSanguineo: document.getElementById("hcRh").value,
    direccion: document.getElementById("hcDireccion").value.trim(),
    telefono: document.getElementById("hcTelefono").value.trim(),
    eps: document.getElementById("hcEps").value.trim(),
    motivo: document.getElementById("hcMotivo").value.trim(),
    enfermedadActual: document.getElementById("hcEnfermedad").value.trim(),
    antPersonales: document.getElementById("hcAntPers").value.trim(),
    antFamiliares: document.getElementById("hcAntFam").value.trim(),
    alergias: document.getElementById("hcAlergias").value.trim(),
    temperatura: document.getElementById("svTemp").value,
    frecCardiaca: document.getElementById("svFc").value,
    frecResp: document.getElementById("svFr").value,
    presionArterial: document.getElementById("svPa").value,
    spo2: document.getElementById("svSpo2").value,
    peso: document.getElementById("svPeso").value,
    talla: document.getElementById("svTalla").value,
    glucemia: document.getElementById("svGlucemia").value,
    imc: document.getElementById("svImc").value,
    examenFisico: document.getElementById("hcExamen").value.trim(),
    diagnostico: document.getElementById("hcDiagnostico").value.trim(),
    plan: document.getElementById("hcPlan").value.trim(),
    observaciones: document.getElementById("hcObs").value.trim()
  };

  if (btn) setLoading(btn, true, "");

  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "guardarHistoria", body: bodyData })
    });
    const res = await response.json();
    if (res.success) {
      showToast("✅ Historia clínica almacenada correctamente.");
      form.reset();
      fetchHistorias();
      switchTab("buscar");
    } else {
      showToast("❌ Error: " + res.message);
    }
  } catch (err) {
    showToast("❌ Error de red al intentar guardar.");
  } finally {
    if (btn) setLoading(btn, false, "Guardar Registro");
  }
}

// ── Utilidades de Soporte e IMC ──────────────────────────────────
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

function logout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  window.location.reload();
}

function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }
function showError(el, msg) { if (el) { el.textContent = msg; show(el); } }
function sanitize(str) { const d = document.createElement("div"); d.textContent = String(str ?? ""); return d.innerHTML; }
function getInitials(n) { return n.split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase() || "?"; }
function formatDate(iso) { if (!iso) return "—"; try { return new Date(iso).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }); } catch { return String(iso); } }

function setLoading(btn, loading, htmlText) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? `<div class="spinner"></div> <span>Cargando...</span>` : `<span>${htmlText || "Guardar Registro"}</span>`;
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  show(toast);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => hide(toast), 3500);
}
