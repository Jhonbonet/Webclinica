// ═══════════════════════════════════════════════════════════════
// ASENORTE · Code.gs  v2.0  (Google Apps Script)
//
// HOJAS REQUERIDAS EN EL SPREADSHEET:
//   • Usuarios            — usuario | password | nombre | rol
//   • HistoriasClinicas   — (auto-creada)
//   • Admisiones          — (auto-creada) Registro de admisión + RIPS
//   • Kardex              — (auto-creada) Control de medicamentos
//   • SignosVitales       — (auto-creada) Series de signos vitales
//   • BalanceHidrico      — (auto-creada) Balance de líquidos
//   • NotasEnfermeria     — (auto-creada) Notas y reportes
//   • Consentimientos     — (auto-creada) Consentimientos informados
//   • Epicrisis           — (auto-creada) Epicrisis / cierre de HC
//   • SolicitudesPaciente — (auto-creada) Solicitudes del paciente
//   • Evaluaciones        — (auto-creada) Evaluaciones docente
//
// INSTRUCCIONES:
//   1. Ve a https://script.google.com → Nuevo proyecto.
//   2. Pega este código en el editor.
//   3. Cambia SPREADSHEET_ID por el ID de tu hoja de cálculo.
//   4. Implementar → Nueva implementación:
//        • Tipo: Aplicación web
//        • Ejecutar como: Yo
//        • Acceso: Cualquier persona
//   5. Copia la URL y pégala en app.js → CONFIG.APPS_SCRIPT_URL
// ═══════════════════════════════════════════════════════════════

var SPREADSHEET_ID = "TU_SPREADSHEET_ID_AQUI";

// ── Cabeceras por hoja ───────────────────────────────────────

var HC_HEADERS = [
  "fecha","registradoPor","nombre","identificacion","fechaNacimiento",
  "sexo","grupoSanguineo","direccion","telefono","eps","regimen",
  "ocupacion","escolaridad","estadoCivil","contactoEmergencia","telefonoEmergencia",
  "motivo","enfermedadActual","antPersonales","antFamiliares","alergias",
  "temperatura","frecCardiaca","frecResp","presionArterial","spo2",
  "peso","talla","glucemia","imc",
  "examenFisico","diagnostico","codigoCIE10","plan","observaciones"
];

var ADMISION_HEADERS = [
  "fechaAdmision","registradoPor","pacienteId","pacienteNombre",
  "tipoAdmision","servicioDestino","medico","prioridad",
  "eps","regimen","numeroAfiliacion","derechosVerificados",
  "motivoAdmision","condicionIngreso","origenAtencion",
  "ripsGenerado","codigoRIPS","observacionesAdmision"
];

var KARDEX_HEADERS = [
  "fecha","hora","registradoPor","pacienteId","pacienteNombre",
  "medicamento","concentracion","forma","dosis","via","frecuencia",
  "prescritoPor","horaAdministracion","administrado","loteVacuna",
  "reaccionAdversa","descripcionReaccion","observaciones"
];

var SIGNOS_HEADERS = [
  "fecha","hora","registradoPor","pacienteId","pacienteNombre",
  "temperatura","frecCardiaca","frecResp","presionArterial","spo2",
  "glucemia","peso","talla","imc","dolor","estadoConciencia","observaciones"
];

var BALANCE_HEADERS = [
  "fecha","turno","registradoPor","pacienteId","pacienteNombre",
  "ingestaOral","ingestaParenteral","ingestaTotal",
  "eliminacionUrinaria","eliminacionHeces","eliminacionDrenajes","eliminacionOtros","eliminacionTotal",
  "balance","observaciones"
];

var NOTAS_HEADERS = [
  "fecha","hora","registradoPor","pacienteId","pacienteNombre",
  "turno","tipoNota","nota","firmado"
];

var CONSENTIMIENTO_HEADERS = [
  "fecha","registradoPor","pacienteId","pacienteNombre",
  "procedimiento","descripcion","riesgos","alternativas",
  "pacienteAcepta","testigo","observaciones"
];

var EPICRISIS_HEADERS = [
  "fechaEgreso","registradoPor","pacienteId","pacienteNombre",
  "fechaIngreso","diasEstancia","motivoIngreso","resumenEvolucion",
  "procedimientosRealizados","diagnosticoEgreso","codigoCIE10Egreso",
  "condicionEgreso","tipoEgreso","recomendaciones","medicamentosEgreso","citas"
];

var SOLICITUDES_HEADERS = [
  "fecha","hora","pacienteId","pacienteNombre","tipoDolor",
  "intensidadDolor","solicitud","descripcion","atendidoPor","respuesta","fechaRespuesta"
];

var EVALUACIONES_HEADERS = [
  "fecha","docente","estudianteId","estudianteNombre","pacienteId",
  "competencia","criterio","calificacion","observaciones","firmaDocente"
];

// ── GET ──────────────────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action;
  var result;

  if      (action === "login")            result = loginUser(e.parameter.usuario, e.parameter.password);
  else if (action === "getHistorias")     result = getSheet("HistoriasClinicas", HC_HEADERS);
  else if (action === "getAdmisiones")    result = getSheet("Admisiones", ADMISION_HEADERS);
  else if (action === "getKardex")        result = getSheetFiltered("Kardex", KARDEX_HEADERS, e.parameter.pacienteId);
  else if (action === "getSignosVitales") result = getSheetFiltered("SignosVitales", SIGNOS_HEADERS, e.parameter.pacienteId);
  else if (action === "getBalance")       result = getSheetFiltered("BalanceHidrico", BALANCE_HEADERS, e.parameter.pacienteId);
  else if (action === "getNotas")         result = getSheetFiltered("NotasEnfermeria", NOTAS_HEADERS, e.parameter.pacienteId);
  else if (action === "getConsentimientos") result = getSheet("Consentimientos", CONSENTIMIENTO_HEADERS);
  else if (action === "getEpicrisis")     result = getSheet("Epicrisis", EPICRISIS_HEADERS);
  else if (action === "getSolicitudes")   result = getSheetFiltered("SolicitudesPaciente", SOLICITUDES_HEADERS, e.parameter.pacienteId);
  else if (action === "getEvaluaciones")  result = getSheet("Evaluaciones", EVALUACIONES_HEADERS);
  else if (action === "getPacientes")     result = getPacientesUnicos();
  else result = { success: false, message: "Acción no reconocida: " + action };

  return jsonResponse(result);
}

// ── POST ─────────────────────────────────────────────────────
function doPost(e) {
  var body   = JSON.parse(e.postData.contents);
  var action = body.action;
  var result;

  if      (action === "saveHistoria")      result = saveRow("HistoriasClinicas", HC_HEADERS, body);
  else if (action === "saveAdmision")      result = saveRow("Admisiones", ADMISION_HEADERS, body);
  else if (action === "saveKardex")        result = saveRow("Kardex", KARDEX_HEADERS, body);
  else if (action === "saveSignosVitales") result = saveRow("SignosVitales", SIGNOS_HEADERS, body);
  else if (action === "saveBalance")       result = saveRow("BalanceHidrico", BALANCE_HEADERS, body);
  else if (action === "saveNota")          result = saveRow("NotasEnfermeria", NOTAS_HEADERS, body);
  else if (action === "saveConsentimiento") result = saveRow("Consentimientos", CONSENTIMIENTO_HEADERS, body);
  else if (action === "saveEpicrisis")     result = saveRow("Epicrisis", EPICRISIS_HEADERS, body);
  else if (action === "saveSolicitud")     result = saveRow("SolicitudesPaciente", SOLICITUDES_HEADERS, body);
  else if (action === "saveEvaluacion")    result = saveRow("Evaluaciones", EVALUACIONES_HEADERS, body);
  else if (action === "responderSolicitud") result = responderSolicitud(body);
  else result = { success: false, message: "Acción no reconocida: " + action };

  return jsonResponse(result);
}

// ── LOGIN ────────────────────────────────────────────────────
function loginUser(usuario, password) {
  if (!usuario || !password) return { success: false, message: "Faltan credenciales" };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");
  if (!sheet) return { success: false, message: "Hoja 'Usuarios' no encontrada" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).trim() === usuario && String(row[1]).trim() === password) {
      return { success: true, nombre: String(row[2] || usuario), rol: String(row[3] || "Estudiante") };
    }
  }
  return { success: false, message: "Usuario o contraseña incorrectos" };
}

// ── GUARDAR FILA GENÉRICA ────────────────────────────────────
function saveRow(sheetName, headers, body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    appendHeaders(sheet, headers);
  } else if (sheet.getLastRow() === 0) {
    appendHeaders(sheet, headers);
  }

  var row = headers.map(function(key) { return body[key] !== undefined ? body[key] : ""; });
  sheet.appendRow(row);
  return { success: true, message: "Registro guardado en " + sheetName };
}

function appendHeaders(sheet, headers) {
  sheet.appendRow(headers);
  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setFontWeight("bold").setBackground("#0D1F3C").setFontColor("#FFFFFF");
}

// ── LEER HOJA COMPLETA ───────────────────────────────────────
function getSheet(sheetName, headers) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

  var data = sheet.getDataRange().getValues();
  var hdrs = data[0];
  var rows = [];
  for (var i = data.length - 1; i >= 1; i--) {
    var obj = {};
    hdrs.forEach(function(h, idx) { obj[h] = data[i][idx]; });
    rows.push(obj);
  }
  // Compatibilidad: "historias" para HistoriasClinicas
  if (sheetName === "HistoriasClinicas") return { success: true, historias: rows, rows: rows };
  return { success: true, rows: rows };
}

// ── LEER FILTRADO POR pacienteId ─────────────────────────────
function getSheetFiltered(sheetName, headers, pacienteId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

  var data = sheet.getDataRange().getValues();
  var hdrs = data[0];
  var pidIdx = hdrs.indexOf("pacienteId");
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    if (!pacienteId || String(data[i][pidIdx]).trim() === String(pacienteId).trim()) {
      var obj = {};
      hdrs.forEach(function(h, idx) { obj[h] = data[i][idx]; });
      rows.push(obj);
    }
  }
  rows.reverse();
  return { success: true, rows: rows };
}

// ── PACIENTES ÚNICOS (desde HistoriasClinicas) ───────────────
function getPacientesUnicos() {
  var result = getSheet("HistoriasClinicas", HC_HEADERS);
  if (!result.rows || result.rows.length === 0) return { success: true, pacientes: [] };

  var seen = {};
  var pacientes = [];
  result.rows.forEach(function(p) {
    var id = String(p.identificacion || "").trim();
    if (id && !seen[id]) {
      seen[id] = true;
      pacientes.push({ identificacion: id, nombre: p.nombre, eps: p.eps });
    }
  });
  return { success: true, pacientes: pacientes };
}

// ── RESPONDER SOLICITUD DEL PACIENTE ────────────────────────
function responderSolicitud(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("SolicitudesPaciente");
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "Sin solicitudes" };

  var data   = sheet.getDataRange().getValues();
  var hdrs   = data[0];
  var rowIdx = -1;

  // Busca la solicitud por pacienteId + fecha exacta
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    hdrs.forEach(function(h, idx) { obj[h] = data[i][idx]; });
    if (String(obj.pacienteId) === String(body.pacienteId) &&
        String(obj.fecha)      === String(body.fecha)) {
      rowIdx = i + 1; // 1-based
      break;
    }
  }

  if (rowIdx < 0) return { success: false, message: "Solicitud no encontrada" };

  var atendidoIdx     = hdrs.indexOf("atendidoPor") + 1;
  var respuestaIdx    = hdrs.indexOf("respuesta") + 1;
  var fechaRespIdx    = hdrs.indexOf("fechaRespuesta") + 1;

  sheet.getRange(rowIdx, atendidoIdx).setValue(body.atendidoPor || "");
  sheet.getRange(rowIdx, respuestaIdx).setValue(body.respuesta || "");
  sheet.getRange(rowIdx, fechaRespIdx).setValue(new Date().toISOString());

  return { success: true, message: "Solicitud respondida" };
}

// ── HELPER ───────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
