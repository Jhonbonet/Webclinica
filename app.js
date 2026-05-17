/* ═══════════════════════════════════════════════════════════════
   ASENORTE · app.js  v2.0
   Sistema Clínico Completo — Enfermero + Paciente + Docente
═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxdGudm__M4fyIAHh2eAWFzrPyYozW6L1snOTKdfyt1japi5Y7FvLo6KMuRaQxshdTgzA/exec",
};

// ─────────────────────────────────────────────────────────────
// 🔐  ESTADO GLOBAL
// ─────────────────────────────────────────────────────────────
let currentUser   = null;
let allPatients   = [];
let pacientesList = [];   // lista de IDs únicos para selects

// ─────────────────────────────────────────────────────────────
// 🚀  INIT
// ─────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  try {
    const saved = sessionStorage.getItem("asenorte_user");
    if (saved) { currentUser = JSON.parse(saved); openDashboard(); }
  } catch { sessionStorage.removeItem("asenorte_user"); }

  document.getElementById("svPeso").addEventListener("input", calcIMC);
  document.getElementById("svTalla").addEventListener("input", calcIMC);
  document.getElementById("loginPass").addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
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
  } catch { showError(errorEl, "No se pudo conectar al servidor."); }
  finally   { setLoading(btn, false); }
}

function handleLogout() {
  sessionStorage.removeItem("asenorte_user");
  currentUser = null; allPatients = []; pacientesList = [];
  showScreen("loginScreen");
}

// ─────────────────────────────────────────────────────────────
// 🖥️  NAVEGACIÓN
// ─────────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => { s.style.display = "none"; s.classList.remove("active"); });
  const target = document.getElementById(id);
  target.style.display = id === "loginScreen" ? "flex" : "block";
  target.classList.add("active");
}

function openDashboard() {
  showScreen("dashboardScreen");
  document.getElementById("welcomeUser").textContent = currentUser.nombre;

  // Mostrar/ocultar tabs según rol
  const rol = (currentUser.rol || "").toLowerCase();
  const isDoc  = rol.includes("docente") || rol.includes("admin");
  const isPac  = rol.includes("paciente");
  const isEnf  = !isPac; // estudiante/enfermero por defecto

  // Ajustar navegación según rol
  buildNav(isEnf, isPac, isDoc);

  loadPatients();
  loadPacientesSelect();

  if (isPac) showTab("tab-solicitudes-pac");
  else       showTab("tab-pacientes");
}

function buildNav(isEnf, isPac, isDoc) {
  const topnav = document.getElementById("topnav");
  const botnav = document.getElementById("bottomnav");
  topnav.innerHTML = "";
  botnav.innerHTML = "";

  const tabs = [];

  if (!isPac) {
    tabs.push({ id:"tab-pacientes",    label:"Pacientes",   icon:svgPeople() });
    tabs.push({ id:"tab-historia",     label:"Nueva HC",    icon:svgDoc() });
    tabs.push({ id:"tab-admision",     label:"Admisión",    icon:svgClip() });
    tabs.push({ id:"tab-kardex",       label:"Kárdex",      icon:svgPill() });
    tabs.push({ id:"tab-signos",       label:"Signos",      icon:svgHeart() });
    tabs.push({ id:"tab-balance",      label:"Balance",     icon:svgDrop() });
    tabs.push({ id:"tab-notas",        label:"Notas",       icon:svgNote() });
    tabs.push({ id:"tab-consentimiento",label:"Consent.",   icon:svgCheck() });
    tabs.push({ id:"tab-epicrisis",    label:"Epicrisis",   icon:svgExit() });
    tabs.push({ id:"tab-buscar",       label:"Buscar",      icon:svgSearch() });
  }
  if (isDoc) {
    tabs.push({ id:"tab-evaluaciones", label:"Evaluar",     icon:svgStar() });
  }
  if (isPac) {
    tabs.push({ id:"tab-solicitudes-pac", label:"Mis Solicitudes", icon:svgNote() });
    tabs.push({ id:"tab-mis-signos",       label:"Mis Signos",     icon:svgHeart() });
  }

  tabs.forEach((t, i) => {
    // Top nav (desktop)
    const btn = document.createElement("button");
    btn.className = "nav-btn" + (i === 0 ? " active" : "");
    btn.dataset.tab = t.id;
    btn.textContent = t.label;
    btn.onclick = () => showTab(t.id);
    topnav.appendChild(btn);

    // Bottom nav (mobile) — solo primeros 5
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
  document.querySelectorAll(".tab-panel").forEach(p => { p.style.display = "none"; p.classList.remove("active"); });
  const panel = document.getElementById(tabId);
  if (panel) { panel.style.display = "block"; panel.classList.add("active"); }
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".bnav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
}

// ─────────────────────────────────────────────────────────────
// 📋  HISTORIAS CLÍNICAS (Tab pacientes)
// ─────────────────────────────────────────────────────────────
async function loadPatients() {
  const list   = document.getElementById("patientList");
  const empty  = document.getElementById("emptyState");
  const loader = document.getElementById("loadingMsg");
  list.innerHTML = ""; hide(empty); show(loader);
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getHistorias`);
    hide(loader);
    if (data.success && data.historias && data.historias.length > 0) {
      allPatients = data.historias;
      renderPatientCards(allPatients, list);
    } else { allPatients = []; show(empty); }
  } catch {
    hide(loader);
    list.innerHTML = `<p class="error-inline">⚠️ Error al cargar datos. Verifica la conexión con Google Sheets.</p>`;
  }
}

function renderPatientCards(patients, container) {
  container.innerHTML = "";
  patients.forEach(p => {
    const card = document.createElement("div");
    card.className = "patient-card";
    card.onclick = () => openPatientModal(p);
    card.innerHTML = `
      <div class="pc-top">
        <div class="pc-avatar">${getInitials(p.nombre)}</div>
        <span class="pc-badge">${sanitize(p.sexo || "—")}</span>
      </div>
      <div class="pc-name">${sanitize(p.nombre)}</div>
      <div class="pc-id">ID: ${sanitize(p.identificacion)}</div>
      ${p.diagnostico ? `<div class="pc-diag">${sanitize(p.diagnostico)}</div>` : ""}
      <div class="pc-meta">
        ${p.eps ? `<span class="pc-tag">🏥 ${sanitize(p.eps)}</span>` : ""}
        ${p.grupoSanguineo ? `<span class="pc-tag">🩸 ${sanitize(p.grupoSanguineo)}</span>` : ""}
        <span class="pc-tag">📅 ${formatDate(p.fecha)}</span>
        <span class="pc-tag">👩‍🎓 ${sanitize(p.registradoPor || "—")}</span>
      </div>`;
    container.appendChild(card);
  });
}

// ── Guardar HC ───────────────────────────────────────────────
async function savePatient() {
  const errorEl   = document.getElementById("formError");
  const successEl = document.getElementById("formSuccess");
  const btn       = document.getElementById("saveBtn");
  hide(errorEl); hide(successEl);
  const nombre         = document.getElementById("hcNombre").value.trim();
  const identificacion = document.getElementById("hcId").value.trim();
  const motivo         = document.getElementById("hcMotivo").value.trim();
  if (!nombre || !identificacion || !motivo) {
    showError(errorEl, "Los campos marcados con * son obligatorios: Nombre, Identificación y Motivo de consulta.");
    return;
  }
  setLoading(btn, true);
  try {
    const payload = {
      action: "saveHistoria",
      fecha: new Date().toISOString(),
      registradoPor: currentUser.usuario,
      nombre, identificacion, motivo,
      fechaNacimiento: v("hcFechaNac"), sexo: v("hcSexo"),
      grupoSanguineo: v("hcGrupoSanguineo"), direccion: v("hcDireccion"),
      telefono: v("hcTelefono"), eps: v("hcEps"), regimen: v("hcRegimen"),
      ocupacion: v("hcOcupacion"), escolaridad: v("hcEscolaridad"),
      estadoCivil: v("hcEstadoCivil"), contactoEmergencia: v("hcContactoEmergencia"),
      telefonoEmergencia: v("hcTelefonoEmergencia"),
      enfermedadActual: v("hcEnfermedad"), antPersonales: v("hcAntPersonales"),
      antFamiliares: v("hcAntFamiliares"), alergias: v("hcAlergias"),
      temperatura: v("svTemp"), frecCardiaca: v("svFC"), frecResp: v("svFR"),
      presionArterial: v("svPA"), spo2: v("svSpo2"),
      peso: v("svPeso"), talla: v("svTalla"), glucemia: v("svGlucemia"),
      imc: document.getElementById("imcVal").textContent,
      examenFisico: v("hcExamenFisico"), diagnostico: v("hcDiagnostico"),
      codigoCIE10: v("hcCIE10"), plan: v("hcPlan"), observaciones: v("hcObservaciones"),
    };
    const data = await apiPost(payload);
    if (data.success) {
      successEl.textContent = "✅ Historia clínica guardada exitosamente.";
      show(successEl); showToast("Historia clínica guardada ✅");
      clearForm(); setTimeout(() => loadPatients(), 1200);
    } else { showError(errorEl, data.message || "No se pudo guardar."); }
  } catch { showError(errorEl, "Error de conexión con Google Sheets."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 🏥  ADMISIÓN + RIPS
// ─────────────────────────────────────────────────────────────
async function saveAdmision() {
  const btn     = document.getElementById("admisionBtn");
  const errorEl = document.getElementById("admisionError");
  const okEl    = document.getElementById("admisionSuccess");
  hide(errorEl); hide(okEl);
  const pacienteId = v("admPacienteId");
  if (!pacienteId) { showError(errorEl, "Selecciona o ingresa el ID del paciente."); return; }
  setLoading(btn, true);
  const ripsCode = "RIPS-" + Date.now();
  try {
    const data = await apiPost({
      action: "saveAdmision",
      fechaAdmision: new Date().toISOString(),
      registradoPor: currentUser.usuario,
      pacienteId, pacienteNombre: v("admPacienteNombre"),
      tipoAdmision: v("admTipo"), servicioDestino: v("admServicio"),
      medico: v("admMedico"), prioridad: v("admPrioridad"),
      eps: v("admEps"), regimen: v("admRegimen"),
      numeroAfiliacion: v("admNumeroAfiliacion"),
      derechosVerificados: document.getElementById("admDerechos").checked ? "Sí" : "No",
      motivoAdmision: v("admMotivo"), condicionIngreso: v("admCondicion"),
      origenAtencion: v("admOrigen"),
      ripsGenerado: "Sí", codigoRIPS: ripsCode,
      observacionesAdmision: v("admObservaciones"),
    });
    if (data.success) {
      okEl.innerHTML = `✅ Admisión registrada. Código RIPS generado: <strong>${ripsCode}</strong>`;
      show(okEl); showToast("Admisión y RIPS registrados ✅");
      clearFormById(["admPacienteId","admPacienteNombre","admTipo","admServicio","admMedico",
        "admPrioridad","admEps","admRegimen","admNumeroAfiliacion","admMotivo","admCondicion","admOrigen","admObservaciones"]);
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 💊  KÁRDEX DE MEDICAMENTOS
// ─────────────────────────────────────────────────────────────
async function saveKardex() {
  const btn     = document.getElementById("kardexBtn");
  const errorEl = document.getElementById("kardexError");
  const okEl    = document.getElementById("kardexSuccess");
  hide(errorEl); hide(okEl);
  if (!v("kPacienteId") || !v("kMedicamento")) {
    showError(errorEl, "Paciente y Medicamento son obligatorios."); return;
  }
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action: "saveKardex",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }),
      registradoPor: currentUser.usuario,
      pacienteId: v("kPacienteId"), pacienteNombre: v("kPacienteNombre"),
      medicamento: v("kMedicamento"), concentracion: v("kConcentracion"),
      forma: v("kForma"), dosis: v("kDosis"), via: v("kVia"),
      frecuencia: v("kFrecuencia"), prescritoPor: v("kPrescrito"),
      horaAdministracion: v("kHoraAdmin"),
      administrado: document.getElementById("kAdministrado").checked ? "Sí" : "No",
      loteVacuna: v("kLote"),
      reaccionAdversa: document.getElementById("kReaccion").checked ? "Sí" : "No",
      descripcionReaccion: v("kDescReaccion"),
      observaciones: v("kObservaciones"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Registro de medicamento guardado.";
      showToast("Kárdex actualizado ✅");
      clearFormById(["kMedicamento","kConcentracion","kForma","kDosis","kVia","kFrecuencia",
        "kPrescrito","kHoraAdmin","kLote","kDescReaccion","kObservaciones"]);
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 📊  SIGNOS VITALES (serie)
// ─────────────────────────────────────────────────────────────
async function saveSignos() {
  const btn     = document.getElementById("signosBtn");
  const errorEl = document.getElementById("signosError");
  const okEl    = document.getElementById("signosSuccess");
  hide(errorEl); hide(okEl);
  if (!v("sPacienteId")) { showError(errorEl, "Selecciona el paciente."); return; }
  setLoading(btn, true);
  try {
    const peso  = parseFloat(v("sPeso"));
    const talla = parseFloat(v("sTalla"));
    let imcV = "";
    if (peso && talla > 0) imcV = (peso / ((talla/100)**2)).toFixed(1);
    const data = await apiPost({
      action: "saveSignosVitales",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }),
      registradoPor: currentUser.usuario,
      pacienteId: v("sPacienteId"), pacienteNombre: v("sPacienteNombre"),
      temperatura: v("sTemp"), frecCardiaca: v("sFC"), frecResp: v("sFR"),
      presionArterial: v("sPA"), spo2: v("sSpo2"), glucemia: v("sGlucemia"),
      peso: v("sPeso"), talla: v("sTalla"), imc: imcV,
      dolor: v("sDolor"), estadoConciencia: v("sConciencia"),
      observaciones: v("sObservaciones"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Signos vitales registrados.";
      showToast("Signos guardados ✅");
      clearFormById(["sTemp","sFC","sFR","sPA","sSpo2","sGlucemia","sPeso","sTalla","sDolor","sConciencia","sObservaciones"]);
      loadSignosChart(v("sPacienteId"));
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

async function loadSignosChart(pacienteId) {
  const container = document.getElementById("signosHistorial");
  if (!container || !pacienteId) return;
  container.innerHTML = `<p class="loading-inline">Cargando historial…</p>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSignosVitales&pacienteId=${encodeURIComponent(pacienteId)}`);
    if (!data.rows || data.rows.length === 0) { container.innerHTML = `<p class="empty-state">Sin registros previos.</p>`; return; }
    const rows = data.rows.slice(0, 10).reverse();
    let html = `<table class="data-table"><thead><tr>
      <th>Fecha</th><th>Hora</th><th>Temp</th><th>FC</th><th>FR</th><th>PA</th><th>SpO₂</th><th>Glucemia</th><th>Dolor</th>
    </tr></thead><tbody>`;
    rows.forEach(r => {
      html += `<tr>
        <td>${formatDate(r.fecha)}</td><td>${r.hora||"—"}</td>
        <td>${r.temperatura||"—"} °C</td><td>${r.frecCardiaca||"—"} lpm</td>
        <td>${r.frecResp||"—"} rpm</td><td>${r.presionArterial||"—"}</td>
        <td>${r.spo2||"—"} %</td><td>${r.glucemia||"—"}</td>
        <td>${r.dolor||"—"}/10</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch { container.innerHTML = `<p class="error-inline">Error al cargar historial.</p>`; }
}

// ─────────────────────────────────────────────────────────────
// 💧  BALANCE HÍDRICO
// ─────────────────────────────────────────────────────────────
async function saveBalance() {
  const btn     = document.getElementById("balanceBtn");
  const errorEl = document.getElementById("balanceError");
  const okEl    = document.getElementById("balanceSuccess");
  hide(errorEl); hide(okEl);
  if (!v("bPacienteId")) { showError(errorEl, "Selecciona el paciente."); return; }
  setLoading(btn, true);
  const iOral = parseFloat(v("bIngestaOral")) || 0;
  const iParent = parseFloat(v("bIngestaParenteral")) || 0;
  const iTotal  = iOral + iParent;
  const eUrina  = parseFloat(v("bEliminacionUrinaria")) || 0;
  const eHeces  = parseFloat(v("bEliminacionHeces")) || 0;
  const eDren   = parseFloat(v("bEliminacionDrenajes")) || 0;
  const eOtros  = parseFloat(v("bEliminacionOtros")) || 0;
  const eTotal  = eUrina + eHeces + eDren + eOtros;
  const balance = iTotal - eTotal;
  document.getElementById("bIngestaTotal").textContent   = iTotal.toFixed(0) + " mL";
  document.getElementById("bEliminacionTotal").textContent = eTotal.toFixed(0) + " mL";
  document.getElementById("bBalance").textContent        = (balance >= 0 ? "+" : "") + balance.toFixed(0) + " mL";
  document.getElementById("bBalance").className          = balance >= 0 ? "balance-pos" : "balance-neg";
  try {
    const data = await apiPost({
      action: "saveBalance",
      fecha: new Date().toISOString().split("T")[0],
      turno: v("bTurno"), registradoPor: currentUser.usuario,
      pacienteId: v("bPacienteId"), pacienteNombre: v("bPacienteNombre"),
      ingestaOral: iOral, ingestaParenteral: iParent, ingestaTotal: iTotal,
      eliminacionUrinaria: eUrina, eliminacionHeces: eHeces,
      eliminacionDrenajes: eDren, eliminacionOtros: eOtros, eliminacionTotal: eTotal,
      balance, observaciones: v("bObservaciones"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Balance hídrico guardado.";
      showToast("Balance guardado ✅");
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 📝  NOTAS DE ENFERMERÍA
// ─────────────────────────────────────────────────────────────
async function saveNota() {
  const btn     = document.getElementById("notaBtn");
  const errorEl = document.getElementById("notaError");
  const okEl    = document.getElementById("notaSuccess");
  hide(errorEl); hide(okEl);
  if (!v("nPacienteId") || !v("nNota")) { showError(errorEl, "Paciente y texto de la nota son obligatorios."); return; }
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action: "saveNota",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }),
      registradoPor: currentUser.usuario,
      pacienteId: v("nPacienteId"), pacienteNombre: v("nPacienteNombre"),
      turno: v("nTurno"), tipoNota: v("nTipo"), nota: v("nNota"),
      firmado: currentUser.nombre + " — " + new Date().toLocaleString("es-CO"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Nota de enfermería guardada y firmada.";
      showToast("Nota guardada ✅");
      document.getElementById("nNota").value = "";
      loadNotasRecientes(v("nPacienteId"));
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

async function loadNotasRecientes(pacienteId) {
  const container = document.getElementById("notasHistorial");
  if (!container) return;
  container.innerHTML = `<p class="loading-inline">Cargando notas…</p>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getNotas&pacienteId=${encodeURIComponent(pacienteId)}`);
    if (!data.rows || data.rows.length === 0) { container.innerHTML = `<p class="empty-state">Sin notas registradas.</p>`; return; }
    container.innerHTML = data.rows.slice(0, 8).map(n => `
      <div class="nota-card">
        <div class="nota-header">
          <span class="nota-tipo tag-${(n.tipoNota||"").toLowerCase().replace(/\s/g,"-")}">${sanitize(n.tipoNota||"Nota")}</span>
          <span class="nota-meta">${sanitize(n.turno||"")} · ${formatDate(n.fecha)} ${sanitize(n.hora||"")}</span>
        </div>
        <p class="nota-texto">${sanitize(n.nota)}</p>
        <span class="nota-firma">✍️ ${sanitize(n.firmado||n.registradoPor)}</span>
      </div>`).join("");
  } catch { container.innerHTML = `<p class="error-inline">Error al cargar notas.</p>`; }
}

// ─────────────────────────────────────────────────────────────
// ✅  CONSENTIMIENTO INFORMADO
// ─────────────────────────────────────────────────────────────
async function saveConsentimiento() {
  const btn     = document.getElementById("consentBtn");
  const errorEl = document.getElementById("consentError");
  const okEl    = document.getElementById("consentSuccess");
  hide(errorEl); hide(okEl);
  if (!v("cPacienteId") || !v("cProcedimiento")) { showError(errorEl, "Paciente y procedimiento son obligatorios."); return; }
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action: "saveConsentimiento",
      fecha: new Date().toISOString(),
      registradoPor: currentUser.usuario,
      pacienteId: v("cPacienteId"), pacienteNombre: v("cPacienteNombre"),
      procedimiento: v("cProcedimiento"), descripcion: v("cDescripcion"),
      riesgos: v("cRiesgos"), alternativas: v("cAlternativas"),
      pacienteAcepta: document.getElementById("cAcepta").checked ? "Sí" : "No",
      testigo: v("cTestigo"), observaciones: v("cObservaciones"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Consentimiento informado registrado.";
      showToast("Consentimiento guardado ✅");
      clearFormById(["cPacienteId","cPacienteNombre","cProcedimiento","cDescripcion","cRiesgos","cAlternativas","cTestigo","cObservaciones"]);
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 📄  EPICRISIS
// ─────────────────────────────────────────────────────────────
async function saveEpicrisis() {
  const btn     = document.getElementById("epicrisisBtn");
  const errorEl = document.getElementById("epicrisisError");
  const okEl    = document.getElementById("epicrisisSuccess");
  hide(errorEl); hide(okEl);
  if (!v("ePacienteId") || !v("eResumen")) { showError(errorEl, "Paciente y resumen de evolución son obligatorios."); return; }
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action: "saveEpicrisis",
      fechaEgreso: new Date().toISOString(),
      registradoPor: currentUser.usuario,
      pacienteId: v("ePacienteId"), pacienteNombre: v("ePacienteNombre"),
      fechaIngreso: v("eFechaIngreso"), diasEstancia: v("eDiasEstancia"),
      motivoIngreso: v("eMotivoIngreso"), resumenEvolucion: v("eResumen"),
      procedimientosRealizados: v("eProcedimientos"),
      diagnosticoEgreso: v("eDiagnostico"), codigoCIE10Egreso: v("eCIE10"),
      condicionEgreso: v("eCondicion"), tipoEgreso: v("eTipoEgreso"),
      recomendaciones: v("eRecomendaciones"),
      medicamentosEgreso: v("eMedicamentos"), citas: v("eCitas"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Epicrisis generada y guardada.";
      showToast("Epicrisis guardada ✅");
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 🔍  BUSCAR
// ─────────────────────────────────────────────────────────────
function searchPatients() {
  const q     = document.getElementById("searchInput").value.trim().toLowerCase();
  const res   = document.getElementById("searchResults");
  const empty = document.getElementById("searchEmpty");
  res.innerHTML = ""; hide(empty);
  if (!q) return;
  const filtered = allPatients.filter(p =>
    (p.nombre         || "").toLowerCase().includes(q) ||
    (p.identificacion || "").toLowerCase().includes(q) ||
    (p.diagnostico    || "").toLowerCase().includes(q) ||
    (p.eps            || "").toLowerCase().includes(q)
  );
  if (filtered.length === 0) show(empty);
  else renderPatientCards(filtered, res);
}

// ─────────────────────────────────────────────────────────────
// 👩‍🏫  EVALUACIONES (Docente)
// ─────────────────────────────────────────────────────────────
async function saveEvaluacion() {
  const btn     = document.getElementById("evalBtn");
  const errorEl = document.getElementById("evalError");
  const okEl    = document.getElementById("evalSuccess");
  hide(errorEl); hide(okEl);
  if (!v("evalEstudianteId") || !v("evalCompetencia")) {
    showError(errorEl, "Estudiante y competencia son obligatorios."); return;
  }
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action: "saveEvaluacion",
      fecha: new Date().toISOString(),
      docente: currentUser.usuario,
      estudianteId: v("evalEstudianteId"), estudianteNombre: v("evalEstudianteNombre"),
      pacienteId: v("evalPacienteId"), competencia: v("evalCompetencia"),
      criterio: v("evalCriterio"), calificacion: v("evalCalificacion"),
      observaciones: v("evalObservaciones"),
      firmaDocente: currentUser.nombre + " — " + new Date().toLocaleString("es-CO"),
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Evaluación registrada.";
      showToast("Evaluación guardada ✅");
      clearFormById(["evalEstudianteId","evalEstudianteNombre","evalPacienteId","evalCompetencia","evalCriterio","evalCalificacion","evalObservaciones"]);
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

// ─────────────────────────────────────────────────────────────
// 🙋  MÓDULO PACIENTE — Solicitudes
// ─────────────────────────────────────────────────────────────
async function saveSolicitud() {
  const btn     = document.getElementById("solicitudBtn");
  const errorEl = document.getElementById("solicitudError");
  const okEl    = document.getElementById("solicitudSuccess");
  hide(errorEl); hide(okEl);
  if (!v("solSolicitud")) { showError(errorEl, "Describe tu solicitud."); return; }
  setLoading(btn, true);
  try {
    const data = await apiPost({
      action: "saveSolicitud",
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("es-CO", { hour:"2-digit", minute:"2-digit" }),
      pacienteId: currentUser.usuario,
      pacienteNombre: currentUser.nombre,
      tipoDolor: v("solTipoDolor"),
      intensidadDolor: v("solIntensidad"),
      solicitud: v("solTipo"), descripcion: v("solSolicitud"),
      atendidoPor: "", respuesta: "", fechaRespuesta: "",
    });
    if (data.success) {
      show(okEl); okEl.textContent = "✅ Solicitud enviada. El equipo de enfermería la atenderá pronto.";
      showToast("Solicitud enviada ✅");
      document.getElementById("solSolicitud").value = "";
      loadMisSolicitudes();
    } else { showError(errorEl, data.message); }
  } catch { showError(errorEl, "Error de conexión."); }
  finally  { setLoading(btn, false); }
}

async function loadMisSolicitudes() {
  const container = document.getElementById("misSolicitudesLista");
  if (!container) return;
  container.innerHTML = `<p class="loading-inline">Cargando solicitudes…</p>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSolicitudes&pacienteId=${encodeURIComponent(currentUser.usuario)}`);
    if (!data.rows || data.rows.length === 0) { container.innerHTML = `<p class="empty-state">No tienes solicitudes registradas.</p>`; return; }
    container.innerHTML = data.rows.map(s => `
      <div class="solicitud-card ${s.respuesta ? 'atendida' : 'pendiente'}">
        <div class="sol-header">
          <span class="sol-tipo">${sanitize(s.solicitud||"Solicitud")}</span>
          <span class="sol-estado">${s.respuesta ? "✅ Atendida" : "⏳ Pendiente"}</span>
        </div>
        <p class="sol-desc">${sanitize(s.descripcion)}</p>
        ${s.tipoDolor ? `<p class="sol-dolor">Dolor: <strong>${sanitize(s.tipoDolor)}</strong> — Intensidad: <strong>${sanitize(s.intensidadDolor)}/10</strong></p>` : ""}
        ${s.respuesta ? `<div class="sol-respuesta"><strong>Respuesta:</strong> ${sanitize(s.respuesta)}<br><small>${sanitize(s.atendidoPor)} · ${formatDate(s.fechaRespuesta)}</small></div>` : ""}
        <small class="sol-fecha">📅 ${formatDate(s.fecha)} ${sanitize(s.hora||"")}</small>
      </div>`).join("");
  } catch { container.innerHTML = `<p class="error-inline">Error al cargar solicitudes.</p>`; }
}

async function loadMisSignos() {
  const container = document.getElementById("misSignosContainer");
  if (!container) return;
  container.innerHTML = `<p class="loading-inline">Cargando tus signos vitales…</p>`;
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getSignosVitales&pacienteId=${encodeURIComponent(currentUser.usuario)}`);
    if (!data.rows || data.rows.length === 0) { container.innerHTML = `<p class="empty-state">No hay registros de signos vitales.</p>`; return; }
    const rows = data.rows.slice(0, 10);
    let html = `<table class="data-table"><thead><tr>
      <th>Fecha</th><th>Temp</th><th>FC</th><th>PA</th><th>SpO₂</th><th>Glucemia</th>
    </tr></thead><tbody>`;
    rows.forEach(r => {
      html += `<tr>
        <td>${formatDate(r.fecha)}</td>
        <td>${r.temperatura||"—"} °C</td><td>${r.frecCardiaca||"—"} lpm</td>
        <td>${r.presionArterial||"—"}</td><td>${r.spo2||"—"} %</td><td>${r.glucemia||"—"}</td>
      </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
  } catch { container.innerHTML = `<p class="error-inline">Error al cargar.</p>`; }
}

// ─────────────────────────────────────────────────────────────
// 🪟  MODAL DETALLE HC
// ─────────────────────────────────────────────────────────────
function openPatientModal(p) {
  const modal   = document.getElementById("hcModal");
  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <h2 class="modal-title">${sanitize(p.nombre)}</h2>
    <p class="modal-id">ID: ${sanitize(p.identificacion)} &bull; ${sanitize(p.registradoPor || "—")} &bull; ${formatDate(p.fecha)}</p>
    <div class="modal-section"><h4>Datos personales</h4>
      <div class="modal-grid">
        <div class="modal-field"><span>Edad</span>${calcAge(p.fechaNacimiento)}</div>
        <div class="modal-field"><span>Sexo</span>${sanitize(p.sexo||"—")}</div>
        <div class="modal-field"><span>Grupo sanguíneo</span>${sanitize(p.grupoSanguineo||"—")}</div>
        <div class="modal-field"><span>EPS / Régimen</span>${sanitize(p.eps||"—")} / ${sanitize(p.regimen||"—")}</div>
        <div class="modal-field"><span>Teléfono</span>${sanitize(p.telefono||"—")}</div>
        <div class="modal-field"><span>Dirección</span>${sanitize(p.direccion||"—")}</div>
        <div class="modal-field"><span>Estado civil</span>${sanitize(p.estadoCivil||"—")}</div>
        <div class="modal-field"><span>Ocupación</span>${sanitize(p.ocupacion||"—")}</div>
        <div class="modal-field"><span>Alergias</span>${sanitize(p.alergias||"Ninguna conocida")}</div>
        <div class="modal-field"><span>Contacto de emergencia</span>${sanitize(p.contactoEmergencia||"—")} ${sanitize(p.telefonoEmergencia||"")}</div>
      </div>
    </div>
    <div class="modal-section"><h4>Signos vitales</h4>
      <div>
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
    ${p.observaciones ? `<div class="modal-section"><h4>Observaciones</h4><p class="modal-text" style="font-style:italic">${sanitize(p.observaciones)}</p></div>` : ""}
    <div style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap;">
      <button class="btn-accent btn-sm" onclick="prefillKardex('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-kardex');closeModalBtn()">💊 Kárdex</button>
      <button class="btn-accent btn-sm" onclick="prefillSignos('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-signos');closeModalBtn()">📊 Signos</button>
      <button class="btn-accent btn-sm" onclick="prefillBalance('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-balance');closeModalBtn()">💧 Balance</button>
      <button class="btn-accent btn-sm" onclick="prefillNota('${sanitize(p.identificacion)}','${sanitize(p.nombre)}');showTab('tab-notas');closeModalBtn()">📝 Nota</button>
    </div>
  `;
  modal.style.display = "flex";
}

function prefillKardex(id, nombre) { setVal("kPacienteId", id); setVal("kPacienteNombre", nombre); }
function prefillSignos(id, nombre)  { setVal("sPacienteId", id); setVal("sPacienteNombre", nombre); loadSignosChart(id); }
function prefillBalance(id, nombre) { setVal("bPacienteId", id); setVal("bPacienteNombre", nombre); }
function prefillNota(id, nombre)    { setVal("nPacienteId", id); setVal("nPacienteNombre", nombre); loadNotasRecientes(id); }

function vitalChip(icon, label, val, unit) {
  if (!val && val !== 0) return "";
  return `<span class="vital-chip">${icon} <strong>${label}</strong> ${sanitize(String(val))}${unit}</span>`;
}
function closeModal(e) { if (e.target === document.getElementById("hcModal")) closeModalBtn(); }
function closeModalBtn() { document.getElementById("hcModal").style.display = "none"; }

// ─────────────────────────────────────────────────────────────
// ⚕️  IMC
// ─────────────────────────────────────────────────────────────
function calcIMC() {
  const peso  = parseFloat(document.getElementById("svPeso").value);
  const talla = parseFloat(document.getElementById("svTalla").value);
  const imcEl = document.getElementById("imcVal");
  const catEl = document.getElementById("imcCategoria");
  if (!peso || !talla || talla < 50) { imcEl.textContent = "—"; catEl.textContent = ""; catEl.className = "imc-cat"; return; }
  const imc = (peso / ((talla/100)**2)).toFixed(1);
  imcEl.textContent = imc;
  const cat = imc < 18.5 ? ["Bajo peso","imc-bajo"] : imc < 25 ? ["Normal","imc-normal"] : imc < 30 ? ["Sobrepeso","imc-sobre"] : ["Obesidad","imc-obeso"];
  catEl.textContent = cat[0]; catEl.className = `imc-cat ${cat[1]}`;
}

// ─────────────────────────────────────────────────────────────
// 🔄  CARGA DE SELECTS DE PACIENTES
// ─────────────────────────────────────────────────────────────
async function loadPacientesSelect() {
  try {
    const data = await apiFetch(`${CONFIG.APPS_SCRIPT_URL}?action=getPacientes`);
    if (data.pacientes) pacientesList = data.pacientes;
  } catch {}
}

function getPacienteSelectHTML(prefix) {
  if (!pacientesList.length) return `<option value="">— Ingresa ID manualmente —</option>`;
  return `<option value="">Seleccionar paciente…</option>` +
    pacientesList.map(p => `<option value="${sanitize(p.identificacion)}">${sanitize(p.nombre)} (${sanitize(p.identificacion)})</option>`).join("");
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
  document.getElementById("imcVal").textContent = "—";
  document.getElementById("imcCategoria").textContent = ""; document.getElementById("imcCategoria").className = "imc-cat";
  hide(document.getElementById("formError")); hide(document.getElementById("formSuccess"));
}
function clearFormById(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ""; }); }
function v(id)   { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }
function showError(el, msg) { el.textContent = msg; show(el); }
function setLoading(btn, loading) {
  btn.disabled  = loading;
  btn.innerHTML = loading
    ? `<div class="spinner" style="width:16px;height:16px;border-width:2px"></div><span>Guardando…</span>`
    : btn.dataset.label || btn.innerHTML;
}
function showToast(msg, duration = 3000) {
  const toast = document.getElementById("toast");
  toast.textContent = msg; show(toast);
  clearTimeout(toast._t); toast._t = setTimeout(() => hide(toast), duration);
}
function sanitize(str) { const d = document.createElement("div"); d.textContent = String(str ?? ""); return d.innerHTML; }
function getInitials(name = "") { return name.split(" ").slice(0, 2).map(w => w[0]||"").join("").toUpperCase() || "?"; }
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

async function apiFetch(url) {
  const res = await fetch(url);
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
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
