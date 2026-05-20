/* ════════════════════════════════════════════════
   SaludNorte — app.js
   Supabase integration · Corporación Asesorías del Norte
   ════════════════════════════════════════════════

   ⚠️  IMPORTANTE: Reemplaza los valores de configuración
       con los de tu proyecto Supabase:
       - SUPABASE_URL  → Panel Supabase > Settings > API > Project URL
       - SUPABASE_KEY  → Panel Supabase > Settings > API > anon public
   ════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_KEY = 'TU_ANON_KEY';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Init Supabase ── */
  const { createClient } = supabase;
  const db = createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ══════════════════════════════════════
     UTILIDADES
  ══════════════════════════════════════ */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  function showModule(name) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const el = document.getElementById('mod-' + name);
    if (el) el.classList.add('active');
    document.getElementById('moduleTitle').textContent =
      document.querySelector(`.nav-item[data-module="${name}"] span:last-child`)?.textContent || name;
    document.querySelectorAll('.nav-item').forEach(i => {
      i.classList.toggle('active', i.dataset.module === name);
    });
  }

  function toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `toast ${type} show`;
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  function toggleForm(formId, show) {
    const f = document.getElementById(formId);
    if (show) f.classList.remove('hidden');
    else f.classList.add('hidden');
  }

  function resetForm(formId) {
    const form = document.getElementById(formId);
    form.querySelectorAll('input, select, textarea').forEach(el => {
      if (el.type === 'checkbox') el.checked = false;
      else el.value = '';
    });
  }

  function buildTable(tableId, rows, cols) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="99" style="text-align:center;color:#aaa;padding:24px">Sin registros</td></tr>';
      return;
    }
    rows.forEach(row => {
      const tr = document.createElement('tr');
      cols.forEach(c => {
        const td = document.createElement('td');
        td.textContent = row[c] ?? '—';
        td.title = row[c] ?? '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  function setCurrentDate() {
    const d = new Date();
    document.getElementById('currentDate').textContent =
      d.toLocaleDateString('es-CO', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* Populate a <select> with pacientes */
  async function loadPacientesSelect(selectId) {
    const { data, error } = await db.from('Pacientes').select('id, nombre').order('nombre');
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccione paciente...</option>';
    if (error || !data) return;
    data.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `[${p.id}] ${p.nombre}`;
      sel.appendChild(opt);
    });
  }

  /* ══════════════════════════════════════
     SESIÓN LOCAL  (sin Supabase Auth)
     Almacena el usuario activo en
     sessionStorage para persistir durante
     la pestaña sin requerir Auth de Supabase.
     La tabla Usuarios debe tener las cols:
       id (bigint PK), nombre (text), rol (text)
       y una col  "password" (text) con la
       contraseña en texto plano o hash MD5.
     ⚠️ Para producción usa hashing (bcrypt).
  ══════════════════════════════════════ */

  // ── Mostrar/ocultar contraseña ──
  document.getElementById('pwToggle').addEventListener('click', () => {
    const inp = document.getElementById('loginPassword');
    const btn = document.getElementById('pwToggle');
    if (inp.type === 'password') { inp.type = 'text';     btn.textContent = '🙈'; }
    else                         { inp.type = 'password'; btn.textContent = '👁'; }
  });

  // ── Lógica de login ──
  document.getElementById('btnLogin').addEventListener('click', doLogin);
  ['loginId','loginPassword'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });
  });

  async function doLogin() {
    const userId   = parseInt(document.getElementById('loginId').value.trim());
    const password = document.getElementById('loginPassword').value;
    const errEl    = document.getElementById('loginError');
    errEl.textContent = '';

    if (!userId || !password) {
      errEl.textContent = 'Ingresa tu ID de usuario y contraseña.';
      return;
    }

    // Consultar la tabla Usuarios por id
    const { data, error } = await db
      .from('Usuarios')
      .select('id, nombre, rol, password')
      .eq('id', userId)
      .single();

    if (error || !data) {
      errEl.textContent = 'Usuario no encontrado. Verifica tu ID.';
      return;
    }

    // Verificar contraseña (comparación directa — usa hash en producción)
    if (data.password !== password) {
      errEl.textContent = 'Contraseña incorrecta.';
      return;
    }

    // Guardar sesión local
    sessionStorage.setItem('snUser', JSON.stringify({
      id:     data.id,
      nombre: data.nombre,
      rol:    data.rol,
    }));

    enterDashboard(data);
  }

  function enterDashboard(user) {
    document.getElementById('userBadge').innerHTML =
      `<strong>${user.nombre}</strong><br><span style="font-size:.72rem;opacity:.7">${user.rol} · ID ${user.id}</span>`;
    showScreen('dashboardScreen');
    initDashboard();
  }

  document.getElementById('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem('snUser');
    showScreen('loginScreen');
    document.getElementById('loginId').value       = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').textContent = '';
  });

  /* ══════════════════════════════════════
     DASHBOARD INIT
  ══════════════════════════════════════ */
  async function initDashboard() {
    setCurrentDate();
    showModule('pacientes');
    await loadPacientes();

    // Nav events
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const mod = item.dataset.module;
        showModule(mod);
        moduleLoaders[mod]?.();
      });
    });
  }

  /* Module loader map */
  const moduleLoaders = {
    pacientes:        loadPacientes,
    admision:         loadAdmision,
    signosVitales:    loadSignosVitales,
    historiasClinicas:loadHistoriasClinicas,
    medicamentos:     loadMedicamentos,
    notasEnfermeria:  loadNotasEnfermeria,
    balanceHidro:     loadBalance,
    consentimiento:   loadConsentimiento,
    epicrisis:        loadEpicrisis,
    horarios:         loadHorarios,
  };

  /* ══════════════════════════════════════
     MÓDULO: PACIENTES
  ══════════════════════════════════════ */
  async function loadPacientes() {
    const { data, error } = await db.from('Pacientes').select('*').order('id');
    if (error) { toast('Error cargando pacientes: ' + error.message, 'error'); return; }
    buildTable('tablaPacientes', data, ['id','nombre','fecha de nacimiento','estado']);
  }

  document.getElementById('btnNuevoPaciente').addEventListener('click', () => {
    toggleForm('formPaciente', true);
  });
  document.getElementById('btnCancelarPaciente').addEventListener('click', () => {
    toggleForm('formPaciente', false);
    resetForm('formPaciente');
  });
  document.getElementById('btnGuardarPaciente').addEventListener('click', async () => {
    const payload = {
      nombre:               document.getElementById('pacNombre').value.trim(),
      'fecha de nacimiento':document.getElementById('pacFechaNac').value || null,
      estado:               document.getElementById('pacEstado').value,
      id_usuario:           parseInt(document.getElementById('pacIdUsuario').value) || null,
    };
    if (!payload.nombre) { toast('El nombre es obligatorio.', 'error'); return; }
    const { error } = await db.from('Pacientes').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Paciente registrado');
    toggleForm('formPaciente', false);
    resetForm('formPaciente');
    await loadPacientes();
  });

  /* ══════════════════════════════════════
     MÓDULO: ADMISIÓN
  ══════════════════════════════════════ */
  async function loadAdmision() {
    await loadPacientesSelect('admPaciente');
    const { data, error } = await db.from('Registro _Admision').select('*').order('id');
    if (error) { toast('Error admisiones: ' + error.message, 'error'); return; }
    buildTable('tablaAdmision', data, ['id','ID_Paciente','fecha de ingreso','cama asignada','motivo']);
  }

  document.getElementById('btnNuevaAdmision').addEventListener('click', () => {
    loadPacientesSelect('admPaciente');
    toggleForm('formAdmision', true);
  });
  document.getElementById('btnCancelarAdmision').addEventListener('click', () => {
    toggleForm('formAdmision', false); resetForm('formAdmision');
  });
  document.getElementById('btnGuardarAdmision').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:      parseInt(document.getElementById('admPaciente').value) || null,
      'fecha de ingreso': document.getElementById('admFechaIngreso').value || null,
      'cama asignada':  parseInt(document.getElementById('admCama').value) || null,
      motivo:           document.getElementById('admMotivo').value.trim(),
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Registro _Admision').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Admisión registrada');
    toggleForm('formAdmision', false); resetForm('formAdmision');
    await loadAdmision();
  });

  /* ══════════════════════════════════════
     MÓDULO: SIGNOS VITALES
  ══════════════════════════════════════ */
  async function loadSignosVitales() {
    await loadPacientesSelect('svPaciente');
    const { data, error } = await db.from('Signos_Vitales').select('*').order('id');
    if (error) { toast('Error signos: ' + error.message, 'error'); return; }
    buildTable('tablaSignos', data, ['id','ID_Paciente','fecha/hora','presion','pulso','temperatura']);
  }

  document.getElementById('btnNuevoSigno').addEventListener('click', () => {
    loadPacientesSelect('svPaciente');
    // Default to now
    const now = new Date();
    const local = now.toISOString().slice(0,16);
    document.getElementById('svFecha').value = local;
    toggleForm('formSignos', true);
  });
  document.getElementById('btnCancelarSigno').addEventListener('click', () => {
    toggleForm('formSignos', false); resetForm('formSignos');
  });
  document.getElementById('btnGuardarSigno').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:     parseInt(document.getElementById('svPaciente').value) || null,
      'fecha/hora':    document.getElementById('svFecha').value || null,
      presion:         document.getElementById('svPresion').value.trim() || null,
      pulso:           parseFloat(document.getElementById('svPulso').value) || null,
      temperatura:     parseFloat(document.getElementById('svTemp').value) || null,
      glucemia:        parseFloat(document.getElementById('svGlucemia').value) || null,
      peso:            parseFloat(document.getElementById('svPeso').value) || null,
      estatura:        parseFloat(document.getElementById('svEstatura').value) || null,
      Dolor:           parseInt(document.getElementById('svDolor').value) || null,
      estado_conciencia: document.getElementById('svConciencia').value || null,
      observaciones:   document.getElementById('svObservaciones').value.trim() || null,
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Signos_Vitales').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Signos vitales registrados');
    toggleForm('formSignos', false); resetForm('formSignos');
    await loadSignosVitales();
  });

  /* ══════════════════════════════════════
     MÓDULO: HISTORIAS CLÍNICAS
  ══════════════════════════════════════ */
  async function loadHistoriasClinicas() {
    await loadPacientesSelect('hcPaciente');
    const { data, error } = await db.from('Historias_Clínicas').select('*').order('id');
    if (error) { toast('Error historias: ' + error.message, 'error'); return; }
    buildTable('tablaHistorias', data, ['id','ID_Paciente','ID_Médico','diagnóstico']);
  }

  document.getElementById('btnNuevaHistoria').addEventListener('click', () => {
    loadPacientesSelect('hcPaciente');
    toggleForm('formHistoria', true);
  });
  document.getElementById('btnCancelarHistoria').addEventListener('click', () => {
    toggleForm('formHistoria', false); resetForm('formHistoria');
  });
  document.getElementById('btnGuardarHistoria').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:   parseInt(document.getElementById('hcPaciente').value) || null,
      'ID_Médico':   parseInt(document.getElementById('hcMedico').value) || null,
      'diagnóstico': document.getElementById('hcDiagnostico').value.trim() || null,
      antecedentes:  document.getElementById('hcAntecedentes').value.trim() || null,
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Historias_Clínicas').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Historia clínica guardada');
    toggleForm('formHistoria', false); resetForm('formHistoria');
    await loadHistoriasClinicas();
  });

  /* ══════════════════════════════════════
     MÓDULO: MEDICAMENTOS
  ══════════════════════════════════════ */
  async function loadMedicamentos() {
    await loadPacientesSelect('medPaciente');
    const { data, error } = await db.from('Medicamentos').select('*').order('id');
    if (error) { toast('Error medicamentos: ' + error.message, 'error'); return; }
    buildTable('tablaMed', data, ['id','ID_Paciente','medicamento','dosis','via','administrado']);
  }

  document.getElementById('btnNuevoMed').addEventListener('click', () => {
    loadPacientesSelect('medPaciente');
    toggleForm('formMed', true);
  });
  document.getElementById('btnCancelarMed').addEventListener('click', () => {
    toggleForm('formMed', false); resetForm('formMed');
  });
  document.getElementById('btnGuardarMed').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:      parseInt(document.getElementById('medPaciente').value) || null,
      ID_Médico:        parseInt(document.getElementById('medMedico').value) || null,
      medicamento:      document.getElementById('medNombre').value.trim() || null,
      dosis:            document.getElementById('medDosis').value.trim() || null,
      concentracion:    document.getElementById('medConcentracion').value.trim() || null,
      Forma_farmaceutica: document.getElementById('medForma').value || null,
      via:              document.getElementById('medVia').value || null,
      frecuencia:       document.getElementById('medFrecuencia').value || null,
      hora_administracion: document.getElementById('medHora').value || null,
      Lote:             parseInt(document.getElementById('medLote').value) || null,
      administrado:     document.getElementById('medAdministrado').value || null,
      reaccion_abversa: document.getElementById('medReaccion').value.trim() || null,
      observaciones:    document.getElementById('medObservaciones').value.trim() || null,
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Medicamentos').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Medicamento registrado');
    toggleForm('formMed', false); resetForm('formMed');
    await loadMedicamentos();
  });

  /* ══════════════════════════════════════
     MÓDULO: NOTAS ENFERMERÍA
  ══════════════════════════════════════ */
  async function loadNotasEnfermeria() {
    await loadPacientesSelect('notaPaciente');
    const { data, error } = await db.from('Notas_Enfermeria').select('*').order('id');
    if (error) { toast('Error notas: ' + error.message, 'error'); return; }
    buildTable('tablaNotas', data, ['id','ID_Paciente','ID_Enfermera','fecha/hora','observaciones']);
  }

  document.getElementById('btnNuevaNota').addEventListener('click', () => {
    loadPacientesSelect('notaPaciente');
    const now = new Date().toISOString().slice(0,16);
    document.getElementById('notaFecha').value = now;
    toggleForm('formNota', true);
  });
  document.getElementById('btnCancelarNota').addEventListener('click', () => {
    toggleForm('formNota', false); resetForm('formNota');
  });
  document.getElementById('btnGuardarNota').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:   parseInt(document.getElementById('notaPaciente').value) || null,
      ID_Enfermera:  parseInt(document.getElementById('notaEnfermera').value) || null,
      'fecha/hora':  document.getElementById('notaFecha').value || null,
      observaciones: document.getElementById('notaObservaciones').value.trim() || null,
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Notas_Enfermeria').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Nota registrada');
    toggleForm('formNota', false); resetForm('formNota');
    await loadNotasEnfermeria();
  });

  /* ══════════════════════════════════════
     MÓDULO: BALANCE HIDROELECTROLÍTICO
  ══════════════════════════════════════ */
  async function loadBalance() {
    await loadPacientesSelect('balPaciente');
    const { data, error } = await db.from('Balance _Hidroelectrolitico').select('*').order('id');
    if (error) { toast('Error balance: ' + error.message, 'error'); return; }
    buildTable('tablaBalance', data, ['id','ID_Paciente','ingesta_oral','ingesta_parenteral','eliminacion_urinaria','observaciones']);
  }

  // Live balance neto calculation
  ['balOral','balParenteral','balUrinaria','balHeces','balDrenajes','balOtros'].forEach(id => {
    document.getElementById(id).addEventListener('input', calcBalance);
  });

  function calcBalance() {
    const oral  = parseFloat(document.getElementById('balOral').value) || 0;
    const par   = parseFloat(document.getElementById('balParenteral').value) || 0;
    const uri   = parseFloat(document.getElementById('balUrinaria').value) || 0;
    const hec   = parseFloat(document.getElementById('balHeces').value) || 0;
    const dren  = parseFloat(document.getElementById('balDrenajes').value) || 0;
    const otros = parseFloat(document.getElementById('balOtros').value) || 0;
    const neto  = (oral + par) - (uri + hec + dren + otros);
    const el    = document.getElementById('balanceNeto');
    el.textContent = (neto >= 0 ? '+' : '') + neto.toFixed(1) + ' mL';
    el.style.background = neto < 0
      ? 'linear-gradient(90deg, #7b1a1a, #a83232)'
      : 'linear-gradient(90deg, var(--teal-800), var(--teal-600))';
  }

  document.getElementById('btnNuevoBalance').addEventListener('click', () => {
    loadPacientesSelect('balPaciente');
    toggleForm('formBalance', true);
  });
  document.getElementById('btnCancelarBalance').addEventListener('click', () => {
    toggleForm('formBalance', false); resetForm('formBalance');
    document.getElementById('balanceNeto').textContent = '— mL';
  });
  document.getElementById('btnGuardarBalance').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:          parseInt(document.getElementById('balPaciente').value) || null,
      ingesta_oral:         parseFloat(document.getElementById('balOral').value) || 0,
      ingesta_parenteral:   parseFloat(document.getElementById('balParenteral').value) || 0,
      eliminacion_urinaria: parseFloat(document.getElementById('balUrinaria').value) || 0,
      e_heces:              parseFloat(document.getElementById('balHeces').value) || 0,
      drenajes:             parseFloat(document.getElementById('balDrenajes').value) || 0,
      otros:                parseFloat(document.getElementById('balOtros').value) || 0,
      observaciones:        document.getElementById('balObservaciones').value.trim() || null,
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Balance _Hidroelectrolitico').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Balance registrado');
    toggleForm('formBalance', false); resetForm('formBalance');
    document.getElementById('balanceNeto').textContent = '— mL';
    await loadBalance();
  });

  /* ══════════════════════════════════════
     MÓDULO: CONSENTIMIENTO INFORMADO
     + Upload de archivo a Supabase Storage
  ══════════════════════════════════════ */
  let selectedConFile = null;

  async function loadConsentimiento() {
    await loadPacientesSelect('conPaciente');
    const { data, error } = await db.from('Consentimiento_Informado').select('*').order('id');
    if (error) { toast('Error consentimiento: ' + error.message, 'error'); return; }
    // Add file column (soporte field as file link)
    const tbody = document.querySelector('#tablaConsentimiento tbody');
    tbody.innerHTML = '';
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:24px">Sin registros</td></tr>';
      return;
    }
    data.forEach(row => {
      const tr = document.createElement('tr');
      ['id','ID_Paciente','procedimiento','aceptacion'].forEach(c => {
        const td = document.createElement('td');
        td.textContent = row[c] ?? '—';
        tr.appendChild(td);
      });
      // Soporte/archivo
      const tdFile = document.createElement('td');
      if (row.soporte && row.soporte.startsWith('http')) {
        const a = document.createElement('a');
        a.href = row.soporte; a.target = '_blank';
        a.textContent = '📎 Ver archivo';
        a.style.color = 'var(--teal-600)';
        tdFile.appendChild(a);
      } else {
        tdFile.textContent = row.soporte || '—';
      }
      tr.appendChild(tdFile);
      tbody.appendChild(tr);
    });
  }

  // File upload area interactions
  const uploadArea  = document.getElementById('fileUploadArea');
  const fileInput   = document.getElementById('conArchivo');
  const filePreview = document.getElementById('filePreview');
  const uploadInner = document.getElementById('fileUploadInner');

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) handleFileSelect(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
  });

  function handleFileSelect(file) {
    selectedConFile = file;
    uploadInner.style.display = 'none';
    filePreview.classList.remove('hidden');
    filePreview.innerHTML = `📎 <strong>${file.name}</strong> &nbsp;·&nbsp; ${(file.size/1024).toFixed(1)} KB`;
  }

  document.getElementById('btnNuevoConsentimiento').addEventListener('click', () => {
    loadPacientesSelect('conPaciente');
    toggleForm('formConsentimiento', true);
  });
  document.getElementById('btnCancelarConsentimiento').addEventListener('click', () => {
    toggleForm('formConsentimiento', false);
    resetForm('formConsentimiento');
    resetFileUpload();
  });

  function resetFileUpload() {
    selectedConFile = null;
    fileInput.value = '';
    filePreview.classList.add('hidden');
    filePreview.innerHTML = '';
    uploadInner.style.display = 'flex';
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('progressFill').style.width = '0%';
  }

  document.getElementById('btnGuardarConsentimiento').addEventListener('click', async () => {
    const pacienteId = parseInt(document.getElementById('conPaciente').value) || null;
    if (!pacienteId) { toast('Selecciona un paciente.', 'error'); return; }

    let fileUrl = '';

    // Upload file if selected
    if (selectedConFile) {
      const progEl    = document.getElementById('uploadProgress');
      const fillEl    = document.getElementById('progressFill');
      const statusEl  = document.getElementById('uploadStatus');
      progEl.classList.remove('hidden');
      fillEl.style.width = '30%';
      statusEl.textContent = 'Subiendo archivo...';

      const safeName   = selectedConFile.name.replace(/\s+/g, '_');
      const filePath   = `consentimientos/${pacienteId}_${Date.now()}_${safeName}`;

      const { data: upData, error: upError } = await db.storage
        .from('consentimientos')
        .upload(filePath, selectedConFile, { upsert: true });

      if (upError) {
        fillEl.style.width = '100%';
        statusEl.textContent = 'Error al subir: ' + upError.message;
        toast('Error al subir archivo: ' + upError.message, 'error');
        return;
      }

      fillEl.style.width = '80%';
      statusEl.textContent = 'Obteniendo URL...';

      const { data: urlData } = db.storage
        .from('consentimientos')
        .getPublicUrl(filePath);

      fileUrl = urlData?.publicUrl || '';
      fillEl.style.width = '100%';
      statusEl.textContent = '✅ Archivo subido correctamente';
    }

    const payload = {
      ID_Paciente:          pacienteId,
      procedimiento:        document.getElementById('conProcedimiento').value.trim() || null,
      descripcion:          document.getElementById('conDescripcion').value.trim() || null,
      riesgos_implicados:   document.getElementById('conRiesgos').value.trim() || null,
      alternatica_disponible: document.getElementById('conAlternativa').value.trim() || null,
      testigo:              document.getElementById('conTestigo').value.trim() || null,
      aceptacion:           document.getElementById('conAceptacion').value || null,
      observaciones:        document.getElementById('conObservaciones').value.trim() || null,
      soporte:              fileUrl || document.getElementById('conSoporte').value.trim() || null,
    };

    const { error } = await db.from('Consentimiento_Informado').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }

    toast('✅ Consentimiento registrado');
    toggleForm('formConsentimiento', false);
    resetForm('formConsentimiento');
    resetFileUpload();
    await loadConsentimiento();
  });

  /* ══════════════════════════════════════
     MÓDULO: EPICRISIS
  ══════════════════════════════════════ */
  async function loadEpicrisis() {
    await loadPacientesSelect('epiPaciente');
    const { data, error } = await db.from('Epicrisis').select('*').order('id');
    if (error) { toast('Error epicrisis: ' + error.message, 'error'); return; }
    buildTable('tablaEpicrisis', data, ['id','ID_Paciente','ID_Médico','resumen del alta']);
  }

  document.getElementById('btnNuevaEpicrisis').addEventListener('click', () => {
    loadPacientesSelect('epiPaciente');
    toggleForm('formEpicrisis', true);
  });
  document.getElementById('btnCancelarEpicrisis').addEventListener('click', () => {
    toggleForm('formEpicrisis', false); resetForm('formEpicrisis');
  });
  document.getElementById('btnGuardarEpicrisis').addEventListener('click', async () => {
    const payload = {
      ID_Paciente:      parseInt(document.getElementById('epiPaciente').value) || null,
      'ID_Médico':      parseInt(document.getElementById('epiMedico').value) || null,
      'resumen del alta': document.getElementById('epiResumen').value.trim() || null,
      indicaciones:     document.getElementById('epiIndicaciones').value.trim() || null,
    };
    if (!payload.ID_Paciente) { toast('Selecciona un paciente.', 'error'); return; }
    const { error } = await db.from('Epicrisis').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Epicrisis guardada');
    toggleForm('formEpicrisis', false); resetForm('formEpicrisis');
    await loadEpicrisis();
  });

  /* ══════════════════════════════════════
     MÓDULO: HORARIOS MÉDICOS
  ══════════════════════════════════════ */
  async function loadHorarios() {
    const { data, error } = await db.from('Horarios _Medicos').select('*').order('id');
    if (error) { toast('Error horarios: ' + error.message, 'error'); return; }
    buildTable('tablaHorarios', data, ['id','ID_Médico','fecha, hora_inicio','hora_fin','estado']);
  }

  document.getElementById('btnNuevoHorario').addEventListener('click', () => {
    toggleForm('formHorario', true);
  });
  document.getElementById('btnCancelarHorario').addEventListener('click', () => {
    toggleForm('formHorario', false); resetForm('formHorario');
  });
  document.getElementById('btnGuardarHorario').addEventListener('click', async () => {
    const payload = {
      'ID_Médico':         parseInt(document.getElementById('horMedico').value) || null,
      'fecha, hora_inicio': document.getElementById('horInicio').value || null,
      hora_fin:            document.getElementById('horFin').value || null,
      estado:              document.getElementById('horEstado').value || null,
    };
    if (!payload['ID_Médico']) { toast('Ingresa el ID del médico.', 'error'); return; }
    const { error } = await db.from('Horarios _Medicos').insert(payload);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toast('✅ Horario registrado');
    toggleForm('formHorario', false); resetForm('formHorario');
    await loadHorarios();
  });

  /* ══════════════════════════════════════
     RESTAURAR SESIÓN AL RECARGAR
     (persiste mientras la pestaña esté abierta)
  ══════════════════════════════════════ */
  (() => {
    const stored = sessionStorage.getItem('snUser');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        enterDashboard(user);
      } catch (_) {
        sessionStorage.removeItem('snUser');
      }
    }
    // else: loginScreen ya tiene clase active en el HTML
  })();

}); // end DOMContentLoaded
