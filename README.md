# 🏥 ASENORTE · Sistema de Historias Clínicas v2.0

> Plataforma web completa para estudiantes de Enfermería de la **Corporación Educativa Asesorías del Norte (ASENORTE)**. Sistema clínico con tres roles diferenciados: **Enfermero/Estudiante**, **Paciente** y **Docente**.

---

## ✨ Módulos del Sistema

### 👩‍⚕️ Rol Enfermero / Estudiante
| Módulo | Descripción |
|--------|-------------|
| 📋 Historia Clínica | Registro completo con datos ampliados (estado civil, escolaridad, contacto de emergencia, CIE-10) |
| 🏥 Admisión + RIPS | Verificación de derechos, tipo de admisión, servicio, prioridad y generación automática de código RIPS |
| 💊 Kárdex | Prescripción médica, vía, dosis, frecuencia, administración y reacciones adversas |
| 📊 Signos Vitales | Serie histórica con tabla de evolución por paciente, escala de dolor y estado de conciencia |
| 💧 Balance Hídrico | Ingesta oral/parenteral, eliminación por tipo, cálculo automático de balance en tiempo real |
| 📝 Notas de Enfermería | Editor con guía SOAP, tipos de nota, turno y firma digital automática |
| ✅ Consentimiento Informado | Registro del procedimiento, riesgos, alternativas y aceptación del paciente |
| 📄 Epicrisis | Resumen completo de egreso, diagnóstico CIE-10, días de estancia, medicamentos y citas |
| 🔍 Buscar | Búsqueda por nombre, ID, diagnóstico o EPS |

### 🏥 Rol Paciente
| Módulo | Descripción |
|--------|-------------|
| 📨 Mis Solicitudes | Envío de solicitudes al equipo de enfermería con tipo de dolor e intensidad |
| 📊 Mis Signos Vitales | Visualización de su historial de signos vitales registrados |

### 👩‍🏫 Rol Docente
| Módulo | Descripción |
|--------|-------------|
| ⭐ Evaluación de Competencias | Registro de evaluaciones por competencia, criterio y calificación con firma del docente |

---

## 🗂️ Estructura del Repositorio

```
asenorte/
├── index.html       # Interfaz completa (todos los módulos)
├── style.css        # Estilos responsive v2.0
├── app.js           # Lógica JS + llamadas a Google Sheets
├── Code.gs          # Backend Google Apps Script v2.0
├── pacientes.csv    # Datos de ejemplo
├── .gitignore
└── README.md
```

---

## 📊 Hojas de Google Sheets Requeridas

El sistema gestiona **10 hojas automáticamente** (se crean solas al primer guardado):

| Hoja | Descripción | Se crea |
|------|-------------|---------|
| `Usuarios` | Credenciales y roles | Manual |
| `HistoriasClinicas` | HC completas | Automática |
| `Admisiones` | Registro de admisión + RIPS | Automática |
| `Kardex` | Control de medicamentos | Automática |
| `SignosVitales` | Series de signos por paciente | Automática |
| `BalanceHidrico` | Balance hidroelectrolítico | Automática |
| `NotasEnfermeria` | Notas y reportes de turno | Automática |
| `Consentimientos` | Consentimientos informados | Automática |
| `Epicrisis` | Resúmenes de egreso | Automática |
| `SolicitudesPaciente` | Solicitudes del paciente | Automática |
| `Evaluaciones` | Evaluaciones docente | Automática |

---

## ⚙️ Configuración Paso a Paso

### 1. Crear el Google Spreadsheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una nueva hoja.
2. Crea **solo** la hoja `Usuarios` con estas columnas:

   | usuario | password | nombre | rol |
   |---------|----------|--------|-----|
   | estudiante01 | 1234 | Ana Gómez | Estudiante |
   | docente01 | admin2025 | Prof. Martínez | Docente |
   | paciente01 | pac123 | Carlos Pérez | Paciente |

   > ⚠️ El rol debe ser exactamente: `Estudiante`, `Docente`, o `Paciente`

3. Las demás hojas **se crean automáticamente** al primer registro.

---

### 2. Publicar el Apps Script

1. Abre [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Pega el contenido de `Code.gs`.
3. Cambia `TU_SPREADSHEET_ID_AQUI` por el ID de tu hoja
   _(URL: `docs.google.com/spreadsheets/d/**[ESTE_ID]**/edit`)_.
4. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier persona**
5. Autoriza los permisos y copia la **URL del Web App**.

---

### 3. Configurar app.js

Abre `app.js` y reemplaza la URL en `CONFIG`:

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/TU_ID_AQUI/exec",
};
```

---

### 4. Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "🏥 ASENORTE v2.0 - Sistema Clínico Completo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/asenorte.git
git push -u origin main
```

**Settings → Pages → Branch: main → / (root) → Save**

URL resultante: `https://tu-usuario.github.io/asenorte/`

---

## 🔑 Roles y Acceso

El sistema detecta automáticamente el rol al iniciar sesión y muestra solo los módulos correspondientes:

```
Estudiante / Enfermero → Todos los módulos clínicos
Docente               → Todos los módulos clínicos + Evaluaciones  
Paciente              → Mis Solicitudes + Mis Signos Vitales
```

---

## 🛡️ Acciones del Apps Script (API)

### GET (lectura)
| `action` | Descripción |
|----------|-------------|
| `login` | Autenticación |
| `getHistorias` | Todas las HC |
| `getAdmisiones` | Admisiones |
| `getKardex?pacienteId=X` | Kardex por paciente |
| `getSignosVitales?pacienteId=X` | Signos por paciente |
| `getBalance?pacienteId=X` | Balance por paciente |
| `getNotas?pacienteId=X` | Notas por paciente |
| `getConsentimientos` | Consentimientos |
| `getEpicrisis` | Epicrisis |
| `getSolicitudes?pacienteId=X` | Solicitudes del paciente |
| `getEvaluaciones` | Evaluaciones |
| `getPacientes` | Lista de IDs únicos |

### POST (escritura)
| `action` | Descripción |
|----------|-------------|
| `saveHistoria` | Nueva HC |
| `saveAdmision` | Admisión + RIPS |
| `saveKardex` | Registro de medicamento |
| `saveSignosVitales` | Toma de signos |
| `saveBalance` | Balance hídrico |
| `saveNota` | Nota de enfermería |
| `saveConsentimiento` | Consentimiento |
| `saveEpicrisis` | Epicrisis de egreso |
| `saveSolicitud` | Solicitud del paciente |
| `saveEvaluacion` | Evaluación docente |
| `responderSolicitud` | Respuesta a solicitud |

---

## 📱 Compatibilidad

| Dispositivo | Soporte |
|-------------|---------|
| Móvil (Android/iOS) | ✅ Completo |
| Tablet | ✅ Completo |
| Desktop | ✅ Completo |
| Chrome, Firefox, Safari, Edge | ✅ |

---

## 🔒 Consideraciones de Seguridad

- Las contraseñas en Google Sheets son visibles para el propietario de la hoja. Para producción real, implementar hashing con `Utilities.computeDigest`.
- El Apps Script URL es público pero requiere credenciales válidas para operar.
- **No subas** el `SPREADSHEET_ID` real a repositorios públicos.
- Cada nota de enfermería queda firmada con nombre de usuario y fecha/hora.

---

## 🛠️ Tecnologías

- **HTML5 · CSS3 · JavaScript** (Vanilla, sin frameworks)
- **Google Apps Script** (backend serverless)
- **Google Sheets** (base de datos relacional simplificada)
- **Google Fonts**: DM Serif Display + DM Sans

---

## 👩‍⚕️ Créditos

Desarrollado para la **Corporación Educativa Asesorías del Norte — ASENORTE**
Programa de Enfermería · Práctica clínica estudiantil

---

## 📄 Licencia

MIT — Libre para uso educativo e institucional.
