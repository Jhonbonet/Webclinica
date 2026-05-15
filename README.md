# 🏥 ASENORTE · Sistema de Historias Clínicas

> Plataforma web para estudiantes de Enfermería de la **Corporación Educativa Asesorías del Norte (ASENORTE)**. Permite iniciar sesión, registrar y consultar historias clínicas de pacientes conectándose a una hoja de cálculo de **Google Sheets** como base de datos.

---

## 📸 Vista previa

| Login | Dashboard | Nueva HC |
|-------|-----------|----------|
| Pantalla de autenticación segura | Lista de pacientes con tarjetas | Formulario completo de 4 secciones |

---

## ✨ Funcionalidades

- 🔐 **Inicio de sesión** validado contra Google Sheets (hoja `Usuarios`)
- 📋 **Registro de historias clínicas** completo:
  - Datos personales del paciente
  - Motivo de consulta y enfermedad actual
  - Antecedentes personales y familiares
  - **Signos vitales** con cálculo automático de IMC
  - Examen físico, diagnóstico y plan terapéutico
- 🔍 **Búsqueda** por nombre, ID, diagnóstico o EPS
- 📱 **100% responsive** — optimizado para móvil
- 💾 **Sin backend propio** — usa Google Apps Script como API

---

## 🗂️ Estructura del repositorio

```
asenorte/
├── index.html       # Interfaz principal (login + dashboard)
├── style.css        # Estilos responsive (mobile-first)
├── app.js           # Lógica JS + llamadas a Google Sheets
├── Code.gs          # Código del Web App de Google Apps Script
├── pacientes.csv    # Datos de ejemplo (opcional)
├── .gitignore
└── README.md
```

---

## ⚙️ Configuración paso a paso

### 1. Crear el Google Spreadsheet

1. Ve a [sheets.google.com](https://sheets.google.com) y crea una nueva hoja.
2. Crea dos pestañas con exactamente estos nombres:
   - **`Usuarios`** — con las columnas: `usuario | password | nombre | rol`
   - **`HistoriasClinicas`** — se crea automáticamente con los encabezados al guardar la primera HC.
3. Agrega al menos un usuario de prueba en la hoja `Usuarios`:

   | usuario       | password  | nombre            | rol        |
   |---------------|-----------|-------------------|------------|
   | estudiante01  | 1234      | Ana Gómez         | Estudiante |
   | docente01     | admin2025 | Prof. Martínez    | Docente    |

> ⚠️ **Seguridad:** En producción, usa contraseñas robustas. Para mayor seguridad, hashea las contraseñas en Apps Script con `Utilities.computeDigest`.

---

### 2. Publicar el Apps Script

1. Abre [script.google.com](https://script.google.com) → **Nuevo proyecto**.
2. Pega el contenido de `Code.gs`.
3. Cambia `TU_SPREADSHEET_ID_AQUI` por el ID de tu hoja  
   _(se encuentra en la URL: `docs.google.com/spreadsheets/d/**[ESTE_ID]**/edit`)_.
4. **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo (tu cuenta de Google)**
   - Acceso: **Cualquier persona**
5. Autoriza los permisos solicitados.
6. Copia la **URL del Web App** generada.

---

### 3. Configurar app.js

Abre `app.js` y reemplaza:

```javascript
APPS_SCRIPT_URL: "https://script.google.com/macros/s/TU_ID_AQUI/exec",
```

con la URL copiada en el paso anterior.

---

### 4. Publicar en GitHub Pages

```bash
git init
git add .
git commit -m "🏥 ASENORTE - Sistema Clínico v1.0"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/asenorte.git
git push -u origin main
```

Luego en tu repositorio de GitHub:  
**Settings → Pages → Branch: main → / (root) → Save**

La URL será: `https://tu-usuario.github.io/asenorte/`

---

## 📱 Compatibilidad

| Dispositivo | Soporte |
|-------------|---------|
| Móvil (Android/iOS) | ✅ Completo |
| Tablet | ✅ Completo |
| Desktop | ✅ Completo |
| Chrome, Firefox, Safari, Edge | ✅ |

---

## 🔒 Consideraciones de seguridad

- Las contraseñas en Google Sheets son visibles para el propietario. Para un entorno académico esto es aceptable; para producción real, implementar hashing.
- El Apps Script URL es público pero requiere credenciales para acceder a datos sensibles.
- Agrega CORS solo a dominios autorizados si necesitas mayor restricción.
- **No subas** el `SPREADSHEET_ID` real a un repositorio público; usa variables de entorno o un archivo de configuración local no versionado.

---

## 🛠️ Tecnologías

- **HTML5** · **CSS3** · **JavaScript** (Vanilla, sin frameworks)
- **Google Apps Script** (backend serverless)
- **Google Sheets** (base de datos)
- **Google Fonts**: DM Serif Display + DM Sans

---

## 👩‍⚕️ Créditos

Desarrollado para la **Corporación Educativa Asesorías del Norte — ASENORTE**  
Programa de Enfermería · Práctica clínica estudiantil

---

## 📄 Licencia

MIT — Libre para uso educativo e institucional.
