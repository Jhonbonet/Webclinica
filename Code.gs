// ═══════════════════════════════════════════════════════════════
// ASENORTE · Code.gs (Google Apps Script - MOTOR DEFINITIVO)
// ═══════════════════════════════════════════════════════════════

var SPREADSHEET_ID = "1U_qRYdAe9HdbeJ1M_JSxtBNmjZwRn7nYcVoaEl29EvY";

// Cabeceras de respaldo para Historias Clínicas
var HC_HEADERS = [
  "fecha","registradoPor","nombre","identificacion","fechaNacimiento",
  "sexo","grupoSanguineo","direccion","telefono","eps",
  "motivo","enfermedadActual","antPersonales","antFamiliares","alergias",
  "temperatura","frecCardiaca","frecResp","presionArterial","spo2",
  "peso","talla","glucemia","imc","examenFisico","diagnostico","plan","observaciones"
];

function doPost(e) {
  var JSONResponse;
  try {
    // Detectar y procesar correctamente el payload sin importar cómo lo envíe el navegador
    var data;
    if (e.postData.type === "application/json") {
      data = JSON.parse(e.postData.contents);
    } else {
      data = JSON.parse(e.postData.contents); 
    }

    var action = data.action;

    if (action === "login") {
      JSONResponse = loginUser(data.usuario, data.password);
    } else if (action === "guardarHistoria") {
      JSONResponse = guardarHistoria(data.body);
    } else if (action === "getHistorias") {
      JSONResponse = getHistorias();
    } else {
      JSONResponse = { success: false, message: "Acción no válida o no especificada." };
    }
  } catch (err) {
    JSONResponse = { success: false, message: "Error interno del servidor: " + err.toString() };
  }

  // Encapsulado compatible con políticas CORS estrictas de Chrome y Edge
  return ContentService.createTextOutput(JSON.stringify(JSONResponse))
    .setMimeType(ContentService.MimeType.JSON);
}

function loginUser(username, password) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Usuarios");

  if (!sheet) {
    return { success: false, message: "Error: No se encontró la pestaña 'Usuarios' en la hoja de cálculo." };
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return { success: false, message: "La base de datos de usuarios está vacía." };
  }

  // Normalizar encabezados a minúsculas
  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  var userIdx = headers.indexOf("usuario");
  var passIdx = headers.indexOf("password");
  var nomIdx  = headers.indexOf("nombre");
  var rolIdx  = headers.indexOf("rol");

  if (userIdx === -1 || passIdx === -1) {
    return { success: false, message: "Estructura incorrecta. Faltan las columnas 'usuario' y 'password'." };
  }

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var sheetUser = String(row[userIdx]).trim().toLowerCase();
    var sheetPass = String(row[passIdx]).trim();

    if (sheetUser === String(username).trim().toLowerCase() && sheetPass === String(password).trim()) {
      return {
        success: true,
        user: {
          usuario: row[userIdx],
          nombre: nomIdx !== -1 && row[nomIdx] ? row[nomIdx] : row[userIdx],
          rol: rolIdx !== -1 && row[rolIdx] ? row[rolIdx] : "Estudiante"
        }
      };
    }
  }

  return { success: false, message: "El usuario o la contraseña son incorrectos." };
}

function guardarHistoria(body) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("HistoriasClinicas") || ss.insertSheet("HistoriasClinicas");
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HC_HEADERS);
  }

  var row = HC_HEADERS.map(function(key) { return body[key] !== undefined ? body[key] : ""; });
  sheet.appendRow(row);
  return { success: true, message: "Historia clínica guardada con éxito." };
}

function getHistorias() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName("HistoriasClinicas");
  if (!sheet || sheet.getLastRow() < 2) return { success: true, historias: [] };

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var historias = [];

  for (var i = data.length - 1; i >= 1; i--) {
    var row = data[i];
    var obj = {};
    headers.forEach(function(h, idx) { obj[h] = row[idx]; });
    historias.push(obj);
  }
  return { success: true, historias: historias };
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Servidor Clínico ASENORTE Activo" }))
    .setMimeType(ContentService.MimeType.JSON);
}
