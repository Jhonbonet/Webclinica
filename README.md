# 🏥 ASENORTE · Sistema de Historias Clínicas v3.0

> Plataforma web completa para estudiantes de Enfermería de la **Corporación Educativa Asesorías del Norte (ASENORTE)**. Sistema clínico con cuatro roles diferenciados: **Enfermero/Estudiante**, **Paciente**, **Docente** y **Administrador**.

---

## ✨ Novedades v3.0

| Módulo nuevo | Descripción |
|---|---|
| 📅 Citas médicas (Paciente) | Calendario interactivo para agendar, cancelar y reprogramar citas con política de penalidad |
| 📋 Historial médico (Paciente) | Vista unificada de HCs, signos, medicamentos, notas y citas |
| 🔧 Gestión de usuarios (Admin) | Solo el administrador crea/activa/desactiva usuarios |
| 👥 Hoja Medicos | Médicos con horarios por día de semana — base para el calendario de citas |
| 📑 Hoja Citas | Nueva hoja automática con estado, penalidades y reprogramaciones |

---

## 📊 Hojas del Google Spreadsheet (13 hojas)

| # | Hoja | Tipo | Descripción |
|---|------|------|-------------|
| 1 | `Usuarios` | ★ Manual | Credenciales y roles — solo Admin puede crear |
| 2 | `Medicos` | ★ Manual | Médicos disponibles con horarios JSON por día |
| 3 | `HistoriasClinicas` | Auto | HC completas con CIE-10, vitales, antecedentes |
| 4 | `Admisiones` | Auto | Registro de admisión, RIPS, triage |
| 5 | `Kardex` | Auto | Control de medicamentos y reacciones adversas |
| 6 | `SignosVitales` | Auto | Serie histórica de signos por paciente |
| 7 | `BalanceHidrico` | Auto | Balance hidroelectrolítico por turno |
| 8 | `NotasEnfermeria` | Auto | Notas SOAP, reportes de turno |
| 9 | `Consentimientos` | Auto | Consentimientos informados |
| 10 | `Epicrisis` | Auto | Resúmenes de egreso |
| 11 | `SolicitudesPaciente` | Auto | Solicitudes del paciente al equipo |
| 12 | `Evaluaciones` | Auto | Evaluaciones de competencias (Docente) |
| 13 | `Citas` | Auto | ★ **NUEVO** Citas con estado y penalidades |

★ = crear manualmente · Auto = se crea al primer guardado

---

## ⚙️ Configuración Paso a Paso

### 1. Crear el Google Spreadsheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una nueva hoja.
2. Nombra el archivo: **ASENORTE Sistema Clínico v3.0**
3. Crea **manualmente** las hojas `Usuarios` y `Medicos` (ver estructura abajo).

---

### 2. Configurar la hoja `Usuarios`

Crea la hoja `Usuarios` con estos encabezados en la **fila 1**:

```
usuario | password | nombre | rol | activo | creadoPor | fechaCreacion
```

Agrega los siguientes **usuarios de prueba** (fila 2 en adelante):

| usuario | password | nombre | rol | activo | creadoPor | fechaCreacion |
|---------|----------|--------|-----|--------|-----------|---------------|
| admin | Admin2025# | Administrador ASENORTE | Administrador | TRUE | sistema | 2025-01-01 |
| docente01 | Doc2025# | Prof. Martínez López | Docente | TRUE | admin | 2025-01-01 |
| estudiante01 | Est2025# | Ana Gómez Hernández | Estudiante | TRUE | admin | 2025-01-01 |
| estudiante02 | Est2025# | Luis Pérez Torres | Estudiante | TRUE | admin | 2025-01-01 |
| enfermero01 | Enf2025# | Sandra López Ramos | Enfermero | TRUE | admin | 2025-01-01 |
| paciente01 | Pac2025# | Carlos Ruiz Mejía | Paciente | TRUE | admin | 2025-01-01 |
| paciente02 | Pac2025# | María Jiménez Soto | Paciente | TRUE | admin | 2025-01-01 |

> ⚠️ El rol debe ser exactamente: `Administrador`, `Docente`, `Estudiante`, `Enfermero` o `Paciente`
> ⚠️ La columna `activo` debe ser `TRUE` o `FALSE`

---

### 3. Configurar la hoja `Medicos`

Crea la hoja `Medicos` con estos encabezados en la **fila 1**:

```
id | nombre | especialidad | horarios | activo
```

Agrega los siguientes **médicos de prueba**:

| id | nombre | especialidad | horarios (JSON) | activo |
|----|--------|--------------|-----------------|--------|
| M001 | Dr. Jorge Hernández | Medicina General | `{"lunes":["08:00","09:00","10:00","11:00","14:00","15:00"],"martes":["08:00","09:00","10:00"],"miercoles":["14:00","15:00","16:00"],"jueves":["08:00","09:00","10:00","11:00"],"viernes":["08:00","09:00","10:00"]}` | TRUE |
| M002 | Dra. Patricia Salcedo | Pediatría | `{"lunes":["09:00","10:00","11:00"],"martes":["08:00","09:00","10:00","11:00","14:00"],"jueves":["14:00","15:00","16:00"],"viernes":["09:00","10:00","11:00"]}` | TRUE |
| M003 | Dr. Ramón Castro | Cardiología | `{"martes":["10:00","11:00","14:00","15:00"],"miercoles":["10:00","11:00"],"viernes":["14:00","15:00","16:00"]}` | TRUE |
| M004 | Dra. Luisa Fernández | Ginecología | `{"lunes":["14:00","15:00","16:00"],"miercoles":["08:00","09:00","10:00","11:00"],"viernes":["08:00","09:00","10:00"]}` | TRUE |

> 💡 El campo `horarios` es un JSON con las claves: `lunes`, `martes`, `miercoles`, `jueves`, `viernes`, `sabado`, `domingo`
> Cada clave contiene un array de horas en formato `"HH:MM"`

---

### 4. Publicar el Apps Script

1. Abre [script.google.com](https://script.google.com) → **Nuevo proyecto**
2. Borra el contenido por defecto y pega el contenido de `Code.gs`
3. Cambia `TU_SPREADSHEET_ID_AQUI` por el ID de tu hoja:
   - URL de tu hoja: `docs.google.com/spreadsheets/d/**[ESTE_ID]**/edit`
4. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Acceso: **Cualquier persona**
5. Autoriza los permisos y copia la **URL del Web App**

---

### 5. Configurar app.js

Abre `app.js` y reemplaza la URL en `CONFIG`:

```javascript
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/TU_ID_AQUI/exec",
};
```

---

### 6. Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "🏥 ASENORTE v3.0 - Sistema Clínico Completo"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/asenorte.git
git push -u origin main
```

**Settings → Pages → Branch: main → / (root) → Save**

URL resultante: `https://tu-usuario.github.io/asenorte/`

---

## 🔑 Roles y Módulos

```
Administrador → Todos los módulos + Gestión de Usuarios (crear/activar/desactivar)
Docente       → Todos los módulos clínicos + Evaluaciones de competencias
Estudiante    → Todos los módulos clínicos (HC, Admisión, Kárdex, Signos, Balance, Notas, Consentimiento, Epicrisis)
Enfermero     → Todos los módulos clínicos (igual que Estudiante)
Paciente      → Mis Citas (calendario) + Mi Historial + Solicitudes + Mis Signos
```

---

## 📅 Módulo de Citas — Flujo del Paciente

```
1. Paciente inicia sesión
2. Ve "Agendar Cita" → filtra por especialidad
3. Ve tarjetas de médicos disponibles → selecciona uno
4. Aparece calendario con días habilitados (según horarios del médico)
5. Días con punto verde = tienen horarios disponibles
6. Selecciona día → aparecen horas disponibles
7. Horas ocupadas aparecen con 🔒 y no se pueden seleccionar
8. Selecciona hora → aparece resumen + motivo
9. Confirma → cita guardada en hoja "Citas"

CANCELAR:
- Desde "Mis Citas" → botón "❌ Cancelar"
- Si cancela con < 24h → se registra penalidad
- Si no se presentó → se registra cargo de inasistencia

REPROGRAMAR:
- Desde "Mis Citas" → botón "🔄 Reprogramar"
- Elige nueva fecha (según horarios del médico ese día)
- Elige nueva hora → confirma
```

---

## 🔧 Gestión de Usuarios — Solo Administrador

```
- Login como: admin / Admin2025#
- Ir al tab "Usuarios"
- Crear usuario: llenar formulario → Crear Usuario
- Activar/Desactivar usuarios existentes
- Los usuarios desactivados NO pueden iniciar sesión
```

---

## 🛡️ API — Acciones del Apps Script

### GET (lectura)
| `action` | Descripción |
|----------|-------------|
| `login` | Autenticación con verificación de estado activo |
| `getHistorias` | Todas las HC |
| `getAdmisiones` | Admisiones |
| `getKardex?pacienteId=X` | Kárdex por paciente |
| `getSignosVitales?pacienteId=X` | Signos por paciente |
| `getBalance?pacienteId=X` | Balance por paciente |
| `getNotas?pacienteId=X` | Notas por paciente |
| `getConsentimientos` | Consentimientos |
| `getEpicrisis` | Epicrisis |
| `getSolicitudes?pacienteId=X` | Solicitudes del paciente |
| `getEvaluaciones` | Evaluaciones |
| `getPacientes` | Lista de IDs únicos |
| `getMedicos` | ★ Lista de médicos activos con horarios |
| `getCitas?pacienteId=X` | ★ Citas de un paciente |
| `getCitas?medicoId=X` | ★ Citas de un médico (para bloquear slots) |
| `getUsuarios` | ★ Lista de usuarios (solo Admin) |
| `getHistorialPaciente?pacienteId=X` | ★ Historial completo de un paciente |

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
| `saveCita` | ★ Agendar nueva cita (verifica disponibilidad) |
| `cancelarCita` | ★ Cancelar cita (con penalidad si < 24h) |
| `reprogramarCita` | ★ Reprogramar cita a otro horario |
| `crearUsuario` | ★ Crear usuario (solo Admin) |
| `toggleUsuario` | ★ Activar/Desactivar usuario (solo Admin) |

---

## 🗂️ Estructura del Repositorio

```
asenorte/
├── index.html      # Interfaz completa — todos los módulos v3.0
├── style.css       # Estilos responsive v3.0
├── app.js          # Lógica JS + llamadas a Google Sheets v3.0
├── Code.gs         # Backend Google Apps Script v3.0
├── pacientes.csv   # Datos de ejemplo
├── .gitignore
└── README.md
```

---

## 🔒 Seguridad

- Solo el **Administrador** puede crear y gestionar usuarios
- Los usuarios **inactivos** son bloqueados en el login
- Contraseñas visibles para el admin en Sheets — para producción real usar `Utilities.computeDigest`
- El Apps Script URL es público pero requiere credenciales válidas
- **No subas** el `SPREADSHEET_ID` real a repositorios públicos
- Las notas de enfermería quedan firmadas digitalmente con nombre y fecha

---

## 📱 Compatibilidad

| Dispositivo | Soporte |
|-------------|---------|
| Móvil (Android/iOS) | ✅ Completo — navegación inferior |
| Tablet | ✅ Completo |
| Desktop | ✅ Completo — navegación superior |
| Chrome, Firefox, Safari, Edge | ✅ |

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
