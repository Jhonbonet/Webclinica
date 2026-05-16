/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js (VERSIÓN INTEGRAL AJUSTADA)
   Maneja login, navegación segura y registro de datos
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwhx5kaU0e-5zDYQM3D3oOeqcYKpsQIP6eSMrgZjuBikyP69fuMuQck0SqROBwpnLRw4g/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

let currentUser = null;
let allPatients  = [];

// ── Inicialización segura al cargar el DOM ──
window.addEventListener("DOMContentLoaded", () => {
  // 1. Restaurar sesión si existe de forma segura
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) {
      currentUser = JSON.parse(saved);
      openDashboard();
    }
  } catch (e) {
    sessionStorage.removeItem("asenorte_user");
  }

  // 2. Eventos para cálculo automático de IMC (Verificación de existencia)
  const svPeso = document.getElementById("svPeso");
  const svTalla = document.getElementById("svTalla");
  if (svPeso) svPeso.addEventListener("input", calcIMC);
  if (svTalla) svTalla.addEventListener("input", calcIMC);

  // 3. Evento submit del Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // 4. Evento submit del Formulario de Historias Clínicas
  const hcForm = document.getElementById("hcForm");
  if (hcForm) {
    hcForm.addEventListener("submit", handleSaveHC);
  }

  // 5. Configurar navegación por pestañas basada en clases del HTML viejo/nuevo
  setupNavigationAlternative();
});

// ── Lógica de navegación alternativa según las clases de tu index.html ──
function setupNavigationAlternative() {
  const tabs = document.querySelectorAll(".nav-btn, .bottom-nav-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      // Detectar a qué pestaña apunta según el texto o atributo
      const text = tab.textContent.toLowerCase();
      if (text.includes("nueva") || tab.id?.includes("nueva") || tab.getAttribute("data-tab") === "nueva") {
        switchTab("nueva");
      } else if (text.includes("buscar") || tab.id?.includes("buscar") || tab.getAttribute("data-tab") === "buscar") {
        switchTab("buscar");
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 🔑 LÓGICA DE AUTENTICACIÓN (LOGIN)
// ─────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  
  const userIn  = document.getElementById("username")?.value.trim();
  const passIn  = document.getElementById("password")?.value.trim();
  const btn     = document.getElementById("btnLogin");
  const errEl   = document.getElementById("loginError");

  if (errEl) hide(errEl);
  if (!userIn || !passIn) {
    if (errEl) showError(errEl, "Por favor complete todos los campos.");
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

    if (!response.ok) throw new Error(`Error de red: ${response.status}`);
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
    if (errEl) showError(errEl, "Error de comunicación con el servidor de Google.");
  } finally {
    if (btn) setLoading(btn, false, "Iniciar Sesión");
  }
}

function logout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  allPatients = [];
  
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  if (usernameEl) usernameEl.value = "";
  if (passwordEl) passwordEl.value = "";
  
  hide(document.getElementById("loginError"));
  hide(document.getElementById("dashboardScreen"));
  
  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) loginScreen.classList.add("active");
  show(loginScreen);
}

// ─────────────────────────────────────────────────────────────
// 📊 PANEL PRINCIPAL (DASHBOARD) NAVEGACIÓN
// ─────────────────────────────────────────────────────────────
function openDashboard() {
  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) loginScreen.classList.remove("active");
  hide(loginScreen);
  
  const dashboardScreen = document.getElementById("dashboardScreen");
  if (dashboardScreen) dashboardScreen.classList.add("active");
  show(dashboardScreen);

  // Actualizar datos del header si existen
  const userLabel = document.getElementById("userLabel");
  const userRol = document.getElementById("userRol");
  const avatar = document.getElementById("avatar");

  if (userLabel) userLabel.textContent = currentUser.nombre;
  if (userRol) userRol.textContent   = currentUser.rol;
  if (avatar) avatar.textContent    = getInitials(currentUser.nombre);

  // Filtro de pestañas adaptado al Rol
  if (currentUser.rol === "Estudiante") {
    switchTab("nueva");
    // Ocultar botones de buscar si es estudiante
    document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => {
      if (b.textContent.toLowerCase().includes("buscar")) hide(b);
    });
  } else {
    switchTab("buscar");
    fetchHistorias();
  }
}

function switchTab(tabId) {
  // Remover estados activos en botones de navegación generales
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

  // Activar paneles específicos
  const panel = document.getElementById(`tab-${tabId}`);
  if (panel) panel.classList.add("active");

  // Activar botones por coincidencia de texto
  document.querySelectorAll(".nav-btn, .bottom-nav-btn").forEach(b => {
    if (b.textContent.toLowerCase().includes(tabId)) {
      b.classList.add("active");
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 📝 HISTORIAS CLÍNICAS: LECTURA Y ESCRITURA
// ─────────────────────────────────────────────────────────────
async function handleSaveHC(e) {
  e.preventDefault();
  const btn = document.getElementById("btnGuardar");
  if (btn) setLoading(btn, true, "Guardar Historia Clínica");

  // Recolección segura de datos estructurados
  const getVal = (id) => document.getElementById(id)?.value.trim() || "";

  const formData = {
    fecha: new Date().toISOString(),
    registradoPor: currentUser ? currentUser.usuario : "Desconocido",
    nombre: getVal("pNombre"),
    identificacion: getVal("pIdentificacion"),
    fechaNacimiento: getVal("pFechaNac"),
    sexo: getVal("pSexo"),
    grupoSanguineo: getVal("pSangre"),
    direccion: getVal("pDireccion"),
    telefono: getVal("pTelefono"),
    eps: getVal("pEps"),
    motivo: getVal("pMotivo"),
    enfermedadActual: getVal("pEnfermedad"),
    antPersonales: getVal("pAntPers"),
    antFamiliares: getVal("pAntFam"),
    alergias: getVal("pAlergias"),
    temperatura: getVal("svTemp"),
    frecCardiaca: getVal("svFc"),
    frecResp: getVal("svFr"),
    presionArterial: getVal("svPa"),
    spo2: getVal("svSpo2"),
    peso: getVal("svPeso"),
    talla: getVal("svTalla"),
    glucemia: getVal("svGlucemia"),
    imc: getVal("svImc"),
    examenFisico: getVal("pExamen"),
    diagnostico: getVal("pDiagnostico"),
    plan: getVal("pPlan"),
    observaciones: getVal("pObs")
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
      const svImc = document.getElementById("svImc");
      if (svImc) svImc.value = "";
      
      if (currentUser && currentUser.rol !== "Estudiante") {
        fetchHistorias();
        switchTab("buscar");
      }
    } else {
      alert("Error en hoja de cálculo: " + res.message);
    }
  } catch (err) {
    console.error(err);
    alert("Error de conexión al guardar el registro.");
  } finally {
    if (btn) setLoading(btn, false, "Guardar Historia Clínica");
  }
}

async function fetchHistorias() {
  const container = document.getElementById("searchResults");
  const emptyState = document.getElementById("searchEmpty");
  if (!container) return;

  container.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem;">
    <div class="spinner" style="margin:0 auto 1rem"></div>
    <p style="color:var(--text-2)">Cargando registros clínicos...</p>
  </div>`;
  if (emptyState) hide(emptyState);

  try {
    const response = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getHistorias`);
    const res = await response.json();
    
    if (res.success) {
      allPatients = res.historias;
      renderPatients(allPatients);
    } else {
      container.innerHTML = `<p class="empty-state">Error: ${res.message}</p>`;
    }
  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="empty-state">No se pudo obtener la información de la base de datos.</p>`;
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
          <p>CC: ${sanitize(p.identificacion)} · ${sanitize(p.sexo)}</p>
        </div>
        <span class="badge-eps">${sanitize(p.eps || "Particular")}</span>
      </div>
      <div class="patient-card-body">
        <p><strong>Dx:</strong> ${sanitize(p.diagnostico || "No definido")}</p>
        <p><strong>Resp:</strong> ${sanitize(p.registradoPor)}</p>
      </div>
      <div class="patient-card-footer">
        <span>${formatDate(p.fecha)}</span>
        <button class="btn-view" onclick="viewPatientDetail('${p.identificacion}')">Ver Detalle</button>
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
      <h4>1. Información del Paciente</h4>
      <table class="detail-table">
        <tr><th>Nombre Completo</th><td>${sanitize(p.nombre)}</td></tr>
        <tr><th>Identificación</th><td>${sanitize(p.identificacion)}</td></tr>
        <tr><th>Fecha Nacimiento</th><td>${sanitize(p.fechaNacimiento)}</td></tr>
        <tr><th>Sexo / Grupo Rh</th><td>${sanitize(p.sexo)} / ${sanitize(p.grupoSanguineo)}</td></tr>
        <tr><th>Residencia / Tel</th><td>${sanitize(p.direccion)} / ${sanitize(p.telefono)}</td></tr>
        <tr><th>Aseguradora (EPS)</th><td>${sanitize(p.eps)}</td></tr>
      </table>
    </div>
    <div class="modal-detail-section">
      <h4>2. Anamnesis & Antecedentes</h4>
      <p><strong>Motivo de Consulta:</strong><br>${sanitize(p.motivo)}</p>
      <p><strong>Enfermedad Actual:</strong><br>${sanitize(p.enfermedadActual)}</p>
      <p><strong>Antecedentes Personales:</strong><br>${sanitize(p.antPersonales)}</p>
      <p><strong>Antecedentes Familiares:</strong><br>${sanitize(p.antFamiliares)}</p>
      <p><strong>Alergias:</strong><br><span style="color:var(--danger); font-weight:bold;">${sanitize(p.alergias || "Ninguna")}</span></p>
    </div>
    <div class="modal-detail-section">
      <h4>3. Signos Vitales Evaluados</h4>
      <div class="vitals-badge-grid">
        <div class="v-badge"><span>T°:</span><strong>${sanitize(p.temperatura)} °C</strong></div>
        <div class="v-badge"><span>F.C:</span><strong>${sanitize(p.frecCardiaca)} lpm</strong></div>
        <div class="v-badge"><span>F.R:</span><strong>${sanitize(p.frecResp)} rpm</strong></div>
        <div class="v-badge"><span>P.A:</span><strong>${sanitize(p.presionArterial)}</strong></div>
        <div class="v-badge"><span>SpO₂:</span><strong>${sanitize(p.spo2)}%</strong></div>
        <div class="v-badge"><span>Peso:</span><strong>${sanitize(p.peso)} kg</strong></div>
        <div class="v-badge"><span>Talla:</span><strong>${sanitize(p.talla)} cm</strong></div>
        <div class="v-badge"><span>HGT:</span><strong>${sanitize(p.glucemia)} mg/dL</strong></div>
        <div class="v-badge" style="background:var(--navy); color:#fff;"><span>IMC:</span><strong>${sanitize(p.imc)}</strong></div>
      </div>
    </div>
    <div class="modal-detail-section">
      <h4>4. Impresión Diagnóstica y Plan</h4>
      <p><strong>Examen Físico:</strong><br>${sanitize(p.examenFisico)}</p>
      <p><strong>Diagnóstico:</strong><br><strong>${sanitize(p.diagnostico)}</strong></p>
      <p><strong>Plan Terapéutico:</strong><br>${sanitize(p.plan)}</p>
      <p><strong>Observaciones:</strong><br>${sanitize(p.observaciones || "Sin observación adicional")}</p>
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
// 🛠️ COMPONENTES AUXILIARES
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
  btn.disabled  = loading;
  btn.innerHTML = loading
    ? `<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto;"></div>`
    : html;
}

function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  if (!toast) { alert(msg); return; }
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
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "E";
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
