#  🏥 ASENORTE — Sistema de Gestión Médica  v4.0

Pasos para activar el sistema
1. Configura Supabase en app.js
Abre app.js y reemplaza las dos primeras constantes con los datos de tu proyecto:
jsconst SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_KEY = 'TU_ANON_KEY';
Los encuentras en tu panel de Supabase → Settings → API.
2. Crea el bucket de Storage
En Supabase → Storage → crea un bucket llamado exactamente consentimientos. Puedes dejarlo público o privado según tu política.
3. Coloca los tres archivos juntos
carpeta-proyecto/
├── index.html
├── style.css
└── app.js
Ábrelo con cualquier servidor local (Live Server de VS Code, por ejemplo) o súbelo a un hosting estático.

Qué incluye el sistema
MóduloFuncionalidad👤 PacientesRegistro con nombre, fecha de nac., estado y usuario🏥 AdmisiónIngreso, fecha, cama asignada y motivo📊 Signos VitalesPresión, pulso, temp., glucemia, peso, dolor, conciencia📋 Historias ClínicasDiagnóstico y antecedentes por médico💊 MedicamentosFormulario farmacéutico completo con vía y frecuencia📝 Notas EnfermeríaNotas firmadas por enfermera con timestamp💧 Balance H/ECálculo automático en tiempo real del balance neto📄 ConsentimientoFormulario + subida de archivo PDF/imagen a Supabase Storage📤 EpicrisisResumen de alta e indicaciones al egreso🗓️ Horarios MédicosProgramación de turnos con estado
