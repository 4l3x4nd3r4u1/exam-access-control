# Exam Access Control API - Frontend Integration Guide

**Base URL:** `http://localhost:8000/api` (adjust for production)

**Authentication:** JWT Bearer Token (except `/auth/login`)

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [User Management](#user-management)
3. [Catalog/Lookup Tables](#cataloglookup-tables)
3. [Course Groups](#course-groups)
4. [Exams](#exams)
5. [Rooms & Availability](#rooms--availability)
6. [Processed Rosters](#processed-rosters)
6. [Student Status Management](#student-status-management)
7. [Student Roster Import](#student-roster-import)
8. [Teacher Courses](#teacher-courses)
8. [Error Responses](#error-responses)

---

## 🔐 Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ana.morales@umss.edu.bo",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 21600,
    "is_active": true
  }
}
```

**Headers for subsequent requests:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": 2,
    "name": "Ana Morales Gutierrez",
    "email": "ana.morales@umss.edu.bo",
    "ci": "30000001"
  }
}
```

---

### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

---

## 👥 User Management

### Register Academic User (Admin)
```http
POST /api/academic-users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Juan Carlos Perez Gomez",
  "email": "juan.perez@umss.edu.bo",
  "password": "password123",
  "ci": "30000003",
  "roles": ["DOCENTE"]
}
```

### Update Own Profile
```http
PUT /api/academic-users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "Ana Morales Gutierrez",
  "email": "ana.morales@umss.edu.bo"
}
```

### Update User Roles (Admin)
```http
PUT /api/academic-users/{userId}/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "roles": ["DOCENTE", "ADMIN"]
}
```

### List Academic Staff
```http
GET /api/academic-staff
Authorization: Bearer <token>
```

---

## 📚 Catalog/Lookup Tables (Select Options)

All endpoints require authentication.

| Endpoint | Description |
|----------|-------------|
| `GET /api/catalog/roles` | User roles (ADMIN, DOCENTE, AUXILIAR, ESTUDIANTE) |
| `GET /api/catalog/email-domains` | Valid email domains (@umss.edu.bo, etc.) |
| `GET /api/catalog/exam-types` | Exam types (PRIMER PARCIAL, EXAMEN FINAL, etc.) |
| `GET /api/catalog/rooms` | Rooms with capacity |
| `GET /api/catalog/courses` | Courses (materias) |
| `GET /api/catalog/course-groups` | Course groups (materia_grupo) |
| `GET /api/catalog/exam-types` | Exam types |
| `GET /api/catalog/rooms` | Rooms with capacity |
| `GET /api/catalog/functions` | System functions/permissions |
| `GET /api/catalog/enrollment-statuses` | HABILITADO / INHABILITADO |
| `GET /api/catalog/exam-student-statuses` | AUSENTE, PRESENTE, EXPULSADO, INGRESO EXCEPCIONAL |
| `GET /api/catalog/user-roles` | Alias for roles |
| `GET /api/catalog/email-domains` | Alias for email domains |

**Example Response:**
```json
{
  "success": true,
  "data": [
    {"value": 1, "label": "ADMIN", "description": "Administrador institucional del sistema"},
    {"value": 2, "label": "DOCENTE", "description": "Docente titular y encargado de asignatura"}
  ],
  "message": "Roles obtenidos exitosamente."
}
```

---

## 📚 Course Groups (materia_grupo)

### List All Course Groups
```http
GET /api/catalog/course-groups?gestion=2/2026&sigla=INF110
Authorization: Bearer <token>
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `gestion` | string | Academic term (e.g., `2/2026`) |
| `sigla` | string | Course code (e.g., `INF110`) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "value": "1",
      "label": "INF110 - Introduccion a la Programacion - Grupo 1 (2/2026)",
      "course_group_id": "1",
      "sigla": "INF110",
      "course_name": "Introduccion a la Programacion",
      "group_code": "1",
      "gestion": "2/2026",
      "teacher_id": 2
    }
  ],
  "message": "Grupos de materia obtenidos exitosamente."
}
```

---

## 📝 Exams

### List Exams for a Course Group
```http
GET /api/courses/{courseGroupId}/exams
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "exam_id": "2",
      "course_group_id": "1",
      "exam_type": "PRIMER PARCIAL",
      "date": "2026-11-15",
      "start_time": "08:00:00",
      "end_time": "09:30:00",
      "rooms": [
        {
          "room_id": "1",
          "room_name": "Aula 691A",
          "assigned_capacity": 3,
          "assistant_id": null
        }
      ]
    }
  ],
  "message": "Exámenes obtenidos exitosamente."
}
```

### Schedule Exam (with Manual Room Assignment)
```http
POST /api/courses/{courseGroupId}/exams
Authorization: Bearer <token>
Content-Type: application/json

{
  "examTypeId": 1,
  "date": "2026-11-15",
  "startTime": "08:00",
  "rooms": [
    { "roomId": 1, "students": [10, 11, 12], "auxiliarId": 3 },
    { "roomId": 2, "students": [13, 14, 15] }
  ],
  "generalRules": ["No celulares", "Lápiz azul"],
  "studentRules": [
    { "studentId": 10, "rule": "Tiempo extra 30 min" }
  ]
}
```

**Notes:**
- `endTime` is auto-calculated: `startTime + 90 minutes`
- `auxiliarId` is optional (supervisor user ID)
- `studentRules` are optional per-student special rules (saved as `norma_particular`)

---

## 🏫 Rooms & Availability

### Check Available Rooms
```http
GET /api/rooms/available?date=2026-10-15&startTime=08:00
Authorization: Bearer <token>
```

**Query Params:**
| Param | Format | Required |
|-------|--------|----------|
| `date` | YYYY-MM-DD | Yes |
| `startTime` | HH:MM (24h) | Yes |

**Response:**
```json
{
  "success": true,
  "data": [
    { "room_id": "1", "room_name": "Aula 691A", "capacity": 50 },
    { "room_id": "2", "room_name": "Aula 691B", "capacity": 80 }
  ],
  "message": "Aulas disponibles obtenidas exitosamente."
}
```

**Logic:** Returns rooms NOT booked for exams overlapping with the requested time slot (90-minute duration).

---

## 📋 Processed Rosters

### List All Processed Rosters
```http
GET /api/processed-rosters
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "course_group_id": "1",
      "subject_code": "INF110",
      "subject_name": "Introduccion a la Programacion",
      "group_code": "1",
      "academic_term": "2/2026",
      "teacher_name": "Ana Morales Gutierrez"
    }
  ],
  "message": "Planillas procesadas obtenidas exitosamente."
}
```

### Get Roster Detail (Students)
```http
GET /api/processed-rosters/{courseGroupId}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": {
      "course_group_id": "1",
      "subject_code": "INF110",
      "subject_name": "Introduccion a la Programacion",
      "group_code": "1",
      "academic_term": "2/2026",
      "teacher_name": "Ana Morales Gutierrez"
    },
    "students": [
      {
        "studentKey": "202600001",
        "ci": "7800001",
        "fullName": "BENITEZ REYES ANDRES",
        "status": "HABILITADO",
        "ineligibilityReason": null
      }
    ]
  },
  "message": "Detalle de planilla obtenido exitosamente."
}
```

---

## 👨‍🎓 Student Status Management

### Update Student Status
```http
PUT /api/courses/{courseGroupId}/students/{userId}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "INHABILITADO",
  "reason": "No presentó requisitos académicos"
}
```

**Parameters:**
| Field | Type | Required | Values |
|-------|------|----------|--------|
| `status` | string | ✅ | `HABILITADO` \| `INHABILITADO` |
| `reason` | string | ⚠️ | Required if status = `INHABILITADO` |

**Responses:**
- `200` - Success
- `400` - Invalid status / missing reason for INHABILITADO
- `404` - Student not found / not enrolled
- `400` - Cannot change own status

---

## 📥 Student Roster Import

### Download Template
```http
GET /api/student-roster/template
Authorization: Bearer <token>
```
Returns CSV file: `plantilla_nomina_estudiantes.csv`

### Import Roster (CSV/Excel)
```http
POST /api/student-roster/import
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <csv/xlsx file>
```

**CSV Format:**
```csv
Docente: Ana Morales Gutiérrez
Email Docente: ana.morales@umss.edu.bo
Materia: INF110 - INTRODUCCION A LA PROGRAMACION
Grupo: 1
Gestion: 2/2026

Codigo SIS,CI,Nombre Completo
202600001,7800001,BENITEZ REYES ANDRES
202600002,7800002,QUISPE PEREZ PATRICIA
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProcessed": 2,
    "successful": 2,
    "skipped": 0,
    "observations": [],
    "failedRows": [],
    "metadata": { ... }
  },
  "message": "Archivo procesado sin observaciones"
}
```

---

## 👨‍🏫 Teacher Courses

### List Teacher's Courses
```http
GET /api/teachers/{teacherId}/courses?gestion=2/2026
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "courseGroupId": "1",
      "subjectCode": "INF110",
      "subjectName": "Introduccion a la Programacion",
      "groupCode": "1",
      "academicTerm": "2/2026",
      "teacherId": 2,
      "canInteract": true
    }
  ],
  "message": "Materias asignadas obtenidas exitosamente."
}
```

---

## ❌ Error Responses

### Standard Error Format
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": ["Validation message"]
  }
}
```

### Common HTTP Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Business Logic Error |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

### Common Error Messages
| Message | Cause |
|---------|-------|
| "Unauthorized" / "Token not provided" | Missing/invalid JWT |
| "Token Signature could not be verified" | Invalid/expired token |
| "El correo debe pertenecer a un dominio institucional válido" | Email domain not allowed |
| "El CI ya está registrado" | Duplicate CI |
| "Rol no válido" | Invalid role name |
| "El motivo de inhabilitación es obligatorio" | Missing reason for INHABILITADO |

---

## 🔑 Key Identifiers Reference

| Identifier | Description | Example |
|------------|-------------|---------|
| `courseGroupId` | Numeric ID of `materia_grupo` | `1`, `2` |
| `userId` / `studentKey` | User ID (from `usuario.id`) | `7`, `10` |
| `studentKey` | Student SIS code (`codigo_sis`) | `202600001` |
| `roomId` | Room ID (`aula.id`) | `1`, `2` |
| `examTypeId` | Exam type ID | `1` (PRIMER PARCIAL) |
| `examTypeId` | Exam type ID | `3` (EXAMEN FINAL) |

---

## 📌 Frontend Integration Checklist

- [ ] Store JWT in secure storage (HttpOnly cookie or memory)
- [ ] Attach `Authorization: Bearer <token>` to all authenticated requests
- [ ] Handle 401 → redirect to login / refresh token
- [ ] Cache catalog endpoints (roles, rooms, courses) on app load
- [ ] Handle 401 → auto logout + redirect to login
- [ ] Validate file upload (CSV/Excel) before sending
- [ ] Handle 422 validation errors (display field-level errors)
- [ ] Handle 401/403 → redirect to login / show permission error

---

## 📞 Support

For API issues, check:
1. Laravel logs: `storage/logs/laravel.log`
2. JWT token validity
3. Database migrations/seeds are current
4. `.env` has correct `JWT_SECRET`

---

*Generated from Exam Access Control API v1.0*