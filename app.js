/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js
   Maneja login, lectura y escritura en Google Sheets
   vía Google Apps Script Web App (no requiere backend propio)
═══════════════════════════════════════════════════════════════ */

// ─────────────────────────────────────────────────────────────
// ⚙️  CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────
const CONFIG = {
  // Asegúrate de actualizar esta URL si generas un nuevo ID de despliegue
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxRM0Ym08ggKcWM2FNg3t50IrZfzIg2H_YpsQRBuF171rZIuNcsqlGlDAlI5g_EQNMbWA/exec",
  SHEET_USUARIOS:  "Usuarios",
  SHEET_HISTORIAS: "HistoriasClinicas",
};

// ─────────────────────────────────────────────────────────────
// 🔐  SESIÓN
// ─────────────────────────────────────────────────────────────
let currentUser = null;
let allPatients  = [];

window.addEventListener("DOMContentLoaded", () => {
  const saved = sessionStorage.getItem("asenorte_user");
  if (saved) {
    currentUser = JSON.parse(saved);
    openDashboard();
  }
  document.getElementById("svPeso").addEventListener("input", calcIMC);
  document.getElementById("svTalla").addEventListener("input", calcIMC);
});

// ─────────────────────────────────────────────────────────────
// 🔑  LOGIN (AJUSTADO PARA PROCESAR REDIRECCIONES DE GOOGLE)
// ─────────────────────────────────────────────────────────────
async function handleLogin() {
  const usuario  = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  const errorEl  = document.getElementById("loginError");
  const btn      = document.getElementById("loginBtn");

  errorEl.classList.add("hidden");

  if (!usuario || !password) {
    showError(errorEl, "Por favor ingresa usuario y contraseña.");
    return;
  }

  setLoading(btn, true, "Verificando…");

  try {
    const params = new URLSearchParams({
      action: "login",
      usuario: usuario,
      password: password
    });

    // CRÍTICO: redirect: "follow" permite interceptar la respuesta tras el desvío de Google
    const res = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`, {
      method: "GET",
      mode: "cors",
      redirect: "follow"
    });

    if (!res.ok) {
      throw new Error("Error en la respuesta del servidor");
    }

    const data = await res.json();

    if (data.success) {
      currentUser = { usuario, nombre: data.nombre || usuario, rol: data.rol || "Estudiante" };
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      showError(errorEl, data.message || "Usuario o contraseña incorrectos.");
    }
  } catch (err) {
    console.error(err);
    showError(errorEl, "No se pudo conectar al servidor. Verifica la URL del Apps Script o vuelve a publicar el script.");
  } finally {
    setLoading(btn, false, `<span>Iniciar sesión</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/></svg>`);
  }
}

function handleLogout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null;
  allPatients  = [];
  showScreen("loginScreen");
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("loginPass").addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  });
});

// ─────────────────────────────────────────────────────────────
// 🖥️  NAVEGACIÓN DE PANTALLAS Y TABS
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function openDashboard() {
  showScreen("dashboardScreen");
  document.getElementById("welcomeUser").textContent = currentUser.nombre || currentUser.usuario;
  loadPatients();
}

window.showTab = function(tabId) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach((btn, i) => {
    const tabs = ["tab-pacientes", "tab-historia", "tab-buscar"];
    btn.classList.toggle("active", tabs[i] === tabId);
  });

  document.querySelectorAll(".bnav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
}

// ─────────────────────────────────────────────────────────────
// 📋  CARGAR PACIENTES
// ─────────────────────────────────────────────────────────────
async function loadPatients() {
  const list   = document.getElementById("patientList");
  const empty  = document.getElementById("emptyState");
  const loader = document.getElementById("loadingMsg");

  list.innerHTML = "";
  empty.classList.add("hidden");
  loader.classList.remove("hidden");

  try {
    const params = new URLSearchParams({ action: "getHistorias" });
    const res    = await fetch(`${CONFIG.APPS_SCRIPT_URL}?${params.toString()}`, {
      method: "GET",
      mode: "cors",
      redirect: "follow"
    });
    const data   = await res.json();

    loader.classList.add("hidden");

    if (data.success && data.historias.length > 0) {
      allPatients = data.historias;
      renderPatientCards(allPatients, list);
    } else {
      allPatients = [];
      empty.classList.remove("hidden");
    }
  } catch (err) {
    loader.classList.add("hidden");
    console.error(err);
    list.innerHTML = `<p style="color:var(--danger);font-size:.88rem;">
      ⚠️ Error al cargar datos. Verifica la conexión con Google Sheets.
    </p>`;
  }
}

function renderPatientCards(patients, container) {
  container.innerHTML = "";
  patients.forEach(p => {
    const initials = getInitials(p.nombre);
    const card = document.createElement("div");
    card.className = "patient-card";
    card.onclick = () => openPatientModal(p);
    card.innerHTML = `
      <div class="pc-top">
        <div class="pc-avatar">${initials}</div>
        <span class="pc-badge">${p.sexo || "—"}</span>
      </div>
      <div class="pc-name">${sanitize(p.nombre)}</div>
      <div class="pc-id">ID: ${sanitize(p.identificacion)}</div>
      ${p.diagnostico ? `<div class="pc-diag">${sanitize(p.diagnostico)}</div>` : ""}
      <div class="pc-meta">
        ${p.eps    ? `<span class="pc-tag">🏥 ${sanitize(p.eps)}</span>`   : ""}
        ${p.grupoSanguineo ? `<span class="pc-tag">🩸 ${sanitize(p.grupoSanguineo)}</span>` : ""}
        <span class="pc-tag">📅 ${formatDate(p.fecha)}</span>
        <span class="pc-tag">👩‍🎓 ${sanitize(p.registradoPor || "—")}</span>
      </div>`;
    container.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────
// 💾  GUARDAR HISTORIA CLÍNICA
// ─────────────────────────────────────────────────────────────
async function savePatient() {
  const errorEl   = document.getElementById("formError");
  const successEl = document.getElementById("formSuccess");
  const btn       = document.getElementById("saveBtn");

  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");

  const nombre         = document.getElementById("hcNombre").value.trim();
  const identificacion = document.getElementById("hcId").value.trim();
  const motivo         = document.getElementById("hcMotivo").value.trim();

  if (!nombre || !identificacion || !motivo) {
    showError(errorEl, "Los campos marcados con * son obligatorios: Nombre, Identificación y Motivo de consulta.");
    return;
  }

  const payload = buildPayload(nombre, identificacion, motivo);
  setLoading(btn, true, "Guardando…");

  try {
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", 
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    successEl.textContent = "✅ Petición enviada. Revisa tu Google Sheets para verificar el registro.";
    successEl.classList.remove("hidden");
    showToast("Historia clínica enviada ✅");
    clearForm();
    setTimeout(() => loadPatients(), 1500);

  } catch (err) {
    console.error(err);
    showError(errorEl, "Error de conexión con Google Sheets.");
  } finally {
    setLoading(btn, false, `<span>Guardar Historia Clínica</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/></svg>`);
  }
}

function buildPayload(nombre, identificacion, motivo) {
  return {
    action:          "saveHistoria",
    fecha:           new Date().toISOString(),
    registradoPor:   currentUser.usuario,
    nombre,
    identificacion,
    fechaNacimiento: document.getElementById("hcFechaNac").value,
    sexo:            document.getElementById("hcSexo").value,
    grupoSanguineo:  document.getElementById("hcGrupoSanguineo").value,
    direccion:       document.getElementById("hcDireccion").value.trim(),
    telefono:        document.getElementById("hcTelefono").value.trim(),
    eps:             document.getElementById("hcEps").value.trim(),
    motivo,
    enfermedadActual:   document.getElementById("hcEnfermedad").value.trim(),
    antPersonales:      document.getElementById("hcAntPersonales").value.trim(),
    antFamiliares:      document.getElementById("hcAntFamiliares").value.trim(),
    alergias:           document.getElementById("hcAlergias").value.trim(),
    temperatura:  document.getElementById("svTemp").value,
    frecCardiaca: document.getElementById("svFC").value,
    frecResp:     document.getElementById("svFR").value,
    presionArterial: document.getElementById("svPA").value.trim(),
    spo2:         document.getElementById("svSpo2").value,
    peso:         document.getElementById("svPeso").value,
    talla:        document.getElementById("svTalla").value,
    glucemia:     document.getElementById("svGlucemia").value,
    imc:          document.getElementById("imcVal").textContent,
    examenFisico: document.getElementById("hcExamenFisico").value.trim(),
    diagnostico:  document.getElementById("hcDiagnostico").value.trim(),
    plan:         document.getElementById("hcPlan").value.trim(),
    observaciones: document.getElementById("hcObservaciones").value.trim(),
  };
}

// ─────────────────────────────────────────────────────────────
// 🔍  BUSCAR Y VENTANAS MODALES
// ─────────────────────────────────────────────────────────────
function searchPatients() {
  const q = document.getElementById("searchInput").value.trim().toLowerCase();
  const res = document.getElementById("searchResults");
  const empty = document.getElementById("searchEmpty");

  res.innerHTML  = "";
  empty.classList.add("hidden");

  if (!q) return;

  const filtered = allPatients.filter(p =>
    (p.nombre        || "").toLowerCase().includes(q) ||
    (p.identificacion|| "").toLowerCase().includes(q) ||
    (p.diagnostico   || "").toLowerCase().includes(q) ||
    (p.eps           || "").toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    empty.classList.remove("hidden");
  } else {
    renderPatientCards(filtered, res);
  }
}

function openPatientModal(p) {
  const modal   = document.getElementById("hcModal");
  const content = document.getElementById("modalContent");
  const age = calcAge(p.fechaNacimiento);

  content.innerHTML = `
    <h2 class="modal-title">${sanitize(p.nombre)}</h2>
    <p class="modal-id">ID: ${sanitize(p.identificacion)} &bull; Registrado por: ${sanitize(p.registradoPor || "—")} &bull; ${formatDate(p.fecha)}</p>
    <div class="modal-section">
      <h4>Datos personales</h4>
      <div class="modal-grid">
        <div class="modal-field"><span>Edad</span>${age}</div>
        <div class="modal-field"><span>Sexo</span>${sanitize(p.sexo || "—")}</div>
        <div class="modal-field"><span>Grupo sanguíneo</span>${sanitize(p.grupoSanguineo || "—")}</div>
        <div class="modal-field"><span>EPS</span>${sanitize(p.eps || "—")}</div>
        <div class="modal-field"><span>Teléfono</span>${sanitize(p.telefono || "—")}</div>
        <div class="modal-field"><span>Dirección</span>${sanitize(p.direccion || "—")}</div>
        <div class="modal-field"><span>Alergias</span>${sanitize(p.alergias || "Ninguna conocida")}</div>
      </div>
    </div>
    <div class="modal-section">
      <h4>Signos vitales</h4>
      <div>
        ${vitalChip("🌡️", "Temp.", p.temperatura, "°C")}
        ${vitalChip("❤️", "FC",   p.frecCardiaca, "lpm")}
        ${vitalChip("🫁", "FR",   p.frecResp, "rpm")}
        ${vitalChip("💉", "PA",   p.presionArterial, "mmHg")}
        ${vitalChip("🩺", "SpO₂", p.spo2, "%")}
        ${vitalChip("⚖️", "Peso", p.peso, "kg")}
        ${vitalChip("📏", "Talla", p.talla, "cm")}
        ${vitalChip("🩸", "Glucemia", p.glucemia, "mg/dl")}
        ${vitalChip("📊", "IMC",  p.imc, "")}
      </div>
    </div>
    <div class="modal-section">
      <h4>Motivo de consulta</h4>
      <p style="font-size:.9rem;line-height:1.6;color:var(--text)">${sanitize(p.motivo || "—")}</p>
    </div>
    ${p.enfermedadActual ? `<div class="modal-section"><h4>Enfermedad actual</h4><p style="font-size:.9rem;line-height:1.6;color:var(--text)">${sanitize(p.enfermedadActual)}</p></div>` : ""}
    ${p.diagnostico ? `<div class="modal-section"><h4>Diagnóstico</h4><p style="font-size:.9rem;line-height:1.6;color:var(--text)">${sanitize(p.diagnostico)}</p></div>` : ""}
    ${p.plan ? `<div class="modal-section"><h4>Plan / Intervenciones</h4><p style="font-size:.9rem;line-height:1.6;color:var(--text)">${sanitize(p.plan)}</p></div>` : ""}
    ${p.observaciones ? `<div class="modal-section"><h4>Observaciones del estudiante</h4><p style="font-size:.9rem;line-height:1.6;color:var(--text);font-style:italic">${sanitize(p.observaciones)}</p></div>` : ""}
  `;
  modal.classList.remove("hidden");
}

function vitalChip(icon, label, val, unit) {
  if (!val) return "";
  return `<span class="vital-chip">${icon} <strong>${label}</strong> ${sanitize(String(val))}${unit}</span>`;
}

function closeModal(e) {
  if (e.target === document.getElementById("hcModal")) closeModalBtn();
}
function closeModalBtn() {
  document.getElementById("hcModal").classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────
// ⚕️  IMC Y UTILIDADES MASCARAS
// ─────────────────────────────────────────────────────────────
function calcIMC() {
  const peso  = parseFloat(document.getElementById("svPeso").value);
  const talla = parseFloat(document.getElementById("svTalla").value);
  const imcEl = document.getElementById("imcVal");
  const catEl = document.getElementById("imcCategoria");

  if (!peso || !talla || talla < 50) {
    imcEl.textContent = "—";
    catEl.textContent = "";
    catEl.className   = "imc-cat";
    return;
  }

  const tallaM = talla / 100;
  const imc    = (peso / (tallaM * tallaM)).toFixed(1);
  imcEl.textContent = imc;

  let label = "", css = "";
  if      (imc < 18.5) { label = "Bajo peso";    css = "imc-bajo";   }
  else if (imc < 25)   { label = "Normal";        css = "imc-normal"; }
  else if (imc < 30)   { label = "Sobrepeso";     css = "imc-sobre";  }
  else                 { label = "Obesidad";      css = "imc-obeso";  }

  catEl.textContent = label;
  catEl.className   = `imc-cat ${css}`;
}

function clearForm() {
  const ids = [
    "hcNombre","hcId","hcFechaNac","hcSexo","hcGrupoSanguineo",
    "hcDireccion","hcTelefono","hcEps","hcMotivo","hcEnfermedad",
    "hcAntPersonales","hcAntFamiliares","hcAlergias",
    "svTemp","svFC","svFR","svPA","svSpo2","svPeso","svTalla","svGlucemia",
    "hcExamenFisico","hcDiagnostico","hcPlan","hcObservaciones",
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("imcVal").textContent = "—";
  document.getElementById("imcCategoria").textContent = "";
  document.getElementById("imcCategoria").className = "imc-cat";
  document.getElementById("formError").classList.add("hidden");
  document.getElementById("formSuccess").classList.add("hidden");
}

function togglePass() {
  const input = document.getElementById("loginPass");
  input.type  = input.type === "password" ? "text" : "password";
}

function showError(el, msg) {
  el.textContent = msg;
  el.classList.remove("hidden");
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
  toast.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.add("hidden"), duration);
}

function sanitize(str) {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
}

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" });
  } catch { return iso; }
}

function calcAge(dob) {
  if (!dob) return "—";
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return `${age} años`;
}
