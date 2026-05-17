// ═══════════════════════════════════════════════════════════════
// ASENORTE · Code.gs  v3.0  (Google Apps Script)
//
// HOJAS DEL SPREADSHEET  (★ = crear manualmente; resto = auto):
//   ★ Usuarios            — usuario | password | nombre | rol | activo | creadoPor | fechaCreacion
//   ★ Medicos             — id | nombre | especialidad | horarios (JSON) | activo
//   • HistoriasClinicas   (auto)
//   • Admisiones          (auto)
//   • Kardex              (auto)
//   • SignosVitales       (auto)
//   • BalanceHidrico      (auto)
//   • NotasEnfermeria     (auto)
//   • Consentimientos     (auto)
//   • Epicrisis           (auto)
//   • SolicitudesPaciente (auto)
//   • Evaluaciones        (auto)
//   • Citas               (auto) ← NUEVO v3.0
//
// INSTRUCCIONES:
//   1. Crea el Spreadsheet en sheets.google.com
//   2. Crea la hoja "Usuarios" con fila de encabezados:
//      usuario | password | nombre | rol | activo | creadoPor | fechaCreacion
//   3. Agrega el usuario administrador:
//      admin | Admin2025# | Administrador ASENORTE | Administrador | TRUE | sistema | (fecha)
//   4. Crea la hoja "Medicos" con encabezados:
//      id | nombre | especialidad | horarios | activo
//   5. Agrega algunos médicos de prueba (ver abajo en comentarios)
//   6. En script.google.com → pega este código → cambia SPREADSHEET_ID
//   7. Implementar → Nueva implementación → Aplicación web → Cualquier persona
//   8. Copia la URL → pégala en app.js → CONFIG.APPS_SCRIPT_URL
//
// USUARIOS DE PRUEBA (agregar manualmente en la hoja Usuarios):
//   usuario        | password    | nombre               | rol           | activo | creadoPor | fechaCreacion
//   admin          | Admin2025#  | Administrador        | Administrador | TRUE   | sistema   | 2025-01-01
//   estudiante01   | Est2025#    | Ana Gómez Hernández  | Estudiante    | TRUE   | admin     | 2025-01-01
//   estudiante02   | Est2025#    | Luis Pérez Torres    | Estudiante    | TRUE   | admin     | 2025-01-01
//   docente01      | Doc2025#    | Prof. Martínez López | Docente       | TRUE   | admin     | 2025-01-01
//   paciente01     | Pac2025#    | Carlos Ruiz Mejía    | Paciente      | TRUE   | admin     | 2025-01-01
//   paciente02     | Pac2025#    | María Jiménez Soto   | Paciente      | TRUE   | admin     | 2025-01-01
//   enfermero01    | Enf2025#    | Sandra López Ramos   | Enfermero     | TRUE   | admin     | 2025-01-01
//
// MÉDICOS DE PRUEBA (agregar manualmente en la hoja Medicos):
//   id   | nombre                    | especialidad          | horarios (JSON)                                | activo
//   M001 | Dr. Jorge Hernández       | Medicina General      | {"lunes":["08:00","09:00","10:00","11:00","14:00","15:00","16:00"],"martes":["08:00","09:00","10:00"],"miercoles":["14:00","15:00","16:00"],"jueves":["08:00","09:00","10:00","11:00"],"viernes":["08:00","09:00","10:00"]} | TRUE
//   M002 | Dra. Patricia Salcedo     | Pediatría             | {"lunes":["09:00","10:00","11:00"],"martes":["08:00","09:00","10:00","11:00","14:00"],"jueves":["14:00","15:00","16:00"],"viernes":["09:00","10:00","11:00"]}                                                          | TRUE
//   M003 | Dr. Ramón Castro          | Cardiología           | {"martes":["10:00","11:00","14:00","15:00"],"miercoles":["10:00","11:00"],"viernes":["14:00","15:00","16:00"]}                                                                                              | TRUE
//   M004 | Dra. Luisa Fernández      | Ginecología           | {"lunes":["14:00","15:00","16:00"],"miercoles":["08:00","09:00","10:00","11:00"],"viernes":["08:00","09:00","10:00"]}                                                                                  | TRUE
// ═══════════════════════════════════════════════════════════════

var SPREADSHEET_ID = "TU_SPREADSHEET_ID_AQUI";

// ── Cabeceras ────────────────────────────────────────────────

var USUARIOS_HEADERS = [
  "usuario","password","nombre","rol","activo","creadoPor","fechaCreacion"
];

var MEDICOS_HEADERS = [
  "id","nombre","especialidad","horarios","activo"
];

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

var CITAS_HEADERS = [
  "id","fechaCreacion","pacienteId","pacienteNombre","medicoId","medicoNombre",
  "especialidad","fecha","hora","motivo","estado",
  "notas","penalidad","fechaCancelacion","motivoCancelacion"
];

// ════════════════════════════════════════════════════════════
// ── GET ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function doGet(e) {
  var action = e.parameter.action;
  var result;

  if      (action === "login")              result = loginUser(e.parameter.usuario, e.parameter.password);
  else if (action === "getHistorias")       result = getSheet("HistoriasClinicas", HC_HEADERS);
  else if (action === "getAdmisiones")      result = getSheet("Admisiones", ADMISION_HEADERS);
  else if (action === "getKardex")          result = getSheetFiltered("Kardex", KARDEX_HEADERS, e.parameter.pacienteId);
  else if (action === "getSignosVitales")   result = getSheetFiltered("SignosVitales", SIGNOS_HEADERS, e.parameter.pacienteId);
  else if (action === "getBalance")         result = getSheetFiltered("BalanceHidrico", BALANCE_HEADERS, e.parameter.pacienteId);
  else if (action === "getNotas")           result = getSheetFiltered("NotasEnfermeria", NOTAS_HEADERS, e.parameter.pacienteId);
  else if (action === "getConsentimientos") result = getSheet("Consentimientos", CONSENTIMIENTO_HEADERS);
  else if (action === "getEpicrisis")       result = getSheet("Epicrisis", EPICRISIS_HEADERS);
  else if (action === "getSolicitudes")     result = getSheetFiltered("SolicitudesPaciente", SOLICITUDES_HEADERS, e.parameter.pacienteId);
  else if (action === "getEvaluaciones")    result = getSheet("Evaluaciones", EVALUACIONES_HEADERS);
  else if (action === "getPacientes")       result = getPacientesUnicos();
  // ── NUEVAS ACCIONES v3.0 ──
  else if (action === "getMedicos")         result = getMedicos();
  else if (action === "getCitas")           result = getCitas(e.parameter.pacienteId, e.parameter.medicoId);
  else if (action === "getUsuarios")        result = getUsuarios(e.parameter.solicitante);
  else if (action === "getHistorialPaciente") result = getHistorialCompleto(e.parameter.pacienteId);
  else result = { success: false, message: "Acción no reconocida: " + action };

  return jsonResponse(result);
}

// ════════════════════════════════════════════════════════════
// ── POST ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function doPost(e) {
  var body   = JSON.parse(e.postData.contents);
  var action = body.action;
  var result;

  if      (action === "saveHistoria")       result = saveRow("HistoriasClinicas", HC_HEADERS, body);
  else if (action === "saveAdmision")       result = saveRow("Admisiones", ADMISION_HEADERS, body);
  else if (action === "saveKardex")         result = saveRow("Kardex", KARDEX_HEADERS, body);
  else if (action === "saveSignosVitales")  result = saveRow("SignosVitales", SIGNOS_HEADERS, body);
  else if (action === "saveBalance")        result = saveRow("BalanceHidrico", BALANCE_HEADERS, body);
  else if (action === "saveNota")           result = saveRow("NotasEnfermeria", NOTAS_HEADERS, body);
  else if (action === "saveConsentimiento") result = saveRow("Consentimientos", CONSENTIMIENTO_HEADERS, body);
  else if (action === "saveEpicrisis")      result = saveRow("Epicrisis", EPICRISIS_HEADERS, body);
  else if (action === "saveSolicitud")      result = saveRow("SolicitudesPaciente", SOLICITUDES_HEADERS, body);
  else if (action === "saveEvaluacion")     result = saveRow("Evaluaciones", EVALUACIONES_HEADERS, body);
  else if (action === "responderSolicitud") result = responderSolicitud(body);
  // ── NUEVAS ACCIONES v3.0 ──
  else if (action === "saveCita")           result = saveCita(body);
  else if (action === "cancelarCita")       result = cancelarCita(body);
  else if (action === "reprogramarCita")    result = reprogramarCita(body);
  else if (action === "crearUsuario")       result = crearUsuario(body);
  else if (action === "toggleUsuario")      result = toggleUsuario(body);
  else result = { success: false, message: "Acción no reconocida: " + action };

  return jsonResponse(result);
}

// ════════════════════════════════════════════════════════════
// ── AUTH ────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function loginUser(usuario, password) {
  if (!usuario || !password) return { success: false, message: "Faltan credenciales" };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");
  if (!sheet) return { success: false, message: "Hoja 'Usuarios' no encontrada" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).trim() === String(usuario).trim() &&
        String(row[1]).trim() === String(password).trim()) {
      var activo = String(row[4]).trim().toUpperCase();
      if (activo === "FALSE" || activo === "NO" || activo === "0") {
        return { success: false, message: "Usuario inactivo. Contacta al administrador." };
      }
      return {
        success: true,
        nombre: String(row[2] || usuario),
        rol:    String(row[3] || "Estudiante")
      };
    }
  }
  return { success: false, message: "Usuario o contraseña incorrectos" };
}

// ════════════════════════════════════════════════════════════
// ── GESTIÓN DE USUARIOS (solo Administrador) ─────────────────
// ════════════════════════════════════════════════════════════
function getUsuarios(solicitante) {
  // Verificar que el solicitante existe y tiene rol Administrador
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");
  if (!sheet) return { success: false, message: "Hoja no encontrada" };

  var data  = sheet.getDataRange().getValues();
  var rows  = [];
  for (var i = 1; i < data.length; i++) {
    rows.push({
      usuario:       String(data[i][0]),
      nombre:        String(data[i][2]),
      rol:           String(data[i][3]),
      activo:        String(data[i][4]),
      creadoPor:     String(data[i][5]),
      fechaCreacion: String(data[i][6])
    });
  }
  return { success: true, rows: rows };
}

function crearUsuario(body) {
  // Solo el administrador puede crear usuarios
  if (!body.creadoPor) return { success: false, message: "Sin autorización" };

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");
  if (!sheet) {
    sheet = ss.insertSheet("Usuarios");
    appendHeaders(sheet, USUARIOS_HEADERS);
  }

  // Verificar que el usuario no exista
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(body.usuario).trim()) {
      return { success: false, message: "El usuario '" + body.usuario + "' ya existe" };
    }
  }

  var row = [
    body.usuario || "",
    body.password || "",
    body.nombre   || "",
    body.rol      || "Estudiante",
    "TRUE",
    body.creadoPor || "",
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { success: true, message: "Usuario '" + body.nombre + "' creado correctamente" };
}

function toggleUsuario(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");
  if (!sheet) return { success: false, message: "Hoja no encontrada" };

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(body.usuario).trim()) {
      var nuevoEstado = body.activo === "TRUE" ? "TRUE" : "FALSE";
      sheet.getRange(i + 1, 5).setValue(nuevoEstado);
      return { success: true, message: "Usuario actualizado" };
    }
  }
  return { success: false, message: "Usuario no encontrado" };
}

// ════════════════════════════════════════════════════════════
// ── MÉDICOS ─────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function getMedicos() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Medicos");
  if (!sheet || sheet.getLastRow() < 2) return { success: true, medicos: [] };

  var data   = sheet.getDataRange().getValues();
  var hdrs   = data[0];
  var medicos = [];

  for (var i = 1; i < data.length; i++) {
    var activo = String(data[i][4]).trim().toUpperCase();
    if (activo === "FALSE") continue;
    var obj = {};
    hdrs.forEach(function(h, idx) { obj[h] = data[i][idx]; });
    // Parsear horarios JSON
    try { obj.horarios = JSON.parse(obj.horarios || "{}"); } catch(ex) { obj.horarios = {}; }
    medicos.push(obj);
  }
  return { success: true, medicos: medicos };
}

// ════════════════════════════════════════════════════════════
// ── CITAS v3.0 ──────────────────────────────────────────────
// ════════════════════════════════════════════════════════════
function saveCita(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Citas");
  if (!sheet) {
    sheet = ss.insertSheet("Citas");
    appendHeaders(sheet, CITAS_HEADERS);
  } else if (sheet.getLastRow() === 0) {
    appendHeaders(sheet, CITAS_HEADERS);
  }

  // Verificar disponibilidad: que no haya otra cita activa para ese médico en esa fecha/hora
  if (sheet.getLastRow() > 1) {
    var data   = sheet.getDataRange().getValues();
    var hdrs   = data[0];
    var medicoIdIdx = hdrs.indexOf("medicoId");
    var fechaIdx    = hdrs.indexOf("fecha");
    var horaIdx     = hdrs.indexOf("hora");
    var estadoIdx   = hdrs.indexOf("estado");

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][medicoIdIdx]) === String(body.medicoId) &&
          String(data[i][fechaIdx])    === String(body.fecha)    &&
          String(data[i][horaIdx])     === String(body.hora)     &&
          String(data[i][estadoIdx])   !== "Cancelada") {
        return { success: false, message: "Ese horario ya está reservado. Por favor elige otro." };
      }
    }
  }

  var citaId = "C" + new Date().getTime();
  var row = [
    citaId,
    new Date().toISOString(),
    body.pacienteId     || "",
    body.pacienteNombre || "",
    body.medicoId       || "",
    body.medicoNombre   || "",
    body.especialidad   || "",
    body.fecha          || "",
    body.hora           || "",
    body.motivo         || "",
    "Confirmada",
    body.notas          || "",
    "",  // penalidad
    "",  // fechaCancelacion
    ""   // motivoCancelacion
  ];
  sheet.appendRow(row);
  return { success: true, message: "Cita agendada para el " + body.fecha + " a las " + body.hora, citaId: citaId };
}

function cancelarCita(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Citas");
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "No se encontraron citas" };

  var data  = sheet.getDataRange().getValues();
  var hdrs  = data[0];
  var idIdx = hdrs.indexOf("id");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) === String(body.citaId)) {
      var rowNum = i + 1;
      // Estado
      sheet.getRange(rowNum, hdrs.indexOf("estado") + 1).setValue("Cancelada");
      // Fecha cancelación
      sheet.getRange(rowNum, hdrs.indexOf("fechaCancelacion") + 1).setValue(new Date().toISOString());
      // Motivo cancelación
      sheet.getRange(rowNum, hdrs.indexOf("motivoCancelacion") + 1).setValue(body.motivoCancelacion || "");
      // Penalidad (si cancela con < 24h de anticipación o no se presenta)
      var fechaCita = new Date(data[i][hdrs.indexOf("fecha")] + "T" + data[i][hdrs.indexOf("hora")]);
      var ahora     = new Date();
      var diffHoras = (fechaCita - ahora) / (1000 * 60 * 60);
      var penalidad = "";
      if (body.noShow) {
        penalidad = "No se presentó — cargo de inasistencia aplicado";
      } else if (diffHoras < 24) {
        penalidad = "Cancelación tardía (< 24h) — cargo simbólico aplicado";
      }
      sheet.getRange(rowNum, hdrs.indexOf("penalidad") + 1).setValue(penalidad);
      return { success: true, message: "Cita cancelada", penalidad: penalidad };
    }
  }
  return { success: false, message: "Cita no encontrada" };
}

function reprogramarCita(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Citas");
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "No se encontraron citas" };

  var data  = sheet.getDataRange().getValues();
  var hdrs  = data[0];
  var idIdx = hdrs.indexOf("id");

  // Verificar disponibilidad del nuevo slot
  var medicoIdIdx = hdrs.indexOf("medicoId");
  var fechaIdx    = hdrs.indexOf("fecha");
  var horaIdx     = hdrs.indexOf("hora");
  var estadoIdx   = hdrs.indexOf("estado");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idIdx])       !== String(body.citaId) &&
        String(data[i][medicoIdIdx]) === String(body.medicoId) &&
        String(data[i][fechaIdx])    === String(body.nuevaFecha) &&
        String(data[i][horaIdx])     === String(body.nuevaHora)  &&
        String(data[i][estadoIdx])   !== "Cancelada") {
      return { success: false, message: "El nuevo horario ya está ocupado. Elige otro." };
    }
  }

  for (var j = 1; j < data.length; j++) {
    if (String(data[j][idIdx]) === String(body.citaId)) {
      var rowNum = j + 1;
      sheet.getRange(rowNum, fechaIdx + 1).setValue(body.nuevaFecha);
      sheet.getRange(rowNum, horaIdx  + 1).setValue(body.nuevaHora);
      sheet.getRange(rowNum, estadoIdx + 1).setValue("Reprogramada");
      sheet.getRange(rowNum, hdrs.indexOf("notas") + 1).setValue(
        (data[j][hdrs.indexOf("notas")] || "") + " | Reprogramada el " + new Date().toLocaleDateString("es-CO")
      );
      return { success: true, message: "Cita reprogramada para " + body.nuevaFecha + " a las " + body.nuevaHora };
    }
  }
  return { success: false, message: "Cita no encontrada" };
}

function getCitas(pacienteId, medicoId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Citas");
  if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

  var data = sheet.getDataRange().getValues();
  var hdrs = data[0];
  var pacIdx = hdrs.indexOf("pacienteId");
  var medIdx = hdrs.indexOf("medicoId");
  var rows   = [];

  for (var i = 1; i < data.length; i++) {
    var match = true;
    if (pacienteId && String(data[i][pacIdx]).trim() !== String(pacienteId).trim()) match = false;
    if (medicoId   && String(data[i][medIdx]).trim()  !== String(medicoId).trim())  match = false;
    if (match) {
      var obj = {};
      hdrs.forEach(function(h, idx) { obj[h] = data[i][idx]; });
      rows.push(obj);
    }
  }
  rows.reverse();
  return { success: true, rows: rows };
}

// ════════════════════════════════════════════════════════════
// ── HISTORIAL COMPLETO DEL PACIENTE ─────────────────────────
// ════════════════════════════════════════════════════════════
function getHistorialCompleto(pacienteId) {
  if (!pacienteId) return { success: false, message: "Falta pacienteId" };

  var historias     = getSheet("HistoriasClinicas", HC_HEADERS).rows || [];
  var signos        = getSheetFiltered("SignosVitales",  SIGNOS_HEADERS,  pacienteId).rows || [];
  var kardex        = getSheetFiltered("Kardex",         KARDEX_HEADERS,  pacienteId).rows || [];
  var notas         = getSheetFiltered("NotasEnfermeria",NOTAS_HEADERS,   pacienteId).rows || [];
  var citas         = getCitas(pacienteId, null).rows || [];

  var hcPaciente = historias.filter(function(h) {
    return String(h.identificacion || "").trim() === String(pacienteId).trim();
  });

  return {
    success:   true,
    historias: hcPaciente,
    signos:    signos,
    kardex:    kardex,
    notas:     notas,
    citas:     citas
  };
}

// ════════════════════════════════════════════════════════════
// ── FUNCIONES GENÉRICAS ─────────────────────────────────────
// ════════════════════════════════════════════════════════════
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
  if (sheetName === "HistoriasClinicas") return { success: true, historias: rows, rows: rows };
  return { success: true, rows: rows };
}

function getSheetFiltered(sheetName, headers, pacienteId) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return { success: true, rows: [] };

  var data   = sheet.getDataRange().getValues();
  var hdrs   = data[0];
  var pidIdx = hdrs.indexOf("pacienteId");
  var rows   = [];

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

function getPacientesUnicos() {
  var result = getSheet("HistoriasClinicas", HC_HEADERS);
  if (!result.rows || result.rows.length === 0) return { success: true, pacientes: [] };

  var seen = {}, pacientes = [];
  result.rows.forEach(function(p) {
    var id = String(p.identificacion || "").trim();
    if (id && !seen[id]) {
      seen[id] = true;
      pacientes.push({ identificacion: id, nombre: p.nombre, eps: p.eps });
    }
  });
  return { success: true, pacientes: pacientes };
}

function responderSolicitud(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("SolicitudesPaciente");
  if (!sheet || sheet.getLastRow() < 2) return { success: false, message: "Sin solicitudes" };

  var data   = sheet.getDataRange().getValues();
  var hdrs   = data[0];
  var rowIdx = -1;

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    hdrs.forEach(function(h, idx) { obj[h] = data[i][idx]; });
    if (String(obj.pacienteId) === String(body.pacienteId) &&
        String(obj.fecha)      === String(body.fecha)) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx < 0) return { success: false, message: "Solicitud no encontrada" };

  sheet.getRange(rowIdx, hdrs.indexOf("atendidoPor")     + 1).setValue(body.atendidoPor || "");
  sheet.getRange(rowIdx, hdrs.indexOf("respuesta")       + 1).setValue(body.respuesta   || "");
  sheet.getRange(rowIdx, hdrs.indexOf("fechaRespuesta")  + 1).setValue(new Date().toISOString());

  return { success: true, message: "Solicitud respondida" };
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
