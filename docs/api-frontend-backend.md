# Guia de Integracion API (Frontend - Backend)

Base URL: `http://localhost:8000/api`

Formato general de peticiones:
- Header `Accept: application/json` en todas las consultas.
- Header `Content-Type: application/json` en peticiones con cuerpo JSON.
- Header `Authorization: Bearer <token>` para peticiones autenticadas.

---

## 1. Autenticacion

### Iniciar Sesion
- **Ruta:** `POST /api/auth/login`
- **Body:**
```json
{
  "email": "admin@umss.edu.bo",
  "password": "password123"
}
```
- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "role": "ADMIN",
    "fullName": "Administrador del Sistema",
    "email": "admin@umss.edu.bo",
    "token": "eyJ0eXAi...",
    "isActive": true,
    "tokenType": "bearer",
    "expiresIn": 21600
  },
  "message": "Autenticación exitosa."
}
```
- **Errores:**
  - `401 Unauthorized`: `{"success": false, "message": "Credenciales incorrectas"}`
  - `422 Unprocessable Entity`: Error de validacion de campos.

---

## 2. Administracion de Personal Academico

### Listar Personal Academico
- **Ruta:** `GET /api/academic-staff`
- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "userId": 2,
      "fullName": "Perez Gomez Juan",
      "email": "docente@umss.edu.bo",
      "role": "TEACHER",
      "isActive": true
    }
  ],
  "message": "Personal académico obtenido exitosamente."
}
```

### Registrar Personal Academico
- **Ruta:** `POST /api/academic-users`
- **Body:**
```json
{
  "fullName": "Mariana Rios",
  "email": "mariana.rios@umss.edu.bo",
  "password": "Password123!",
  "role": "DOCENTE"
}
```
*Valores validos para `role`: `"DOCENTE"`, `"AUXILIAR"`, `"ADMIN"`.*

- **Respuesta Exitosa (201 Created):**
```json
{
  "success": true,
  "message": "Usuario registrado correctamente",
  "timestamp": "2026-09-20T12:00:00.000000Z"
}
```
- **Errores:**
  - `400 Bad Request`: `{"success": false, "message": "El correo debe pertenecer al dominio institucional @umss.edu.bo"}`
  - `400 Bad Request`: `{"success": false, "message": "El correo ya está registrado"}`
  - `422 Unprocessable Entity`: Campos requeridos o formato invalido.

### Modificar Personal Academico
- **Ruta:** `PUT /api/academic-users/{userId}`
- **Body:**
```json
{
  "fullName": "Juan Carlos Perez Gomez",
  "email": "juan.perez@umss.edu.bo",
  "role": "DOCENTE",
  "newPassword": "NuevaPassword123!"
}
```
*`newPassword` es opcional (puede enviarse `null` o no incluirse si no se desea cambiar la clave).*

- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "message": "Usuario actualizado correctamente",
  "timestamp": "2026-09-20T12:00:00.000000Z"
}
```
- **Errores:**
  - `404 Not Found`: `{"success": false, "message": "Usuario no encontrado"}`
  - `400 Bad Request`: `{"success": false, "message": "El correo ya está registrado por otro usuario"}`
  - `422 Unprocessable Entity`: Validacion de campos.

---

## 3. Padron y Planillas de Estudiantes

### Importar Padron Oficial (CSV)
- **Ruta:** `POST /api/students/import`
- **Content-Type:** `multipart/form-data`
- **Body Form-Data:**
  - `file`: Archivo binario `.csv`.
- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 5,
    "successful": 5,
    "skipped": 0,
    "observations": [],
    "isSuccessful": true
  },
  "message": "Student roster processed successfully."
}
```
- **Errores:**
  - `422 Unprocessable Entity`: Formato de archivo o columnas invalidas.

### Listar Planillas Procesadas
- **Ruta:** `GET /api/processed-rosters`
- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "courseGroupId": "INF110-G1-2/2026",
      "subjectCode": "INF110",
      "subjectName": "Introduccion a la Programacion",
      "groupCode": "1",
      "academicTerm": "2/2026",
      "totalStudents": 5
    }
  ],
  "message": "Planillas procesadas obtenidas exitosamente."
}
```

---

## 4. Modulo Docente y Materias

### Listar Materias Asignadas a un Docente
- **Ruta:** `GET /api/teachers/{teacherId}/courses`
- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "courseGroupId": "INF110-G1-2/2026",
      "subjectCode": "INF110",
      "subjectName": "Introduccion a la Programacion",
      "groupCode": "1",
      "academicTerm": "2/2026",
      "totalEnrolled": 5,
      "teacherId": 3
    }
  ],
  "message": "Materias del docente obtenidas exitosamente."
}
```

---

## 5. Gestion de Habilitacion de Estudiantes

### Actualizar Estado de Habilitacion de un Estudiante
- **Ruta:** `PUT /api/courses/{courseGroupId}/students/{studentKey}/status`
- **Parametros en URL:**
  - `courseGroupId`: Identificador de materia (ej. `INF110-G1-2/2026`).
  - `studentKey`: Codigo SIS o C.I. del estudiante (ej. `202100482`).
- **Body:**
```json
{
  "status": "INHABILITADO",
  "reason": "No entrego Proyecto 2"
}
```
*Valores validos para `status`: `"HABILITADO"`, `"INHABILITADO"`.*
*`reason` es obligatorio cuando `status` es `"INHABILITADO"`.*

- **Respuesta Exitosa (200 OK):**
```json
{
  "success": true,
  "message": "Estado del estudiante actualizado correctamente.",
  "timestamp": "2026-09-20T12:00:00.000000Z"
}
```
- **Errores:**
  - `400 Bad Request`: `{"success": false, "message": "El motivo de inhabilitación es obligatorio."}`
  - `404 Not Found`: `{"success": false, "message": "Estudiante no encontrado."}`
  - `404 Not Found`: `{"success": false, "message": "El estudiante no está inscrito en este grupo de materia."}`
  - `422 Unprocessable Entity`: Validacion de formulario.
