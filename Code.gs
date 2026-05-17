// ═══════════════════════════════════════════════════════════════
// ASENORTE · Code.gs  (Google Apps Script)
// 
// INSTRUCCIONES DE CONFIGURACIÓN:
//   1. Ve a https://script.google.com → Nuevo proyecto.
//   2. Pega todo este código en el editor.
//   3. Cambia SPREADSHEET_ID por el ID de tu hoja de cálculo
//      (aparece en la URL: .../spreadsheets/d/[ESTE_ID]/edit).
//   4. Crea dos hojas dentro del Spreadsheet:
//        • "Usuarios"          (columnas: usuario | password | nombre | rol)
//        • "HistoriasClinicas" (se crea automáticamente con los headers)
//   5. Implementar → Nueva implementación:
//        • Tipo: Aplicación web
//        • Ejecutar como: Yo
//        • Acceso: Cualquier persona
//   6. Copia la URL generada y pégala en app.js → CONFIG.APPS_SCRIPT_URL
// ═══════════════════════════════════════════════════════════════

var SPREADSHEET_ID = "1U_qRYdAe9HdbeJ1M_JSxtBNmjZwRn7nYcVoaEl29EvY";

// ── Cabeceras de HistoriasClinicas ──────────────────────────
var HC_HEADERS = [
  "fecha","registradoPor","nombre","identificacion","fechaNacimiento",
  "sexo","grupoSanguineo","direccion","telefono","eps",
  "motivo","enfermedadActual","antPersonales","antFamiliares","alergias",
  "temperatura","frecCardiaca","frecResp","presionArterial","spo2",
  "peso","talla","glucemia","imc",
  "examenFisico","diagnostico","plan","observaciones"
];

// ── GET ──────────────────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action;
  var result;

  if (action === "login") {
    result = loginUser(e.parameter.usuario, e.parameter.password);
  } else if (action === "getHistorias") {
    result = getHistorias();
  } else {
    result = { success: false, message: "Acción no reconocida" };
  }

  return jsonResponse(result);
}

// ── POST ─────────────────────────────────────────────────────
function doPost(e) {
  var body   = JSON.parse(e.postData.contents);
  var action = body.action;
  var result;

  if (action === "saveHistoria") {
    result = saveHistoria(body);
  } else {
    result = { success: false, message: "Acción no reconocida" };
  }

  return jsonResponse(result);
}

// ── LOGIN ────────────────────────────────────────────────────
function loginUser(usuario, password) {
  if (!usuario || !password) {
    return { success: false, message: "Faltan credenciales" };
  }

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");

  if (!sheet) {
    return { success: false, message: "Hoja 'Usuarios' no encontrada" };
  }

  var data = sheet.getDataRange().getValues();
  // Fila 0 = encabezados
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[0]).trim() === usuario && String(row[1]).trim() === password) {
      return {
        success: true,
        nombre:  String(row[2] || usuario),
        rol:     String(row[3] || "Estudiante")
      };
    }
  }

  return { success: false, message: "Usuario o contraseña incorrectos" };
}

// ── GUARDAR HISTORIA ─────────────────────────────────────────
function saveHistoria(body) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("HistoriasClinicas");

  // Crear hoja si no existe
  if (!sheet) {
    sheet = ss.insertSheet("HistoriasClinicas");
    sheet.appendRow(HC_HEADERS);
    sheet.getRange(1, 1, 1, HC_HEADERS.length)
         .setFontWeight("bold")
         .setBackground("#0D1F3C")
         .setFontColor("#FFFFFF");
  }

  // Si la hoja existe pero está vacía, agregar headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HC_HEADERS);
    sheet.getRange(1, 1, 1, HC_HEADERS.length)
         .setFontWeight("bold")
         .setBackground("#0D1F3C")
         .setFontColor("#FFFFFF");
  }

  var row = HC_HEADERS.map(function(key) {
    return body[key] !== undefined ? body[key] : "";
  });

  sheet.appendRow(row);

  return { success: true, message: "Historia clínica guardada correctamente" };
}

// ── LEER HISTORIAS ───────────────────────────────────────────
function getHistorias() {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("HistoriasClinicas");

  if (!sheet || sheet.getLastRow() < 2) {
    return { success: true, historias: [] };
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var historias = [];

  for (var i = data.length - 1; i >= 1; i--) {   // más reciente primero
    var row = data[i];
    var obj = {};
    headers.forEach(function(h, idx) {
      obj[h] = row[idx];
    });
    historias.push(obj);
  }

  return { success: true, historias: historias };
}

// ── HELPER ───────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
