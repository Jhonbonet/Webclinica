/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js  v3.0
   Sistema Clínico Completo — Enfermero + Paciente + Docente + Admin
   Nuevos módulos: Citas con calendario, Historial paciente, Gestión usuarios
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwAq_R6Syuq6R5ueCRfg2RI0Obqo4-RDHeKuQaCHFSuZwNlwxXiKwbrRPaNT5MQsQ9AdQ/exec",
};

// ─────────────────────────────────────────────────────────────
// 🔐  ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let currentUser    = null;
let allPatients    = [];
let pacientesList  = [];
let medicosList    = [];

// Estado del calendario de citas
let calCurrentDate    = new Date();
let citasMedicoSel    = null;   // médico actualmente seleccionado
let citaFechaSel      = null;   // fecha seleccionada en el calendario
let citaHoraSel       = null;   // hora seleccionada
let citasReservadas   = [];     // citas ya reservadas para bloquear slots

// ─────────────────────────────────────────────────────────────
// 🚀  INIT
// ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) { currentUser = JSON.parse(saved); openDashboard(); }
  } catch { sessionStorage.removeItem("asenorte_user"); }

  const pesoEl  = document.getElementById("svPeso");
  const tallaEl = document.getElementById("svTalla");
  if (pesoEl)  pesoEl.addEventListener("input", calcIMC);
  if (tallaEl) tallaEl.addEventListener("input", calcIMC);

  const passEl = document.getElementById("loginPass");
  if (passEl) passEl.addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
});

// ─────────────────────────────────────────────────────────────
// 🔑  LOGIN / LOGOUT
// ─────────────────────────────────────────────────────────────
async function handleLogin() {
  const usuario  = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  const errorEl  = document.getElementById("loginError");
  const btn      = document.getElementById("loginBtn");
  hide(errorEl);
  if (!usuario || !password) { showError(errorEl, "Por favor ingresa usuario y contraseña."); return; }
  setLoading(btn, true);
  try {
    const params = new URLSearchParams({ action: "login", usuario, password });
    const data   = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?${params}`);
    if (data.success) {
      currentUser = { usuario, nombre: data.nombre || usuario, rol: data.rol || "Estudiante" };
      sessionStorage.setItem("asenorte_user", JSON.stringify(currentUser));
      openDashboard();
    } else {
      showError(errorEl, data.message || "Credenciales incorrectas.");
    }
  } catch { showError(errorEl, "No se pudo conectar al servidor. Verifica la URL en CONFIG."); }
  finally { setLoading(btn, false); }
}

function handleLogout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null; allPatients = []; pacientesList = []; medicosList = [];
  showScreen("loginScreen");
}

// ─────────────────────────────────────────────────────────────
// 🖥️  NAVEGACIÓN
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.style.display = "none"; s.classList.remove("active");
  });
  const target = document.getElementById(id);
  if (!target) return;
  target.style.display = id === "loginScreen" ? "flex" : "block";
  target.classList.add("active");
}

function openDashboard() {
  showScreen("dashboardScreen");
  document.getElementById("welcomeUser").textContent = currentUser.nombre;

  const rol     = (currentUser.rol || "").toLowerCase();
  const isAdmin = rol.includes("admin");
  const isDoc   = rol.includes("docente") || isAdmin;
  const isPac   = rol.includes("paciente");
  const isEnf   = !isPac;

  // Rol badge
  const rolBadge = document.getElementById("rolBadge");
  if (rolBadge) {
    const rolLabels = {
      administrador: "🔧 Admin", docente: "👩‍🏫 Docente",
      estudiante: "👩‍⚕️ Estudiante", enfermero: "👩‍⚕️ Enfermero",
      paciente: "🏥 Paciente"
    };
    const matchKey = Object.keys(rolLabels).find(k => rol.includes(k)) || "estudiante";
    rolBadge.textContent = rolLabels[matchKey];
    rolBadge.className   = `rol-badge rol-${matchKey}`;
  }

  buildNav(isEnf, isPac, isDoc, isAdmin);

  if (isPac) {
    loadMisCitas();
    loadHistorialPaciente();
    loadMisSolicitudes();
    loadMisSignos();
    loadMedicos();
    showTab("tab-citas-pac");
  } else {
    loadPatients();
    loadPacientesSelect();
    showTab("tab-pacientes");
  }

  if (isAdmin) loadUsuarios();
}

function buildNav(isEnf, isPac, isDoc, isAdmin) {
  const topnav = document.getElementById("topnav");
  const botnav = document.getElementById("bottomnav");
  topnav.innerHTML = "";
  botnav.innerHTML = "";

  const tabs = [];

  if (!isPac) {
    tabs.push({ id:"tab-pacientes",     label:"Pacientes",   icon:svgPeople() });
    tabs.push({ id:"tab-historia",      label:"Nueva HC",    icon:svgDoc() });
    tabs.push({ id:"tab-admision",      label:"Admisión",    icon:svgClip() });
    tabs.push({ id:"tab-kardex",        label:"Kárdex",      icon:svgPill() });
    tabs.push({ id:"tab-signos",        label:"Signos",      icon:svgHeart() });
    tabs.push({ id:"tab-balance",       label:"Balance",     icon:svgDrop() });
    tabs.push({ id:"tab-notas",         label:"Notas",       icon:svgNote() });
    tabs.push({ id:"tab-consentimiento",label:"Consent.",    icon:svgCheck() });
    tabs.push({ id:"tab-epicrisis",     label:"Epicrisis",   icon:svgExit() });
    tabs.push({ id:"tab-buscar",        label:"Buscar",      icon:svgSearch() });
  }
  if (isDoc) tabs.push({ id:"tab-evaluaciones", label:"Evaluar", icon:svgStar() });
  if (isAdmin) tabs.push({ id:"tab-usuarios", label:"Usuarios", icon:svgUsers() });

  if (isPac) {
    tabs.push({ id:"tab-citas-pac",      label:"Mis Citas",      icon:svgCal() });
    tabs.push({ id:"tab-historial-pac",  label:"Mi Historial",   icon:svgDoc() });
    tabs.push({ id:"tab-solicitudes-pac",label:"Solicitudes",    icon:svgNote() });
    tabs.push({ id:"tab-mis-signos",     label:"Mis Signos",     icon:svgHeart() });
  }

  tabs.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.className = "nav-btn" + (i === 0 ? " active" : "");
    btn.dataset.tab = t.id;
    btn.textContent = t.label;
    btn.onclick = () => showTab(t.id);
    topnav.appendChild(btn);

    if (i < 5) {
      const bb = document.createElement("button");
      bb.className = "bnav-btn" + (i === 0 ? " active" : "");
      bb.dataset.tab = t.id;
      bb.onclick = () => showTab(t.id);
      bb.innerHTML = t.icon + `<span>${t.label}</span>`;
      botnav.appendChild(bb);
    }
  });
}

function showTab(tabId) {
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.style.display = "none"; p.classList.remove("active");
  });
  const panel = document.getElementById(tabId);
  if (panel) { panel.style.display = "block"; panel.classList.add("active"); }

  document.querySelectorAll(".nav-btn, .bnav-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tabId);
  });
}

// ─────────────────────────────────────────────────────────────
// 👩‍⚕️  PACIENTES / HC
// ─────────────────────────────────────────────────────────────
async function loadPatients() {
  const list   = document.getElementById("patientList");
  const loader = document.getElementById("loadingMsg");
  const empty  = document.getElementById("emptyState");
  show(loader); if (list) list.innerHTML = ""; hide(empty);
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getHistorias`);
    allPatients = data.historias || data.rows || [];
    hide(loader);
    renderPatients(allPatients, "patientList", "emptyState");
    loadPacientesSelect();
  } catch {
    hide(loader);
    if (list) list.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar. Verifica la URL del servidor.</p>`;
  }
}

function renderPatients(patients, containerId, emptyId) {
  const list  = document.getElementById(containerId);
  const empty = document.getElementById(emptyId);
  if (!list) return;
  list.innerHTML = "";
  if (!patients.length) { if (empty) show(empty); return; }
  if (empty) hide(empty);
  patients.forEach(p => {
    const card = document.createElement("div");
    card.className = "patient-card";
    card.onclick   = () => openPatientModal(p);
    const age = calcAge(p.fechaNacimiento);
    card.innerHTML = `
      <div class="pc-avatar">${getInitials(p.nombre)}</div>
      <div class="pc-info">
        <h3>${sanitize(p.nombre || "—")}</h3>
        <p class="pc-id">${sanitize(p.identificacion || "—")}</p>
        <p class="pc-meta">${age} · ${sanitize(p.sexo || "—")}</p>
        <p class="pc-eps">${sanitize(p.eps || "Sin EPS")}</p>
        ${p.diagnostico ? `<span class="pc-diag">${sanitize(p.diagnostico).substring(0,60)}…</span>` : ""}
      </div>
      <div class="pc-date">${formatDate(p.fecha)}</div>
    `;
    list.appendChild(card);
  });
}

function filterPatients() {
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const filtered = allPatients.filter(p =>
    [p.nombre, p.identificacion, p.diagnostico, p.eps].some(f => String(f || "").toLowerCase().includes(q))
  );
  renderPatients(filtered, "searchResults", "searchEmpty");
}

async function savePatient() {
  const nombre = v("hcNombre"), id = v("hcId"), motivo = v("hcMotivo");
  const errEl  = document.getElementById("formError");
  const sucEl  = document.getElementById("formSuccess");
  hide(errEl); hide(sucEl);
  if (!nombre || !id || !motivo) { showError(errEl, "Nombre, identificación y motivo son obligatorios."); return; }
  const btn = document.getElementById("saveBtn");
  setLoading(btn, true);
  const peso = parseFloat(v("svPeso")), talla = parseFloat(v("svTalla"));
  const imc  = (peso && talla && talla >= 50) ? (peso / ((talla/100)**2)).toFixed(1) : "";
  try {
    const body = {
      action:"saveHistoria", fecha:now(), registradoPor:currentUser.nombre,
      nombre, identificacion:id, fechaNacimiento:v("hcFechaNac"), sexo:v("hcSexo"),
      grupoSanguineo:v("hcGrupoSanguineo"), direccion:v("hcDireccion"), telefono:v("hcTelefono"),
      eps:v("hcEps"), regimen:v("hcRegimen"), ocupacion:v("hcOcupacion"),
      escolaridad:v("hcEscolaridad"), estadoCivil:v("hcEstadoCivil"),
      contactoEmergencia:v("hcContactoEmergencia"), telefonoEmergencia:v("hcTelefonoEmergencia"),
      motivo, enfermedadActual:v("hcEnfermedad"), antPersonales:v("hcAntPersonales"),
      antFamiliares:v("hcAntFamiliares"), alergias:v("hcAlergias"),
      temperatura:v("svTemp"), frecCardiaca:v("svFC"), frecResp:v("svFR"),
      presionArterial:v("svPA"), spo2:v("svSpo2"), peso:v("svPeso"), talla:v("svTalla"),
      glucemia:v("svGlucemia"), imc,
      examenFisico:v("hcExamenFisico"), diagnostico:v("hcDiagnostico"),
      codigoCIE10:v("hcCIE10"), plan:v("hcPlan"), observaciones:v("hcObservaciones"),
    };
    const data = await apiPost(body);
    if (data.success) {
      showMsgEl(sucEl, "✅ Historia clínica guardada correctamente.");
      clearForm(); loadPatients(); loadPacientesSelect();
    } else showError(errEl, data.message || "Error al guardar.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

// ─────────────────────────────────────────────────────────────
// 🏥  ADMISIÓN
// ─────────────────────────────────────────────────────────────
async function saveAdmision() {
  const pacId = v("admPacienteId");
  const errEl = document.getElementById("admError");
  const sucEl = document.getElementById("admSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId) { showError(errEl, "El ID del paciente es obligatorio."); return; }
  const btn = document.getElementById("admBtn");
  setLoading(btn, true);
  const rips = "RIPS-" + Date.now().toString(36).toUpperCase();
  try {
    const data = await apiPost({
      action:"saveAdmision", fechaAdmision:now(), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("admPacienteNombre"),
      tipoAdmision:v("admTipo"), servicioDestino:v("admServicio"),
      medico:v("admMedico"), prioridad:v("admPrioridad"),
      eps:v("admEps"), regimen:v("admRegimen"), numeroAfiliacion:v("admNumeroAfiliacion"),
      derechosVerificados:document.getElementById("admDerechos")?.checked ? "Sí" : "No",
      motivoAdmision:v("admMotivo"), condicionIngreso:v("admCondicion"),
      origenAtencion:v("admOrigen"), ripsGenerado:"Sí", codigoRIPS:rips,
      observacionesAdmision:v("admObservaciones"),
    });
    if (data.success) {
      showMsgEl(sucEl, `✅ Admisión registrada. Código RIPS: ${rips}`);
      ["admPacienteId","admPacienteNombre","admEps","admNumeroAfiliacion","admMedico","admMotivo","admObservaciones"].forEach(id => setVal(id,""));
      ["admRegimen","admTipo","admServicio","admPrioridad","admCondicion","admOrigen"].forEach(id => setVal(id,""));
      const cb = document.getElementById("admDerechos"); if (cb) cb.checked = false;
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

// ─────────────────────────────────────────────────────────────
// 💊  KÁRDEX
// ─────────────────────────────────────────────────────────────
async function saveKardex() {
  const pacId = v("kPacienteId"), med = v("kMedicamento");
  const errEl = document.getElementById("kardexError");
  const sucEl = document.getElementById("kardexSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId || !med) { showError(errEl, "ID del paciente y medicamento son obligatorios."); return; }
  const btn = document.getElementById("kardexBtn");
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action:"saveKardex", fecha:today(), hora:timeNow(), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("kPacienteNombre"),
      medicamento:med, concentracion:v("kConcentracion"), forma:v("kForma"),
      dosis:v("kDosis"), via:v("kVia"), frecuencia:v("kFrecuencia"),
      prescritoPor:v("kPrescritoPor"), horaAdministracion:v("kHoraAdmin"),
      administrado:v("kAdministrado"), loteVacuna:v("kLote"),
      reaccionAdversa:document.getElementById("kReaccion")?.checked ? "Sí" : "No",
      descripcionReaccion:v("kDescReaccion"), observaciones:v("kObservaciones"),
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Registro en Kárdex guardado.");
      ["kMedicamento","kConcentracion","kDosis","kLote","kDescReaccion","kObservaciones","kHoraAdmin"].forEach(id => setVal(id,""));
      ["kForma","kVia","kFrecuencia","kAdministrado"].forEach(id => setVal(id,""));
      const cb = document.getElementById("kReaccion"); if (cb) { cb.checked = false; }
      const rb = document.getElementById("kReaccionBox"); if (rb) rb.style.display = "none";
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

async function loadKardex() {
  const id   = v("kBuscarId") || v("kPacienteId");
  const cont = document.getElementById("kardexLista");
  if (!id || !cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div><span>Cargando…</span></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getKardex&pacienteId=${encodeURIComponent(id)}`);
    const rows = data.rows || [];
    if (!rows.length) { cont.innerHTML = `<p class="empty-state">Sin registros.</p>`; return; }
    cont.innerHTML = rows.map(r => `
      <div class="record-item">
        <div class="record-header">
          <span class="record-badge">💊 ${sanitize(r.medicamento)}</span>
          <span class="record-date">${formatDate(r.fecha)} ${sanitize(r.hora || "")}</span>
        </div>
        <div class="record-body">
          Dosis: <b>${sanitize(r.dosis)}</b> · Vía: <b>${sanitize(r.via)}</b> · Frec: ${sanitize(r.frecuencia)} · Admin: ${sanitize(r.administrado)}
          ${r.reaccionAdversa === "Sí" ? `<span class="warn-tag">⚠️ Reacción adversa: ${sanitize(r.descripcionReaccion)}</span>` : ""}
        </div>
      </div>
    `).join("");
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar.</p>`; }
}

// ─────────────────────────────────────────────────────────────
// 📊  SIGNOS VITALES
// ─────────────────────────────────────────────────────────────
async function saveSignos() {
  const pacId = v("sPacienteId");
  const errEl = document.getElementById("signosError");
  const sucEl = document.getElementById("signosSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId) { showError(errEl, "ID del paciente es obligatorio."); return; }
  const btn = document.getElementById("signosBtn");
  setLoading(btn, true);
  const peso = parseFloat(v("sPeso")), talla = parseFloat(v("sTalla"));
  const imc  = (peso && talla && talla >= 50) ? (peso / ((talla/100)**2)).toFixed(1) : "";
  try {
    const data = await apiPost({
      action:"saveSignosVitales", fecha:today(), hora:timeNow(), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("sPacienteNombre"),
      temperatura:v("sTemp"), frecCardiaca:v("sFC"), frecResp:v("sFR"),
      presionArterial:v("sPA"), spo2:v("sSpo2"), glucemia:v("sGlucemia"),
      peso:v("sPeso"), talla:v("sTalla"), imc,
      dolor:v("sDolor"), estadoConciencia:v("sConciencia"), observaciones:v("sObservaciones"),
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Signos vitales guardados.");
      ["sTemp","sFC","sFR","sPA","sSpo2","sGlucemia","sPeso","sTalla","sObservaciones"].forEach(id => setVal(id,""));
      ["sDolor","sConciencia"].forEach(id => setVal(id,""));
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

async function loadSignosChart() {
  const id   = v("sBuscarId") || v("sPacienteId");
  const cont = document.getElementById("signosChart");
  if (!id || !cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div><span>Cargando…</span></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSignosVitales&pacienteId=${encodeURIComponent(id)}`);
    const rows = (data.rows || []).slice(0, 10).reverse();
    if (!rows.length) { cont.innerHTML = `<p class="empty-state">Sin registros de signos.</p>`; return; }
    cont.innerHTML = `
      <div class="signos-table-wrap">
        <table class="signos-table">
          <thead><tr>
            <th>Fecha</th><th>Hora</th><th>Temp.</th><th>FC</th><th>FR</th><th>PA</th><th>SpO₂</th><th>Glucemia</th><th>Dolor</th><th>Conciencia</th>
          </tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td>${formatDate(r.fecha)}</td>
              <td>${sanitize(r.hora||"—")}</td>
              <td>${r.temperatura ? sanitize(r.temperatura)+"°C" : "—"}</td>
              <td>${r.frecCardiaca ? sanitize(r.frecCardiaca)+" lpm" : "—"}</td>
              <td>${r.frecResp ? sanitize(r.frecResp)+" rpm" : "—"}</td>
              <td>${r.presionArterial ? sanitize(r.presionArterial)+" mmHg" : "—"}</td>
              <td>${r.spo2 ? sanitize(r.spo2)+"%" : "—"}</td>
              <td>${r.glucemia ? sanitize(r.glucemia)+" mg/dl" : "—"}</td>
              <td>${dolorBadge(r.dolor)}</td>
              <td>${sanitize(r.estadoConciencia||"—")}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar.</p>`; }
}

function dolorBadge(dolor) {
  if (!dolor && dolor !== 0) return "—";
  const n = parseInt(dolor);
  const cls = n <= 3 ? "dolor-leve" : n <= 6 ? "dolor-mod" : "dolor-sev";
  return `<span class="dolor-badge ${cls}">${sanitize(String(dolor))}/10</span>`;
}

// ─────────────────────────────────────────────────────────────
// 💧  BALANCE HÍDRICO
// ─────────────────────────────────────────────────────────────
async function saveBalance() {
  const pacId = v("bPacienteId");
  const errEl = document.getElementById("balanceError");
  const sucEl = document.getElementById("balanceSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId) { showError(errEl, "ID del paciente es obligatorio."); return; }
  const btn = document.getElementById("balanceBtn");
  setLoading(btn, true);
  const iOral   = parseFloat(document.getElementById("bIngestaOral")?.value)       || 0;
  const iParent = parseFloat(document.getElementById("bIngestaParenteral")?.value)  || 0;
  const eUrina  = parseFloat(document.getElementById("bEliminacionUrinaria")?.value)|| 0;
  const eHeces  = parseFloat(document.getElementById("bEliminacionHeces")?.value)   || 0;
  const eDren   = parseFloat(document.getElementById("bEliminacionDrenajes")?.value)|| 0;
  const eOtros  = parseFloat(document.getElementById("bEliminacionOtros")?.value)   || 0;
  const iTotal  = iOral + iParent;
  const eTotal  = eUrina + eHeces + eDren + eOtros;
  try {
    const data = await apiPost({
      action:"saveBalance", fecha:today(), turno:v("bTurno"), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("bPacienteNombre"),
      ingestaOral:iOral, ingestaParenteral:iParent, ingestaTotal:iTotal,
      eliminacionUrinaria:eUrina, eliminacionHeces:eHeces,
      eliminacionDrenajes:eDren, eliminacionOtros:eOtros, eliminacionTotal:eTotal,
      balance:(iTotal - eTotal), observaciones:v("bObservaciones"),
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Balance hídrico guardado.");
      ["bIngestaOral","bIngestaParenteral","bEliminacionUrinaria","bEliminacionHeces","bEliminacionDrenajes","bEliminacionOtros","bObservaciones"].forEach(id => setVal(id,""));
      setVal("bTurno",""); calcBalance();
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

// ─────────────────────────────────────────────────────────────
// 📝  NOTAS DE ENFERMERÍA
// ─────────────────────────────────────────────────────────────
async function saveNota() {
  const pacId = v("nPacienteId"), nota = v("nNota");
  const errEl = document.getElementById("notasError");
  const sucEl = document.getElementById("notasSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId || !nota) { showError(errEl, "ID del paciente y nota son obligatorios."); return; }
  const btn = document.getElementById("notasBtn");
  setLoading(btn, true);
  const firma = `${currentUser.nombre} — ${new Date().toLocaleDateString("es-CO")}`;
  try {
    const data = await apiPost({
      action:"saveNota", fecha:today(), hora:timeNow(), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("nPacienteNombre"),
      turno:v("nTurno"), tipoNota:v("nTipoNota"), nota, firmado:firma,
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Nota de enfermería guardada.");
      setVal("nNota",""); setVal("nTurno",""); setVal("nTipoNota","");
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

async function loadNotasRecientes() {
  const id   = v("nBuscarId") || v("nPacienteId");
  const cont = document.getElementById("notasLista");
  if (!id || !cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div><span>Cargando…</span></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getNotas&pacienteId=${encodeURIComponent(id)}`);
    const rows = data.rows || [];
    if (!rows.length) { cont.innerHTML = `<p class="empty-state">Sin notas registradas.</p>`; return; }
    cont.innerHTML = rows.slice(0,5).map(r => `
      <div class="record-item">
        <div class="record-header">
          <span class="record-badge">📝 ${sanitize(r.tipoNota || "Nota")}</span>
          <span class="record-date">${formatDate(r.fecha)} ${sanitize(r.hora||"")} · Turno ${sanitize(r.turno||"")}</span>
        </div>
        <div class="record-body nota-texto">${sanitize(r.nota)}</div>
        <div class="firma-small">✍ ${sanitize(r.firmado||"")}</div>
      </div>`).join("");
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar.</p>`; }
}

// ─────────────────────────────────────────────────────────────
// ✅  CONSENTIMIENTO
// ─────────────────────────────────────────────────────────────
async function saveConsentimiento() {
  const pacId = v("coPacienteId"), proc = v("coProcedimiento");
  const errEl = document.getElementById("consentError");
  const sucEl = document.getElementById("consentSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId || !proc) { showError(errEl, "ID del paciente y procedimiento son obligatorios."); return; }
  const btn = document.getElementById("consentBtn");
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action:"saveConsentimiento", fecha:now(), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("coPacienteNombre"),
      procedimiento:proc, descripcion:v("coDescripcion"),
      riesgos:v("coRiesgos"), alternativas:v("coAlternativas"),
      pacienteAcepta:document.getElementById("coAcepta")?.checked ? "Sí" : "No",
      testigo:v("coTestigo"), observaciones:v("coObservaciones"),
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Consentimiento registrado.");
      ["coPacienteId","coPacienteNombre","coProcedimiento","coDescripcion","coRiesgos","coAlternativas","coTestigo","coObservaciones"].forEach(id => setVal(id,""));
      const cb = document.getElementById("coAcepta"); if (cb) cb.checked = false;
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

// ─────────────────────────────────────────────────────────────
// 📄  EPICRISIS
// ─────────────────────────────────────────────────────────────
async function saveEpicrisis() {
  const pacId = v("epPacienteId");
  const errEl = document.getElementById("epicrisisError");
  const sucEl = document.getElementById("epicrisisSuccess");
  hide(errEl); hide(sucEl);
  if (!pacId) { showError(errEl, "ID del paciente es obligatorio."); return; }
  const btn = document.getElementById("epicrisisBtn");
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action:"saveEpicrisis", fechaEgreso:today(), registradoPor:currentUser.nombre,
      pacienteId:pacId, pacienteNombre:v("epPacienteNombre"),
      fechaIngreso:v("epFechaIngreso"), diasEstancia:v("epDias"),
      motivoIngreso:v("epMotivoIngreso"), resumenEvolucion:v("epResumen"),
      procedimientosRealizados:v("epProcedimientos"),
      diagnosticoEgreso:v("epDiagnostico"), codigoCIE10Egreso:v("epCIE10"),
      condicionEgreso:v("epCondicion"), tipoEgreso:v("epTipoEgreso"),
      recomendaciones:v("epRecomendaciones"), medicamentosEgreso:v("epMedicamentos"), citas:v("epCitas"),
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Epicrisis guardada correctamente.");
      ["epPacienteId","epPacienteNombre","epFechaIngreso","epDias","epMotivoIngreso","epResumen","epProcedimientos","epDiagnostico","epCIE10","epRecomendaciones","epMedicamentos","epCitas"].forEach(id => setVal(id,""));
      ["epCondicion","epTipoEgreso"].forEach(id => setVal(id,""));
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

// ─────────────────────────────────────────────────────────────
// ⭐  EVALUACIONES (Docente)
// ─────────────────────────────────────────────────────────────
async function saveEvaluacion() {
  const estId = v("evalEstId"), comp = v("evalCompetencia");
  const errEl = document.getElementById("evalError");
  const sucEl = document.getElementById("evalSuccess");
  hide(errEl); hide(sucEl);
  if (!estId || !comp) { showError(errEl, "ID del estudiante y competencia son obligatorios."); return; }
  const btn = document.getElementById("evalBtn");
  setLoading(btn, true);
  const firma = `${currentUser.nombre} — ${today()}`;
  try {
    const data = await apiPost({
      action:"saveEvaluacion", fecha:today(), docente:currentUser.nombre,
      estudianteId:estId, estudianteNombre:v("evalEstNombre"),
      pacienteId:v("evalPacienteId"), competencia:comp,
      criterio:v("evalCriterio"), calificacion:v("evalCalificacion"),
      observaciones:v("evalObservaciones"), firmaDocente:firma,
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Evaluación guardada correctamente.");
      ["evalEstId","evalEstNombre","evalPacienteId","evalCriterio","evalObservaciones"].forEach(id => setVal(id,""));
      ["evalCompetencia","evalCalificacion"].forEach(id => setVal(id,""));
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

// ─────────────────────────────────────────────────────────────
// 📨  SOLICITUDES (Paciente)
// ─────────────────────────────────────────────────────────────
async function saveSolicitud() {
  const sol   = v("solSolicitud");
  const errEl = document.getElementById("solicitudError");
  const sucEl = document.getElementById("solicitudSuccess");
  hide(errEl); hide(sucEl);
  if (!sol) { showError(errEl, "Describe tu solicitud."); return; }
  const btn = document.getElementById("solicitudBtn");
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action:"saveSolicitud", fecha:today(), hora:timeNow(),
      pacienteId:currentUser.usuario, pacienteNombre:currentUser.nombre,
      tipoDolor:v("solTipoDolor"), intensidadDolor:v("solIntensidad"),
      solicitud:v("solTipo"), descripcion:sol,
    });
    if (data.success) {
      showMsgEl(sucEl, "✅ Solicitud enviada al equipo de enfermería.");
      setVal("solSolicitud",""); setVal("solTipo",""); setVal("solTipoDolor",""); setVal("solIntensidad","");
      loadMisSolicitudes();
    } else showError(errEl, data.message || "Error.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label; }
}

async function loadMisSolicitudes() {
  const cont = document.getElementById("misSolicitudesLista");
  if (!cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSolicitudes&pacienteId=${encodeURIComponent(currentUser.usuario)}`);
    const rows = data.rows || [];
    if (!rows.length) { cont.innerHTML = `<p class="empty-state">No tienes solicitudes aún.</p>`; return; }
    cont.innerHTML = rows.map(r => `
      <div class="record-item">
        <div class="record-header">
          <span class="record-badge">${sanitize(r.solicitud || "Solicitud")}</span>
          <span class="record-date">${formatDate(r.fecha)} ${sanitize(r.hora||"")}</span>
        </div>
        <div class="record-body">${sanitize(r.descripcion)}</div>
        ${r.respuesta ? `<div class="respuesta-box">✅ <b>${sanitize(r.atendidoPor||"Enfermería")}</b>: ${sanitize(r.respuesta)}</div>` : `<span class="pendiente-tag">⏳ Pendiente de respuesta</span>`}
      </div>`).join("");
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error.</p>`; }
}

async function loadMisSignos() {
  const cont = document.getElementById("misSignosContainer");
  if (!cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSignosVitales&pacienteId=${encodeURIComponent(currentUser.usuario)}`);
    const rows = data.rows || [];
    if (!rows.length) { cont.innerHTML = `<p class="empty-state">Sin registros de signos vitales.</p>`; return; }
    cont.innerHTML = `
      <div class="signos-table-wrap">
        <table class="signos-table">
          <thead><tr>
            <th>Fecha</th><th>Temp.</th><th>FC</th><th>FR</th><th>PA</th><th>SpO₂</th><th>Glucemia</th><th>Dolor</th>
          </tr></thead>
          <tbody>
            ${rows.slice(0,10).map(r => `<tr>
              <td>${formatDate(r.fecha)}</td>
              <td>${r.temperatura ? sanitize(r.temperatura)+"°C" : "—"}</td>
              <td>${r.frecCardiaca ? sanitize(r.frecCardiaca)+" lpm" : "—"}</td>
              <td>${r.frecResp ? sanitize(r.frecResp)+" rpm" : "—"}</td>
              <td>${r.presionArterial ? sanitize(r.presionArterial) : "—"}</td>
              <td>${r.spo2 ? sanitize(r.spo2)+"%" : "—"}</td>
              <td>${r.glucemia ? sanitize(r.glucemia)+" mg/dl" : "—"}</td>
              <td>${dolorBadge(r.dolor)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error.</p>`; }
}

// ─────────────────────────────────────────────────────────────
// 📋  HISTORIAL PACIENTE
// ─────────────────────────────────────────────────────────────
async function loadHistorialPaciente() {
  const cont = document.getElementById("historialContainer");
  if (!cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div><span>Cargando historial…</span></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getHistorialPaciente&pacienteId=${encodeURIComponent(currentUser.usuario)}`);
    if (!data.success) { cont.innerHTML = `<p class="empty-state">Sin historial registrado.</p>`; return; }

    const hcs    = data.historias || [];
    const signos = data.signos    || [];
    const kards  = data.kardex    || [];
    const notas  = data.notas     || [];
    const citas  = data.citas     || [];

    if (!hcs.length && !signos.length && !kards.length) {
      cont.innerHTML = `<p class="empty-state">Tu historial médico aparecerá aquí cuando el equipo de enfermería registre información.</p>`; return;
    }

    cont.innerHTML = `
      <div class="historial-tabs">
        <button class="hist-tab active" onclick="showHistorialSec('hist-hcs',this)">📄 Historias (${hcs.length})</button>
        <button class="hist-tab" onclick="showHistorialSec('hist-signos',this)">📊 Signos (${signos.length})</button>
        <button class="hist-tab" onclick="showHistorialSec('hist-meds',this)">💊 Medicamentos (${kards.length})</button>
        <button class="hist-tab" onclick="showHistorialSec('hist-notas',this)">📝 Notas (${notas.length})</button>
        <button class="hist-tab" onclick="showHistorialSec('hist-citas',this)">📅 Citas (${citas.length})</button>
      </div>

      <div id="hist-hcs" class="hist-section">
        ${hcs.length ? hcs.map(h => `
          <div class="record-item">
            <div class="record-header">
              <span class="record-badge">📄 Historia Clínica</span>
              <span class="record-date">${formatDate(h.fecha)}</span>
            </div>
            <div class="record-body">
              <b>Motivo:</b> ${sanitize(h.motivo||"—")}<br>
              <b>Diagnóstico:</b> ${sanitize(h.diagnostico||"—")} ${h.codigoCIE10 ? "("+sanitize(h.codigoCIE10)+")" : ""}<br>
              <b>Plan:</b> ${sanitize(h.plan||"—")}
            </div>
          </div>`).join("") : "<p class='empty-state'>Sin historias.</p>"}
      </div>

      <div id="hist-signos" class="hist-section" style="display:none;">
        ${signos.length ? `<div class="signos-table-wrap"><table class="signos-table">
          <thead><tr><th>Fecha</th><th>Temp.</th><th>FC</th><th>PA</th><th>SpO₂</th><th>Dolor</th></tr></thead>
          <tbody>${signos.slice(0,10).map(r => `<tr>
            <td>${formatDate(r.fecha)}</td>
            <td>${r.temperatura||"—"}</td><td>${r.frecCardiaca||"—"}</td>
            <td>${r.presionArterial||"—"}</td><td>${r.spo2||"—"}</td>
            <td>${dolorBadge(r.dolor)}</td>
          </tr>`).join("")}</tbody>
        </table></div>` : "<p class='empty-state'>Sin signos vitales.</p>"}
      </div>

      <div id="hist-meds" class="hist-section" style="display:none;">
        ${kards.length ? kards.slice(0,10).map(r => `
          <div class="record-item">
            <div class="record-header">
              <span class="record-badge">💊 ${sanitize(r.medicamento)}</span>
              <span class="record-date">${formatDate(r.fecha)}</span>
            </div>
            <div class="record-body">${sanitize(r.dosis)} · ${sanitize(r.via)} · ${sanitize(r.frecuencia)}</div>
          </div>`).join("") : "<p class='empty-state'>Sin medicamentos registrados.</p>"}
      </div>

      <div id="hist-notas" class="hist-section" style="display:none;">
        ${notas.length ? notas.slice(0,5).map(r => `
          <div class="record-item">
            <div class="record-header">
              <span class="record-badge">📝 ${sanitize(r.tipoNota||"Nota")}</span>
              <span class="record-date">${formatDate(r.fecha)}</span>
            </div>
            <div class="record-body nota-texto">${sanitize(r.nota)}</div>
          </div>`).join("") : "<p class='empty-state'>Sin notas.</p>"}
      </div>

      <div id="hist-citas" class="hist-section" style="display:none;">
        ${citas.length ? citas.map(c => `
          <div class="record-item">
            <div class="record-header">
              <span class="record-badge cita-estado-${sanitize((c.estado||"").toLowerCase().replace(/ /g,"-"))}">📅 ${sanitize(c.estado||"Cita")}</span>
              <span class="record-date">${sanitize(c.fecha)} ${sanitize(c.hora||"")}</span>
            </div>
            <div class="record-body">
              <b>${sanitize(c.medicoNombre||"—")}</b> · ${sanitize(c.especialidad||"")}
              ${c.motivo ? `<br>Motivo: ${sanitize(c.motivo)}` : ""}
              ${c.penalidad ? `<br><span class="warn-tag">⚠️ ${sanitize(c.penalidad)}</span>` : ""}
            </div>
          </div>`).join("") : "<p class='empty-state'>Sin citas registradas.</p>"}
      </div>
    `;
  } catch(e) { cont.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar historial.</p>`; }
}

function showHistorialSec(secId, btn) {
  document.querySelectorAll(".hist-section").forEach(s => s.style.display = "none");
  document.querySelectorAll(".hist-tab").forEach(b => b.classList.remove("active"));
  const sec = document.getElementById(secId);
  if (sec) sec.style.display = "block";
  if (btn) btn.classList.add("active");
}

// ─────────────────────────────────────────────────────────────
// 📅  CITAS — MÓDULO PACIENTE
// ─────────────────────────────────────────────────────────────
async function loadMedicos() {
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getMedicos`);
    medicosList = data.medicos || [];
    renderMedicosGrid(medicosList);
  } catch { console.warn("No se pudieron cargar médicos."); }
}

function filtrarMedicosPorEsp() {
  const esp = v("citaEspecialidad");
  const filtrados = esp ? medicosList.filter(m => m.especialidad === esp) : medicosList;
  renderMedicosGrid(filtrados);
  // Reset selección
  citaMedicoSel = null; citaFechaSel = null; citaHoraSel = null;
  hide(document.getElementById("calendarioCitaCard"));
  hide(document.getElementById("confirmarCitaCard"));
}

function renderMedicosGrid(medicos) {
  const cont = document.getElementById("medicosDisponiblesContainer");
  if (!cont) return;
  if (!medicos.length) { cont.innerHTML = `<p class="empty-state">No hay médicos disponibles para esa especialidad.</p>`; return; }
  cont.innerHTML = medicos.map(m => `
    <div class="medico-card" onclick="seleccionarMedico(${JSON.stringify(m).replace(/"/g,'&quot;')})">
      <div class="medico-avatar">${getInitials(m.nombre)}</div>
      <div class="medico-info">
        <h4>${sanitize(m.nombre)}</h4>
        <p class="medico-esp">${sanitize(m.especialidad)}</p>
        <p class="medico-disp">📅 Ver disponibilidad</p>
      </div>
      <div class="medico-arrow">›</div>
    </div>
  `).join("");
}

function seleccionarMedico(medico) {
  citaMedicoSel = medico;
  citaFechaSel  = null;
  citaHoraSel   = null;
  // Mostrar banner del médico
  const banner = document.getElementById("medicoSelBanner");
  if (banner) banner.innerHTML = `<span class="medico-sel-chip">👨‍⚕️ ${sanitize(medico.nombre)} · ${sanitize(medico.especialidad)}</span>`;
  // Mostrar tarjeta de calendario
  const calCard = document.getElementById("calendarioCitaCard");
  show(calCard);
  hide(document.getElementById("confirmarCitaCard"));
  hide(document.getElementById("horariosContainer"));
  // Cargar citas ya reservadas para este médico
  loadCitasReservadas(medico.id);
  renderCalendario();
  calCard.scrollIntoView({ behavior: "smooth" });
}

async function loadCitasReservadas(medicoId) {
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getCitas&medicoId=${encodeURIComponent(medicoId)}`);
    citasReservadas = (data.rows || []).filter(c => c.estado !== "Cancelada");
  } catch { citasReservadas = []; }
}

// ── Calendario ────────────────────────────────────────────────
function renderCalendario() {
  const label = document.getElementById("calMesLabel");
  const grid  = document.getElementById("calendarioGrid");
  if (!label || !grid) return;

  const hoy    = new Date();
  const year   = calCurrentDate.getFullYear();
  const month  = calCurrentDate.getMonth();
  const meses  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  label.textContent = `${meses[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dias = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

  let html = dias.map(d => `<div class="cal-day-name">${d}</div>`).join("");
  // Celdas vacías iniciales
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const fecha = new Date(year, month, d);
    const isPast = fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const diaSemana = fecha.getDay(); // 0=Dom,6=Sáb
    const diasNombres = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const diaKey = diasNombres[diaSemana];
    const horarios = citaMedicoSel?.horarios || {};
    const tieneHorario = horarios[diaKey] && horarios[diaKey].length > 0;
    const isSelected = fechaStr === citaFechaSel;

    let cls = "cal-cell";
    if (isPast || !tieneHorario) cls += " disabled";
    else cls += " available";
    if (isSelected) cls += " selected";

    html += `<div class="${cls}" ${!isPast && tieneHorario ? `onclick="seleccionarFecha('${fechaStr}','${diaKey}')"` : ""}>
      ${d}${tieneHorario && !isPast ? '<span class="cal-dot"></span>' : ""}
    </div>`;
  }
  grid.innerHTML = html;
}

function cambiarMes(dir) {
  calCurrentDate.setMonth(calCurrentDate.getMonth() + dir);
  renderCalendario();
}

function seleccionarFecha(fechaStr, diaKey) {
  citaFechaSel = fechaStr;
  citaHoraSel  = null;
  renderCalendario();

  const horariosDia = citaMedicoSel?.horarios?.[diaKey] || [];
  // Filtrar horas ya reservadas
  const reservadas = citasReservadas
    .filter(c => c.medicoId === citaMedicoSel.id && c.fecha === fechaStr)
    .map(c => c.hora);

  const horasCont = document.getElementById("horariosContainer");
  const horasGrid = document.getElementById("horariosGrid");
  const fechaLabel = document.getElementById("fechaSelLabel");
  if (!horasCont || !horasGrid) return;

  fechaLabel.textContent = new Date(fechaStr + "T12:00:00").toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long" });
  horasGrid.innerHTML = horariosDia.map(hora => {
    const libre = !reservadas.includes(hora);
    return `<button class="hora-btn ${libre ? "" : "hora-ocupada"}"
      ${libre ? `onclick="seleccionarHora('${hora}')"` : "disabled"}
      title="${libre ? "Disponible" : "Ocupado"}">
      ${hora} ${libre ? "" : "🔒"}
    </button>`;
  }).join("");

  show(horasCont);
}

function seleccionarHora(hora) {
  citaHoraSel = hora;
  document.querySelectorAll(".hora-btn").forEach(b => b.classList.remove("selected-hora"));
  event.target.classList.add("selected-hora");

  // Mostrar tarjeta de confirmación
  const confirmarCard = document.getElementById("confirmarCitaCard");
  const resumen       = document.getElementById("citaResumen");
  const fechaDisplay  = new Date(citaFechaSel + "T12:00:00").toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  resumen.innerHTML = `
    <div class="cita-resumen-grid">
      <div class="cita-res-item"><span>👨‍⚕️ Médico</span><strong>${sanitize(citaMedicoSel.nombre)}</strong></div>
      <div class="cita-res-item"><span>🏥 Especialidad</span><strong>${sanitize(citaMedicoSel.especialidad)}</strong></div>
      <div class="cita-res-item"><span>📅 Fecha</span><strong>${fechaDisplay}</strong></div>
      <div class="cita-res-item"><span>🕐 Hora</span><strong>${hora}</strong></div>
    </div>`;
  show(confirmarCard);
  confirmarCard.scrollIntoView({ behavior:"smooth" });
}

function resetAgendarCita() {
  citaFechaSel = null; citaHoraSel = null;
  hide(document.getElementById("confirmarCitaCard"));
  hide(document.getElementById("horariosContainer"));
  renderCalendario();
}

async function confirmarCita() {
  if (!citaMedicoSel || !citaFechaSel || !citaHoraSel) {
    showToast("Selecciona médico, fecha y hora antes de confirmar."); return;
  }
  const errEl = document.getElementById("citaError");
  const sucEl = document.getElementById("citaSuccess");
  hide(errEl); hide(sucEl);
  const btn = document.getElementById("citaBtn");
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action:"saveCita",
      pacienteId:     currentUser.usuario,
      pacienteNombre: currentUser.nombre,
      medicoId:       citaMedicoSel.id,
      medicoNombre:   citaMedicoSel.nombre,
      especialidad:   citaMedicoSel.especialidad,
      fecha:          citaFechaSel,
      hora:           citaHoraSel,
      motivo:         v("citaMotivo"),
      notas:          "",
    });
    if (data.success) {
      showMsgEl(sucEl, `✅ ${data.message}`);
      showToast("🗓 Cita confirmada exitosamente");
      // Reset
      citaMedicoSel = null; citaFechaSel = null; citaHoraSel = null;
      setVal("citaMotivo","");
      hide(document.getElementById("confirmarCitaCard"));
      hide(document.getElementById("calendarioCitaCard"));
      hide(document.getElementById("horariosContainer"));
      renderMedicosGrid(medicosList);
      loadMisCitas();
    } else showError(errEl, data.message || "Error al agendar.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label || "<span>Confirmar Cita ✅</span>"; }
}

async function loadMisCitas() {
  const cont = document.getElementById("misCitasLista");
  if (!cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div><span>Cargando citas…</span></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getCitas&pacienteId=${encodeURIComponent(currentUser.usuario)}`);
    const citas = data.rows || [];
    if (!citas.length) { cont.innerHTML = `<p class="empty-state">No tienes citas agendadas.</p>`; return; }
    const hoy = new Date().toISOString().split("T")[0];
    cont.innerHTML = citas.map(c => {
      const isPast   = c.fecha < hoy;
      const isCance  = c.estado === "Cancelada";
      return `
        <div class="cita-card ${isCance ? "cita-cancelada" : isPast ? "cita-pasada" : "cita-activa"}">
          <div class="cita-card-header">
            <div>
              <h4>${sanitize(c.medicoNombre||"—")}</h4>
              <p class="cita-esp">${sanitize(c.especialidad||"")}</p>
            </div>
            <div class="cita-fecha-hora">
              <span class="cita-fecha">${sanitize(c.fecha)}</span>
              <span class="cita-hora">${sanitize(c.hora)}</span>
            </div>
          </div>
          <div class="cita-card-footer">
            <span class="cita-estado-badge ${sanitize(c.estado||"").toLowerCase().replace(/ /g,"-")}">${sanitize(c.estado||"—")}</span>
            ${!isCance && !isPast ? `
              <div class="cita-acciones">
                <button class="btn-sm btn-warn" onclick="abrirCancelarCita('${sanitize(c.id)}','${sanitize(c.fecha)}','${sanitize(c.hora)}')">❌ Cancelar</button>
                <button class="btn-sm btn-accent" onclick="abrirReprogramar('${sanitize(c.id)}','${sanitize(c.medicoId)}')">🔄 Reprogramar</button>
              </div>` : ""}
            ${c.penalidad ? `<span class="warn-tag" style="margin-top:.4rem">⚠️ ${sanitize(c.penalidad)}</span>` : ""}
          </div>
          ${c.motivo ? `<p class="cita-motivo">💬 ${sanitize(c.motivo)}</p>` : ""}
        </div>`;
    }).join("");
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar citas.</p>`; }
}

function abrirCancelarCita(citaId, fecha, hora) {
  const modal   = document.getElementById("citaModal");
  const content = document.getElementById("citaModalContent");
  const hoy     = new Date();
  const fechaCita = new Date(fecha + "T" + hora);
  const diffH   = (fechaCita - hoy) / (1000 * 60 * 60);
  const advertencia = diffH < 24 ? `<div class="info-box warn">⚠️ Estás cancelando con menos de 24 horas de anticipación. Se generará un cargo simbólico de inasistencia.</div>` : "";
  content.innerHTML = `
    <h3 style="margin-bottom:1rem;">❌ Cancelar Cita</h3>
    <p>Cita del <b>${sanitize(fecha)}</b> a las <b>${sanitize(hora)}</b></p>
    ${advertencia}
    <div class="form-group" style="margin-top:1rem;">
      <label>Motivo de cancelación</label>
      <textarea id="motivoCancelacion" rows="3" placeholder="¿Por qué cancelas?"></textarea>
    </div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="document.getElementById('citaModal').style.display='none'">Volver</button>
      <button class="btn-danger" onclick="ejecutarCancelar('${citaId}')">Confirmar cancelación</button>
    </div>`;
  modal.style.display = "flex";
}

async function ejecutarCancelar(citaId) {
  const motivo = document.getElementById("motivoCancelacion")?.value || "";
  try {
    const data = await apiPost({ action:"cancelarCita", citaId, motivoCancelacion:motivo });
    document.getElementById("citaModal").style.display = "none";
    if (data.success) {
      showToast(data.penalidad ? `Cita cancelada. ${data.penalidad}` : "Cita cancelada correctamente.");
      loadMisCitas();
    } else showToast("Error: " + (data.message || "Error desconocido"));
  } catch { showToast("Error de conexión."); }
}

function abrirReprogramar(citaId, medicoId) {
  const modal   = document.getElementById("citaModal");
  const content = document.getElementById("citaModalContent");
  // Encontrar el médico
  const medico = medicosList.find(m => m.id === medicoId);
  if (!medico) { showToast("Médico no encontrado."); return; }
  content.innerHTML = `
    <h3 style="margin-bottom:1rem;">🔄 Reprogramar Cita</h3>
    <p>Elige una nueva fecha y hora con <b>${sanitize(medico.nombre)}</b></p>
    <div class="form-group" style="margin-top:1rem;">
      <label>Nueva fecha</label>
      <input type="date" id="nuevaFechaRep" min="${new Date().toISOString().split('T')[0]}" />
    </div>
    <div class="form-group">
      <label>Nueva hora</label>
      <select id="nuevaHoraRep"><option value="">Seleccionar hora…</option></select>
    </div>
    <div id="repError" class="error-msg" style="display:none;"></div>
    <div class="form-actions">
      <button class="btn-secondary" onclick="document.getElementById('citaModal').style.display='none'">Volver</button>
      <button class="btn-primary" onclick="ejecutarReprogramar('${citaId}','${medicoId}')">Confirmar</button>
    </div>`;

  // Llenar horas cuando cambia la fecha
  document.getElementById("nuevaFechaRep").addEventListener("change", function() {
    const fecha = this.value;
    const dia   = new Date(fecha + "T12:00:00").getDay();
    const dias  = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const horas = medico.horarios?.[dias[dia]] || [];
    const sel   = document.getElementById("nuevaHoraRep");
    sel.innerHTML = horas.length
      ? `<option value="">Seleccionar…</option>` + horas.map(h => `<option>${h}</option>`).join("")
      : `<option value="">Sin horarios ese día</option>`;
  });

  modal.style.display = "flex";
}

async function ejecutarReprogramar(citaId, medicoId) {
  const nuevaFecha = document.getElementById("nuevaFechaRep")?.value;
  const nuevaHora  = document.getElementById("nuevaHoraRep")?.value;
  const errEl      = document.getElementById("repError");
  if (!nuevaFecha || !nuevaHora) { showError(errEl, "Selecciona fecha y hora."); return; }
  try {
    const data = await apiPost({ action:"reprogramarCita", citaId, medicoId, nuevaFecha, nuevaHora });
    document.getElementById("citaModal").style.display = "none";
    if (data.success) { showToast(data.message); loadMisCitas(); }
    else showToast("Error: " + (data.message || "Error desconocido"));
  } catch { showToast("Error de conexión."); }
}

function showCitasSubtab(id, btn) {
  document.querySelectorAll(".citas-subpanel").forEach(p => p.style.display = "none");
  document.querySelectorAll(".citas-subtab").forEach(b => b.classList.remove("active"));
  const panel = document.getElementById(id);
  if (panel) panel.style.display = "block";
  if (btn)   btn.classList.add("active");
  if (id === "misCitas") loadMisCitas();
}

function closeCitaModal(e) {
  if (e.target === document.getElementById("citaModal")) document.getElementById("citaModal").style.display = "none";
}

// ─────────────────────────────────────────────────────────────
// 🔧  GESTIÓN DE USUARIOS (Administrador)
// ─────────────────────────────────────────────────────────────
async function crearUsuario() {
  const usuario = v("nuUsuario"), password = v("nuPassword");
  const nombre  = v("nuNombre"),  rol = v("nuRol");
  const errEl   = document.getElementById("nuError");
  const sucEl   = document.getElementById("nuSuccess");
  hide(errEl); hide(sucEl);
  if (!usuario || !password || !nombre || !rol) {
    showError(errEl, "Todos los campos son obligatorios."); return;
  }
  if (password.length < 6) { showError(errEl, "La contraseña debe tener mínimo 6 caracteres."); return; }
  const btn = document.getElementById("nuBtn");
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action:"crearUsuario", usuario, password, nombre, rol,
      creadoPor: currentUser.usuario,
    });
    if (data.success) {
      showMsgEl(sucEl, `✅ ${data.message}`);
      setVal("nuUsuario",""); setVal("nuPassword",""); setVal("nuNombre",""); setVal("nuRol","");
      loadUsuarios();
    } else showError(errEl, data.message || "Error al crear usuario.");
  } catch { showError(errEl, "Error de conexión."); }
  finally { setLoading(btn, false); btn.innerHTML = btn.dataset.label || "<span>Crear Usuario 👤</span>"; }
}

async function loadUsuarios() {
  const cont = document.getElementById("usuariosLista");
  if (!cont) return;
  cont.innerHTML = `<div class="loading-msg"><div class="spinner"></div><span>Cargando…</span></div>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getUsuarios&solicitante=${encodeURIComponent(currentUser.usuario)}`);
    const rows = data.rows || [];
    if (!rows.length) { cont.innerHTML = `<p class="empty-state">No hay usuarios registrados.</p>`; return; }
    const rolColors = { administrador:"navy", docente:"accent", estudiante:"mint", enfermero:"mint-lt", paciente:"warn" };
    cont.innerHTML = `
      <div class="usuarios-table-wrap">
        <table class="signos-table">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Creado por</th><th>Acción</th></tr></thead>
          <tbody>
            ${rows.map(u => {
              const activo = u.activo === "TRUE" || u.activo === "TRUE" || u.activo === true;
              return `<tr>
                <td><code>${sanitize(u.usuario)}</code></td>
                <td>${sanitize(u.nombre)}</td>
                <td><span class="rol-chip">${sanitize(u.rol)}</span></td>
                <td>${activo ? `<span class="estado-activo">✅ Activo</span>` : `<span class="estado-inactivo">⛔ Inactivo</span>`}</td>
                <td>${sanitize(u.creadoPor||"sistema")}</td>
                <td>
                  <button class="btn-sm ${activo ? "btn-warn" : "btn-accent"}"
                    onclick="toggleUsuario('${sanitize(u.usuario)}','${activo ? "FALSE" : "TRUE"}')">
                    ${activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  } catch { cont.innerHTML = `<p class="error-msg" style="display:block;">Error al cargar usuarios.</p>`; }
}

async function toggleUsuario(usuario, nuevoEstado) {
  try {
    const data = await apiPost({ action:"toggleUsuario", usuario, activo:nuevoEstado });
    if (data.success) { showToast(`Usuario ${nuevoEstado === "TRUE" ? "activado" : "desactivado"}.`); loadUsuarios(); }
    else showToast("Error: " + data.message);
  } catch { showToast("Error de conexión."); }
}

// ─────────────────────────────────────────────────────────────
// 🔍  MODAL DETALLE PACIENTE
// ─────────────────────────────────────────────────────────────
function openPatientModal(p) {
  const modal   = document.getElementById("hcModal");
  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <div class="modal-hero">
      <div class="modal-avatar">${getInitials(p.nombre)}</div>
      <div>
        <h2>${sanitize(p.nombre||"—")}</h2>
        <p class="modal-id">ID: ${sanitize(p.identificacion||"—")} · ${calcAge(p.fechaNacimiento)} · ${sanitize(p.sexo||"—")}</p>
        <p class="modal-eps">${sanitize(p.eps||"Sin EPS")} · ${sanitize(p.regimen||"—")}</p>
      </div>
    </div>
    <div class="modal-section">
      <h4>Signos Vitales</h4>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem;">
        ${vitalChip("🌡️","Temp.",p.temperatura,"°C")}
        ${vitalChip("❤️","FC",p.frecCardiaca," lpm")}
        ${vitalChip("🫁","FR",p.frecResp," rpm")}
        ${vitalChip("💉","PA",p.presionArterial," mmHg")}
        ${vitalChip("🩺","SpO₂",p.spo2,"%")}
        ${vitalChip("⚖️","Peso",p.peso," kg")}
        ${vitalChip("📏","Talla",p.talla," cm")}
        ${vitalChip("🩸","Glucemia",p.glucemia," mg/dl")}
        ${vitalChip("📊","IMC",p.imc,"")}
      </div>
    </div>
    ${p.motivo ? `<div class="modal-section"><h4>Motivo de consulta</h4><p class="modal-text">${sanitize(p.motivo)}</p></div>` : ""}
    ${p.enfermedadActual ? `<div class="modal-section"><h4>Enfermedad actual</h4><p class="modal-text">${sanitize(p.enfermedadActual)}</p></div>` : ""}
    ${p.diagnostico ? `<div class="modal-section"><h4>Diagnóstico ${p.codigoCIE10?"("+sanitize(p.codigoCIE10)+")":""}</h4><p class="modal-text">${sanitize(p.diagnostico)}</p></div>` : ""}
    ${p.plan ? `<div class="modal-section"><h4>Plan / Intervenciones</h4><p class="modal-text">${sanitize(p.plan)}</p></div>` : ""}
    ${p.alergias ? `<div class="modal-section"><h4>⚠️ Alergias</h4><p class="modal-text" style="color:var(--danger)">${sanitize(p.alergias)}</p></div>` : ""}
    <div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap;">
      <button class="btn-accent btn-sm" onclick="prefillKardex('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-kardex');closeModalBtn()">💊 Kárdex</button>
      <button class="btn-accent btn-sm" onclick="prefillSignos('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-signos');closeModalBtn()">📊 Signos</button>
      <button class="btn-accent btn-sm" onclick="prefillBalance('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-balance');closeModalBtn()">💧 Balance</button>
      <button class="btn-accent btn-sm" onclick="prefillNota('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-notas');closeModalBtn()">📝 Nota</button>
      <button class="btn-accent btn-sm" onclick="prefillConsentimiento('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-consentimiento');closeModalBtn()">✅ Consentim.</button>
      <button class="btn-accent btn-sm" onclick="prefillEpicrisis('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-epicrisis');closeModalBtn()">📄 Epicrisis</button>
    </div>`;
  modal.style.display = "flex";
}

function prefillKardex(id, n)          { setVal("kPacienteId",id); setVal("kPacienteNombre",n); setVal("kBuscarId",id); }
function prefillSignos(id, n)          { setVal("sPacienteId",id); setVal("sPacienteNombre",n); setVal("sBuscarId",id); loadSignosChart(); }
function prefillBalance(id, n)         { setVal("bPacienteId",id); setVal("bPacienteNombre",n); }
function prefillNota(id, n)            { setVal("nPacienteId",id); setVal("nPacienteNombre",n); setVal("nBuscarId",id); loadNotasRecientes(); }
function prefillConsentimiento(id, n)  { setVal("coPacienteId",id); setVal("coPacienteNombre",n); }
function prefillEpicrisis(id, n)       { setVal("epPacienteId",id); setVal("epPacienteNombre",n); }

function vitalChip(icon, label, val, unit) {
  if (!val && val !== 0) return "";
  return `<span class="vital-chip">${icon} <strong>${label}</strong> ${sanitize(String(val))}${unit}</span>`;
}
function closeModal(e)   { if (e.target === document.getElementById("hcModal")) closeModalBtn(); }
function closeModalBtn() { document.getElementById("hcModal").style.display = "none"; }

// ─────────────────────────────────────────────────────────────
// ⚕️  IMC
// ─────────────────────────────────────────────────────────────
function calcIMC() {
  const peso  = parseFloat(document.getElementById("svPeso")?.value);
  const talla = parseFloat(document.getElementById("svTalla")?.value);
  const imcEl = document.getElementById("imcVal");
  const catEl = document.getElementById("imcCategoria");
  if (!peso || !talla || talla < 50) { imcEl.textContent = "—"; catEl.textContent = ""; catEl.className = "imc-cat"; return; }
  const imc = (peso / ((talla/100)**2)).toFixed(1);
  imcEl.textContent = imc;
  const cat = imc < 18.5 ? ["Bajo peso","imc-bajo"] : imc < 25 ? ["Normal","imc-normal"] : imc < 30 ? ["Sobrepeso","imc-sobre"] : ["Obesidad","imc-obeso"];
  catEl.textContent = cat[0]; catEl.className = `imc-cat ${cat[1]}`;
}

// ─────────────────────────────────────────────────────────────
// 🔄  SELECTS DE PACIENTES
// ─────────────────────────────────────────────────────────────
async function loadPacientesSelect() {
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getPacientes`);
    if (data.pacientes) pacientesList = data.pacientes;
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// 🧹  UTILIDADES
// ─────────────────────────────────────────────────────────────
function clearForm() {
  const ids = [
    "hcNombre","hcId","hcFechaNac","hcSexo","hcGrupoSanguineo","hcDireccion","hcTelefono",
    "hcEps","hcRegimen","hcOcupacion","hcEscolaridad","hcEstadoCivil","hcContactoEmergencia",
    "hcTelefonoEmergencia","hcMotivo","hcEnfermedad","hcAntPersonales","hcAntFamiliares",
    "hcAlergias","svTemp","svFC","svFR","svPA","svSpo2","svPeso","svTalla","svGlucemia",
    "hcExamenFisico","hcDiagnostico","hcCIE10","hcPlan","hcObservaciones",
  ];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; });
  const imcEl = document.getElementById("imcVal");
  const catEl = document.getElementById("imcCategoria");
  if (imcEl) imcEl.textContent = "—";
  if (catEl) { catEl.textContent = ""; catEl.className = "imc-cat"; }
  hide(document.getElementById("formError"));
  hide(document.getElementById("formSuccess"));
}

function v(id)            { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
function setVal(id, val)  { const el = document.getElementById(id); if (el) el.value = val; }
function show(el)         { if (el) el.style.display = ""; }
function hide(el)         { if (el) el.style.display = "none"; }
function showError(el, msg) { if (el) { el.textContent = msg; show(el); } }
function showMsgEl(el, msg) { if (el) { el.textContent = msg; show(el); setTimeout(() => hide(el), 6000); } }
function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled  = loading;
  btn.innerHTML = loading
    ? `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0 auto"></div>`
    : (btn.dataset.label || btn.innerHTML);
}
function showToast(msg, duration = 4000) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg; show(toast);
  clearTimeout(toast._t); toast._t = setTimeout(() => hide(toast), duration);
}
function sanitize(str)  { const d = document.createElement("div"); d.textContent = String(str ?? ""); return d.innerHTML; }
function getInitials(n) { return (n||"").split(" ").slice(0,2).map(w => w[0]||"").join("").toUpperCase() || "?"; }
function formatDate(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-CO", { day:"2-digit", month:"short", year:"numeric" }); }
  catch { return String(iso); }
}
function calcAge(dob) {
  if (!dob) return "—";
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
  return `${age} años`;
}
function togglePass() { const i = document.getElementById("loginPass"); i.type = i.type === "password" ? "text" : "password"; }
function today() { return new Date().toISOString().split("T")[0]; }
function timeNow() { return new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }); }
function now() { return new Date().toISOString(); }

async function apiFetch(url) {
  const res = await fetch(url);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body),
  });
  return res.json();
}

// ── SVG helpers ─────────────────────────────────────────────
function svgPeople() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
function svgDoc()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`; }
function svgClip()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`; }
function svgPill()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v7"/><circle cx="17" cy="17" r="5"/><line x1="17" y1="14" x2="17" y2="20"/><line x1="14" y1="17" x2="20" y2="17"/></svg>`; }
function svgHeart()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`; }
function svgDrop()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`; }
function svgNote()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`; }
function svgCheck()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="20 6 9 17 4 12"/></svg>`; }
function svgExit()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`; }
function svgSearch() { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`; }
function svgStar()   { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`; }
function svgUsers()  { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; }
function svgCal()    { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; }
