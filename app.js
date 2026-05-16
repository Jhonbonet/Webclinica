/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (VERSIÓN FINAL CORREGIDA)
   Maneja login, lectura y escritura en Google Sheets
   vía Google Apps Script Web App (no requiere backend propio)
═══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
// ⚙️ CONFIGURACIÓN (Actualizada con tu nueva URL del Web App)
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwhx5kaU0e-5zDYQM3D3oOeqcYKpsQIP6eSMrgZjuBikyP69fuMuQck0SqROBwpnLRw4g/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

// ─────────────────────────────────────────────────────────────
// 🔐 SESIÓN Y VARIABLES GLOBALES
// ─────────────────────────────────────────────────────────────
let currentUser = null;
let allPatients  = [];

// ── Un único DOMContentLoaded ──────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  // Restaurar sesión si existe
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (e) {
    sessionStorage.removeItem("asenorte_user");
  }

  // Cálculo automático de IMC
  document.getElementById("svPeso").addEventListener("input", calcIMC);
  document.getElementById("svTalla").addEventListener("input", calcIMC);

  // Evento submit del Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Evento submit del Formulario de Historias Clínicas
  const hcForm = document.getElementById("hcForm");
  if (hcForm) {
    hcForm.addEventListener("submit", handleSaveHC);
  }
});

// ─────────────────────────────────────────────────────────────
// 🔑 LÓGICA DE AUTENTICACIÓN (LOGIN)
// ─────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  
  const userIn  = document.getElementById("username").value.trim();
  const passIn  = document.getElementById("password").value.trim();
  const btn     = document.getElementById("btnLogin");
  const errEl   = document.getElementById("loginError");

  hide(errEl);
  if (!userIn || !passIn) {
    showError(errEl, "Por favor complete todos los campos.");
    return;
  }

  setLoading(btn, true, "Iniciar Sesión");

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

    if (!response.ok) {
      throw new Error(`Error de red: ${response.status}`);
    }

    const res = await response.json();

    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      showError(errEl, res.message || "Usuario o contraseña incorrectos.");
    }
  } catch (error) {
    console.error("Error en login:", error);
    showError(errEl, "No se pudo conectar con el servidor. Verifique la URL de Apps Script y su conexión.");
  } finally {
    setLoading(btn, false, "Iniciar Sesión");
  }
}

function logout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  allPatients = [];
  
  // Limpiar campos de login
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  hide(document.getElementById("loginError"));

  hide(document.getElementById("dashboardScreen"));
  show(document.getElementById("loginScreen"));
}

// ─────────────────────────────────────────────────────────────
// 📊 PANEL PRINCIPAL (DASHBOARD) Y NAVEGACIÓN
// ─────────────────────────────────────────────────────────────
function openDashboard() {
  hide(document.getElementById("loginScreen"));
  show(document.getElementById("dashboardScreen"));

  // Actualizar datos de usuario en la interfaz
  document.getElementById("userLabel").textContent = currentUser.nombre;
  document.getElementById("userRol").textContent   = currentUser.rol;
  document.getElementById("avatar").textContent    = getInitials(currentUser.nombre);

  // Mostrar pestañas según rol
  const tabBtnBuscar = document.getElementById("btn-tab-buscar");
  if (currentUser.rol === "Estudiante") {
    switchTab("nueva");
    if (tabBtnBuscar) hide(tabBtnBuscar);
  } else {
    switchTab("buscar");
    if (tabBtnBuscar) show(tabBtnBuscar);
    fetchHistorias();
  }
}

function switchTab(tabId) {
  // Desactivar botones y paneles
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

  // Activar seleccionados
  const btnTop = document.getElementById(`btn-tab-${tabId}`);
  const btnBot = document.getElementById(`btn-bot-${tabId}`);
  const panel  = document.getElementById(`tab-${tabId}`);

  if (btnTop) btnTop.classList.add("active");
  if (btnBot) btnBot.classList.add("active");
  if (panel)  panel.classList.add("active");
}

// ─────────────────────────────────────────────────────────────
// 📝 GESTIÓN DE HISTORIAS CLÍNICAS
// ─────────────────────────────────────────────────────────────
async function handleSaveHC(e) {
  e.preventDefault();
  const btn = document.getElementById("btnGuardar");
  setLoading(btn, true, "Guardar Historia Clínica");

  const formData = {
    fecha: new Date().toISOString(),
    registradoPor: currentUser.usuario,
    nombre: document.getElementById("pNombre").value.trim(),
    identificacion: document.getElementById("pIdentificacion").value.trim(),
    fechaNacimiento: document.getElementById("pFechaNac").value,
    sexo: document.getElementById("pSexo").value,
    grupoSanguineo: document.getElementById("pSangre").value,
    direccion: document.getElementById("pDireccion").value.trim(),
    telefono: document.getElementById("pTelefono").value.trim(),
    eps: document.getElementById("pEps").value.trim(),
    motivo: document.getElementById("pMotivo").value.trim(),
    enfermedadActual: document.getElementById("pEnfermedad").value.trim(),
    antPersonales: document.getElementById("pAntPers").value.trim(),
    antFamiliares: document.getElementById("pAntFam").value.trim(),
    alergias: document.getElementById("pAlergias").value.trim(),
    temperatura: document.getElementById("svTemp").value,
    frecCardiaca: document.getElementById("svFc").value,
    frecResp: document.getElementById("svFr").value,
    presionArterial: document.getElementById("svPa").value.trim(),
    spo2: document.getElementById("svSpo2").value,
    peso: document.getElementById("svPeso").value,
    talla: document.getElementById("svTalla").value,
    glucemia: document.getElementById("svGlucemia").value,
    imc: document.getElementById("svImc").value,
    examenFisico: document.getElementById("pExamen").value.trim(),
    diagnostico: document.getElementById("pDiagnostico").value.trim(),
    plan: document.getElementById("pPlan").value.trim(),
    observaciones: document.getElementById("pObs").value.trim()
  };

  try {
    const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "guardarHistoria",
        body: formData
      })
    });

    const res = await response.json();
    if (res.success) {
      showToast("✅ Historia clínica guardada con éxito.");
      document.getElementById("hcForm").reset();
      document.getElementById("svImc").value = "";
      
      if (currentUser.rol !== "Estudiante") {
        fetchHistorias();
        switchTab("buscar");
      }
    } else {
      alert("Error al guardar: " + res.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error de conexión al guardar la historia clínica.");
  } finally {
    setLoading(btn, false, "Guardar Historia Clínica");
  }
}

async function fetchHistorias() {
  const container = document.getElementById("searchResults");
  const emptyState = document.getElementById("searchEmpty");
  if (!container) return;

  container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem;">
    <div class="spinner" style="margin:0 auto 1rem"></div>
    <p style="color:var(--text-2)">Cargando historias clínicas...</p>
  </div>`;
  hide(emptyState);

  try {
    const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getHistorias`);
    const res = await response.json();
    
    if (res.success) {
      allPatients = res.historias;
      renderPatients(allPatients);
    } else {
      container.innerHTML = `<p class="empty-state">Error al cargar datos: ${res.message}</p>`;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="empty-state">Error de conexión al cargar las historias clínicas.</p>`;
  }
}

function renderPatients(list) {
  const container = document.getElementById("searchResults");
  const emptyState = document.getElementById("searchEmpty");
  container.innerHTML = "";

  if (list.length === 0) {
    show(emptyState);
    return;
  }
  hide(emptyState);

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "patient-card";
    card.innerHTML = `
      <div class="patient-card-header">
        <div>
          <h3>${sanitize(p.nombre)}</h3>
          <p>ID: ${sanitize(p.identificacion)} · ${sanitize(p.sexo)}</p>
        </div>
        <span class="badge-eps">${sanitize(p.eps)}</span>
      </div>
      <div class="patient-card-body">
        <p><strong>Diagnóstico:</strong> ${sanitize(p.diagnostico || "Sin diagnóstico")}</p>
        <p><strong>Atendido por:</strong> ${sanitize(p.registradoPor)}</p>
      </div>
      <div class="patient-card-footer">
        <span>${formatDate(p.fecha)}</span>
        <button class="btn-view" onclick="viewPatientDetail('${p.identificacion}')">Ver Completa</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function searchPatients() {
  const query = document.getElementById("searchInput").value.toLowerCase().trim();
  if (!query) {
    renderPatients(allPatients);
    return;
  }
  const filtered = allPatients.filter(p => 
    String(p.nombre).toLowerCase().includes(query) ||
    String(p.identificacion).includes(query) ||
    String(p.diagnostico).toLowerCase().includes(query) ||
    String(p.eps).toLowerCase().includes(query)
  );
  renderPatients(filtered);
}

function viewPatientDetail(id) {
  const p = allPatients.find(item => item.identificacion == id);
  if (!p) return;

  const body = document.getElementById("modalBody");
  body.innerHTML = `
    <div class="modal-detail-section">
      <h4>1. Datos Personales</h4>
      <table class="detail-table">
        <tr><th>Nombre</th><td>${sanitize(p.nombre)}</td></tr>
        <tr><th>Identificación</th><td>${sanitize(p.identificacion)}</td></tr>
        <tr><th>Fecha Nac.</th><td>${sanitize(p.fechaNacimiento)}</td></tr>
        <tr><th>Sexo / Grupo Sanguíneo</th><td>${sanitize(p.sexo)} / ${sanitize(p.grupoSanguineo)}</td></tr>
        <tr><th>Dirección / Teléfono</th><td>${sanitize(p.direccion)} / ${sanitize(p.telefono)}</td></tr>
        <tr><th>EPS</th><td>${sanitize(p.eps)}</td></tr>
      </table>
    </div>
    <div class="modal-detail-section">
      <h4>2. Anamnesis & Antecedentes</h4>
      <p><strong>Motivo de Consulta:</strong><br>${sanitize(p.motivo)}</p>
      <p><strong>Enfermedad Actual:</strong><br>${sanitize(p.enfermedadActual)}</p>
      <p><strong>Antecedentes Personales:</strong><br>${sanitize(p.antPersonales)}</p>
      <p><strong>Antecedentes Familiares:</strong><br>${sanitize(p.antFamiliares)}</p>
      <p><strong>Alergias:</strong><br><span style="color:var(--danger); font-weight:500;">${sanitize(p.alergias || "Ninguna")}</span></p>
    </div>
    <div class="modal-detail-section">
      <h4>3. Signos Vitales</h4>
      <div class="vitals-badge-grid">
        <div class="v-badge"><span>Temp:</span><strong>${sanitize(p.temperatura)} °C</strong></div>
        <div class="v-badge"><span>FC:</span><strong>${sanitize(p.frecCardiaca)} lpm</strong></div>
        <div class="v-badge"><span>FR:</span><strong>${sanitize(p.frecResp)} rpm</strong></div>
        <div class="v-badge"><span>P.A:</span><strong>${sanitize(p.presionArterial)}</strong></div>
        <div class="v-badge"><span>SpO₂:</span><strong>${sanitize(p.spo2)}%</strong></div>
        <div class="v-badge"><span>Peso:</span><strong>${sanitize(p.peso)} kg</strong></div>
        <div class="v-badge"><span>Talla:</span><strong>${sanitize(p.talla)} cm</strong></div>
        <div class="v-badge"><span>Glucemia:</span><strong>${sanitize(p.glucemia)} mg/dL</strong></div>
        <div class="v-badge" style="background:var(--navy); color:#fff;"><span>IMC:</span><strong>${sanitize(p.imc)}</strong></div>
      </div>
    </div>
    <div class="modal-detail-section">
      <h4>4. Evaluación y Conducta</h4>
      <p><strong>Examen Físico:</strong><br>${sanitize(p.examenFisico)}</p>
      <p><strong>Diagnóstico:</strong><br><strong>${sanitize(p.diagnostico)}</strong></p>
      <p><strong>Plan de Manejo:</strong><br>${sanitize(p.plan)}</p>
      <p><strong>Observaciones:</strong><br>${sanitize(p.observaciones || "Ninguna")}</p>
    </div>
    <p style="font-size:0.75rem; color:var(--text-3); margin-top:1.5rem; text-align:right;">
      Registrado el: ${formatDate(p.fecha)} por ${sanitize(p.registradoPor)}
    </p>
  `;

  show(document.getElementById("modalHC"));
}

function closeModal() {
  hide(document.getElementById("modalHC"));
}

// ─────────────────────────────────────────────────────────────
// 🛠️ UTILIDADES
// ─────────────────────────────────────────────────────────────
function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }

function showError(el, msg) {
  el.textContent = msg;
  show(el);
}

function setLoading(btn, loading, html) {
  btn.disabled  = loading;
  btn.innerHTML = loading
    ? `<div class="spinner" style="width:18px;height:18px;border-width:2px"></div><span>Cargando…</span>`
    : html;
}

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  show(toast);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => hide(toast), duration);
}

function sanitize(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

// Obtener iniciales para el Avatar
function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return String(iso); }
}

// Cálculo del IMC automático
function calcIMC() {
  const peso = parseFloat(document.getElementById("svPeso").value);
  const tallaCm = parseFloat(document.getElementById("svTalla").value);
  const imcInput = document.getElementById("svImc");

  if (peso > 0 && tallaCm > 0) {
    const tallaM = tallaCm / 100;
    const imc = peso / (tallaM * tallaM);
    imcInput.value = imc.toFixed(1);
  } else {
    imcInput.value = "";
  }
}
