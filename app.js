/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (VERSIÓN TOTALMENTE CORREGIDA Y SEGURA)
   Maneja login, navegación y registros médicos sin bloquear la interfaz
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwhx5kaU0e-5zDYQM3D3oOeqcYKpsQIP6eSMrgZjuBikyP69fuMuQck0SqROBwpnLRw4g/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

let currentUser = null;
let allPatients  = [];

// ── Inicialización Segura del Sistema ──
window.addEventListener("DOMContentLoaded", () => {
  
  // 1. Intentar restaurar sesión guardada
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (e) {
    sessionStorage.removeItem("asenorte_user");
  }

  // 2. Control de eventos para el Login de forma segura
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // 3. Control de eventos para guardar Historias Clínicas
  const hcForm = document.getElementById("hcForm");
  if (hcForm) {
    hcForm.addEventListener("submit", handleSaveHC);
  }

  // 4. Cálculo automático de IMC con verificación de existencia
  const svPeso = document.getElementById("svPeso");
  const svTalla = document.getElementById("svTalla");
  if (svPeso) svPeso.addEventListener("input", calcIMC);
  if (svTalla) svTalla.addEventListener("input", calcIMC);

  // 5. Asignar navegación a los botones de pestañas del index.html por su texto
  setupNavigationByText();
});

// ── Solución a la navegación sin IDs en el HTML ──
function setupNavigationByText() {
  const navButtons = document.querySelectorAll(".nav-btn, .bottom-nav-btn");
  navButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const txt = btn.textContent.toLowerCase();
      if (txt.includes("nueva")) {
        switchTab("nueva");
      } else if (txt.includes("buscar")) {
        switchTab("buscar");
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 🔑 GESTIÓN DE INICIO DE SESIÓN (LOGIN)
// ─────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  
  const userIn  = document.getElementById("username")?.value.trim();
  const passIn  = document.getElementById("password")?.value.trim();
  const btn     = document.getElementById("btnLogin");
  const errEl   = document.getElementById("loginError");

  if (errEl) hide(errEl);
  
  if (!userIn || !passIn) {
    if (errEl) showError(errEl, "Por favor, complete todos los campos.");
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

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();

    if (res.success) {
      currentUser = res.user;
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      if (errEl) showError(errEl, res.message || "Usuario o contraseña incorrectos.");
    }
  } catch (error) {
    console.error("Error en login:", error);
    if (errEl) showError(errEl, "Error de conexión con el servidor. Intente de nuevo.");
  } finally {
    if (btn) setLoading(btn, false, "Iniciar Sesión");
  }
}

function logout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  allPatients = [];
  
  const uInput = document.getElementById("username");
  const pInput = document.getElementById("password");
  if (uInput) uInput.value = "";
  if (pInput) pInput.value = "";

  hide(document.getElementById("loginError"));
  hide(document.getElementById("dashboardScreen"));
  
  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) {
    loginScreen.classList.add("active");
    show(loginScreen);
  }
}

// ─────────────────────────────────────────────────────────────
// 📊 CONTROL DEL PANEL (DASHBOARD)
// ─────────────────────────────────────────────────────────────
function openDashboard() {
  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) {
    loginScreen.classList.remove("active");
    hide(loginScreen);
  }
  
  const dashboardScreen = document.getElementById("dashboardScreen");
  if (dashboardScreen) {
    dashboardScreen.classList.add("active");
    show(dashboardScreen);
  }

  // Cargar datos informativos del usuario en la interfaz
  const userLabel = document.getElementById("userLabel");
  const userRol = document.getElementById("userRol");
  const avatar = document.getElementById("avatar");

  if (userLabel) userLabel.textContent = currentUser.nombre;
  if (userRol) userRol.textContent   = currentUser.rol;
  if (avatar) avatar.textContent    = getInitials(currentUser.nombre);

  // Configuración de visualización según el rol
  if (currentUser.rol === "Estudiante") {
    switchTab("nueva");
    // Ocultar botones de búsqueda para estudiantes
    document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => {
      if (b.textContent.toLowerCase().includes("buscar")) hide(b);
    });
  } else {
    switchTab("buscar");
    fetchHistorias();
  }
}

function switchTab(tabId) {
  // Remover estados activos visuales
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

  // Activar el panel correspondiente
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add("active");

  // Activar los botones correspondientes mediante coincidencia de texto
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => {
    if (b.textContent.toLowerCase().includes(tabId)) {
      b.classList.add("active");
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 📝 ENVIAR Y TRAER DATOS (GOOGLE SHEETS)
// ─────────────────────────────────────────────────────────────
async function handleSaveHC(e) {
  e.preventDefault();
  const btn = document.getElementById("btnGuardar");
  if (btn) setLoading(btn, true, "Guardar Historia Clínica");

  const getV = (id) => document.getElementById(id)?.value.trim() || "";

  const formData = {
    fecha: new Date().toISOString(),
    registradoPor: currentUser ? currentUser.usuario : "Sistema",
    nombre: getV("pNombre"),
    identificacion: getV("pIdentificacion"),
    fechaNacimiento: getV("pFechaNac"),
    sexo: getV("pSexo"),
    grupoSanguineo: getV("pSangre"),
    direccion: getV("pDireccion"),
    telefono: getV("pTelefono"),
    eps: getV("pEps"),
    motivo: getV("pMotivo"),
    enfermedadActual: getV("pEnfermedad"),
    antPersonales: getV("pAntPers"),
    antFamiliares: getV("pAntFam"),
    alergias: getV("pAlergias"),
    temperatura: getV("svTemp"),
    frecCardiaca: getV("svFc"),
    frecResp: getV("svFr"),
    presionArterial: getV("svPa"),
    spo2: getV("svSpo2"),
    peso: getV("svPeso"),
    talla: getV("svTalla"),
    glucemia: getV("svGlucemia"),
    imc: getV("svImc"),
    examenFisico: getV("pExamen"),
    diagnostico: getV("pDiagnostico"),
    plan: getV("pPlan"),
    observaciones: getV("pObs")
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
      showToast("✅ Registro clínico guardado.");
      document.getElementById("hcForm").reset();
      const imcInput = document.getElementById("svImc");
      if (imcInput) imcInput.value = "";
      
      if (currentUser && currentUser.rol !== "Estudiante") {
        fetchHistorias();
        switchTab("buscar");
      }
    } else {
      alert("Error: " + res.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error de conexión al guardar los datos.");
  } finally {
    if (btn) setLoading(btn, false, "Guardar Historia Clínica");
  }
}

async function fetchHistorias() {
  const container = document.getElementById("searchResults");
  const emptyState = document.getElementById("searchEmpty");
  if (!container) return;

  container.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
      <div class="spinner" style="margin: 0 auto 1rem;"></div>
      <p style="color: var(--text-2);">Buscando expedientes...</p>
    </div>`;
    
  if (emptyState) hide(emptyState);

  try {
    const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getHistorias`);
    const res = await response.json();
    
    if (res.success) {
      allPatients = res.historias;
      renderPatients(allPatients);
    } else {
      container.innerHTML = `<p class="empty-state">No se pudieron descargar los datos.</p>`;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="empty-state">Error de red al leer la base de datos.</p>`;
  }
}

function renderPatients(list) {
  const container = document.getElementById("searchResults");
  const emptyState = document.getElementById("searchEmpty");
  if (!container) return;
  container.innerHTML = "";

  if (list.length === 0) {
    if (emptyState) show(emptyState);
    return;
  }
  if (emptyState) hide(emptyState);

  list.forEach(p => {
    const card = document.createElement("div");
    card.className = "patient-card";
    card.innerHTML = `
      <div class="patient-card-header">
        <div>
          <h3>${sanitize(p.nombre)}</h3>
          <p>Doc: ${sanitize(p.identificacion)} · ${sanitize(p.sexo)}</p>
        </div>
        <span class="badge-eps">${sanitize(p.eps || "Particular")}</span>
      </div>
      <div class="patient-card-body">
        <p><strong>Dx Principal:</strong> ${sanitize(p.diagnostico || "No registrado")}</p>
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
  const input = document.getElementById("searchInput");
  if (!input) return;
  const query = input.value.toLowerCase().trim();
  
  if (!query) {
    renderPatients(allPatients);
    return;
  }
  
  const filtered = allPatients.filter(p => 
    String(p.nombre).toLowerCase().includes(query) ||
    String(p.identificacion).includes(query) ||
    String(p.diagnostico).toLowerCase().includes(query)
  );
  renderPatients(filtered);
}

function viewPatientDetail(id) {
  const p = allPatients.find(item => item.identificacion == id);
  if (!p) return;

  const body = document.getElementById("modalBody");
  if (!body) return;

  body.innerHTML = `
    <div class="modal-detail-section">
      <h4>1. Datos Generales</h4>
      <table class="detail-table">
        <tr><th>Paciente</th><td>${sanitize(p.nombre)}</td></tr>
        <tr><th>Identificación</th><td>${sanitize(p.identificacion)}</td></tr>
        <tr><th>Nacimiento</th><td>${sanitize(p.fechaNacimiento)}</td></tr>
        <tr><th>Sexo / Rh</th><td>${sanitize(p.sexo)} / ${sanitize(p.grupoSanguineo)}</td></tr>
        <tr><th>Contacto</th><td>${sanitize(p.telefono)} / ${sanitize(p.direccion)}</td></tr>
        <tr><th>Entidad (EPS)</th><td>${sanitize(p.eps)}</td></tr>
      </table>
    </div>
    <div class="modal-detail-section">
      <h4>2. Reporte Clínico</h4>
      <p><strong>Motivo:</strong><br>${sanitize(p.motivo)}</p>
      <p><strong>Enfermedad:</strong><br>${sanitize(p.enfermedadActual)}</p>
      <p><strong>Alergias:</strong><br><span style="color:var(--danger); font-weight:bold;">${sanitize(p.alergias || "Ninguna")}</span></p>
    </div>
    <div class="modal-detail-section">
      <h4>3. Constantes Vitales</h4>
      <div class="vitals-badge-grid">
        <div class="v-badge"><span>T°:</span><strong>${sanitize(p.temperatura)} °C</strong></div>
        <div class="v-badge"><span>FC:</span><strong>${sanitize(p.frecCardiaca)} lpm</strong></div>
        <div class="v-badge"><span>FR:</span><strong>${sanitize(p.frecResp)} rpm</strong></div>
        <div class="v-badge"><span>PA:</span><strong>${sanitize(p.presionArterial)}</strong></div>
        <div class="v-badge"><span>SatO₂:</span><strong>${sanitize(p.spo2)}%</strong></div>
        <div class="v-badge"><span>Peso:</span><strong>${sanitize(p.peso)} kg</strong></div>
        <div class="v-badge"><span>Talla:</span><strong>${sanitize(p.talla)} cm</strong></div>
        <div class="v-badge" style="background:var(--navy); color:#fff;"><span>IMC:</span><strong>${sanitize(p.imc)}</strong></div>
      </div>
    </div>
    <div class="modal-detail-section">
      <h4>4. Diagnóstico y Conducta</h4>
      <p><strong>Examen:</strong><br>${sanitize(p.examenFisico)}</p>
      <p><strong>Diagnóstico:</strong><br><strong>${sanitize(p.diagnostico)}</strong></p>
      <p><strong>Tratamiento/Plan:</strong><br>${sanitize(p.plan)}</p>
    </div>
  `;

  const modal = document.getElementById("modalHC");
  if (modal) show(modal);
}

function closeModal() {
  const modal = document.getElementById("modalHC");
  if (modal) hide(modal);
}

// ─────────────────────────────────────────────────────────────
// 🛠️ FUNCIONES DE UTILIDAD
// ─────────────────────────────────────────────────────────────
function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  show(el);
}

function setLoading(btn, loading, html) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<div class="spinner" style="width:16px; height:16px; border-width:2px; margin:0 auto;"></div>`
    : html;
}

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
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

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "U";
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return String(iso); }
}

function calcIMC() {
  const peso = parseFloat(document.getElementById("svPeso")?.value);
  const tallaCm = parseFloat(document.getElementById("svTalla")?.value);
  const imcInput = document.getElementById("svImc");

  if (imcInput && peso > 0 && tallaCm > 0) {
    const tallaM = tallaCm / 100;
    const imc = peso / (tallaM * tallaM);
    imcInput.value = imc.toFixed(1);
  }
}
