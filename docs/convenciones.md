# Convenciones de Codigo y Desarrollo

Estandares oficiales para el equipo de desarrollo del proyecto Exam Access Control.

---

## 1. Git y Flujo de Trabajo

### 1.1. Ramas
- `main`: Rama de produccion y entregas oficiales. Protegida contra push directo.
- `develop`: Rama de integracion diaria. Protegida contra push directo.
- **Ramas de funcionalidad (Features):**
  - Formato: `feature/HU-XX-nombre-corto`
  - Ejemplo: `feature/HU-01-administracion-usuarios`, `feature/HU-08-escaneo-puerta`
- **Ramas de correccion (Bugfix):**
  - Formato: `fix/HU-XX-descripcion-error`
  - Ejemplo: `fix/HU-08-corregir-doble-escaneo`

### 1.2. Mensajes de Commit (Conventional Commits)
Los mensajes deben ser en minusculas y especificar el tipo de cambio:
- `feat(HU-XX): descripcion` -> Nueva funcionalidad.
- `fix(HU-XX): descripcion` -> Correccion de un bug.
- `refactor(HU-XX): descripcion` -> Reestructuracion de codigo sin cambiar comportamiento.
- `test(HU-XX): descripcion` -> Creacion o actualizacion de pruebas.
- `docs: descripcion` -> Cambios en documentacion o README.
- `chore: descripcion` -> Tareas de configuracion o dependencias.

Ejemplo:
`feat(HU-02): agregar importador masivo de estudiantes via CSV`

### 1.3. Reglas de Pull Request (PR)
1. Toda rama debe nacer de `develop` actualizado y abrir PR hacia `develop`.
2. Un PR debe contener unicamente el codigo correspondiente a su Historia de Usuario.
3. El PR solo podra unirse (Merge) si:
   - Las pruebas automaticas de GitHub Actions pasan en verde.
   - Cuenta con la revision y aprobacion del administrador del repositorio.

---

## 2. Backend (PHP / Laravel)

Seguir el estandar oficial **PSR-12**.

### 2.1. Nomenclatura
- **Clases y Modulos:** `PascalCase` -> `EligibilityEngine`, `AccessAuditor`, `StudentController`.
- **Metodos y Funciones:** `camelCase` -> `registerAccess()`, `evaluate()`, `bulkSaveStudents()`.
- **Variables y Parametros:** `camelCase` -> `$studentKey`, `$examId`, `$roomId`.
- **Tablas de Base de Datos:** `snake_case` plural -> `students`, `exams`, `access_logs`, `classroom_assignments`.
- **Columnas de Base de Datos:** `snake_case` -> `student_key`, `room_id`, `created_at`.
- **Constantes y Enums:** `UPPER_SNAKE_CASE` -> `STATUS_HABILITADO`, `STATUS_EXPULSADO`.

### 2.2. Arquitectura de Modulos (Criterio de Parnas)
- **Controladores delgados:** Los controladores en `app/Http/Controllers/` solo reciben la peticion HTTP, validan parametros (`$request->validate(...)`) y delegan la logica a los modulos.
- **Logica en Modulos:** La logica de negocio reside en clases dentro de `app/Modules/` (`IdentityDecoder`, `CoreDataStorage`, `EligibilityEngine`, `AccessAuditor`, `ReportEngine`).
- **Tipado estricto:** Usar declaraciones de tipos en parametros y retornos en todos los metodos:
  ```php
  public function evaluate(string $studentKey, int $examId): EligibilityVerdict
  ```

---

## 3. Frontend (React & TypeScript)

### 3.1. Nomenclatura
- **Componentes React:** `PascalCase.tsx` -> `DoorScanner.tsx`, `LiveDashboard.tsx`, `StudentTable.tsx`.
- **Hooks personalizados:** `camelCase.ts` con prefijo `use` -> `useAccessControl.ts`, `useLiveMetrics.ts`.
- **Servicios y Utilidades:** `camelCase.ts` -> `apiClient.ts`, `dateFormatter.ts`.
- **Tipos e Interfaces TypeScript:** `PascalCase` -> `Student`, `AccessVerdict`, `ExamConfig`.
- **Variables y Funciones:** `camelCase` -> `handleScan()`, `isLoading`, `currentStudent`.

### 3.2. Estructura recomendada en `frontend/src/`
- `components/`: Componentes reutilizables (botones, modales, tablas, alertas).
- `views/` o `pages/`: Pantallas principales de la aplicacion (Puerta, Administracion, Dashboard).
- `services/`: Funciones de comunicacion HTTP hacia Laravel (`fetch` / `axios`).
- `types/`: Definiciones de interfaces y tipos TypeScript.
- `hooks/`: Hooks reutilizables de logica de estado.

---

## 4. Estandar de APIs REST (Comunicacion Frontend - Backend)

### 4.1. Formato de URLs
- Minusculas con guiones si es necesario (`kebab-case`).
- Rutas bajo el prefijo `/api/`.
- Ejemplos:
  - `POST /api/access/register` -> Registrar ingreso en puerta.
  - `GET  /api/exams/{id}/live-metrics` -> Consultar metricas en tiempo real.
  - `POST /api/students/bulk-import` -> Importacion masiva de estudiantes.

### 4.2. Formato de Respuestas JSON
Todas las respuestas de la API deben seguir una estructura consistente:

**Respuesta Exitosa:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operacion realizada con exito"
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "error": "Motivo del error",
  "details": [ ... ]
}
```

### 4.3. Codigos de Estado HTTP
- `200 OK`: Consulta o accion exitosa.
- `201 Created`: Recurso creado exitosamente (ej. estudiante registrado).
- `400 Bad Request`: Datos invalidos o parametros faltantes.
- `401 Unauthorized`: Usuario no autenticado.
- `403 Forbidden`: Usuario sin permisos para esta accion.
- `404 Not Found`: Recurso no encontrado (ej. examen inexistente).
- `422 Unprocessable Entity`: Error en validacion de formulario.
- `500 Internal Server Error`: Error no controlado en el servidor.

---

## 5. Pruebas Automatizadas (Testing)

- Todo modulo o funcionalidad critica desarrollada en el backend debe incluir sus pruebas correspondientes en `backend/tests/Unit/` o `backend/tests/Feature/`.
- Las pruebas deben ejecutarse y pasar localmente antes de hacer push:
  ```bash
  # En backend
  vendor/bin/phpunit
  ```
