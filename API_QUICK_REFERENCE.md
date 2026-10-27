# Quick Reference Card - Exam Access Control API

## 🚀 Quick Start
```bash
# 1. Login
POST /api/auth/login
{ "email": "...", "password": "..." }
→ Returns { token }

# 2. Use token in all requests
Authorization: Bearer <token>
```

---

## 📋 API Endpoints Quick Reference

### 🔐 Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Login, returns JWT |
| GET | `/api/auth/me` | ✅ | Current user profile |
| POST | `/api/auth/logout` | ✅ | Logout |

### 👥 Users
| Method | Endpoint | Auth | Body |
|--------|----------|------|------|
| POST | `/api/academic-users` | Admin | `{fullName, email, password, ci, roles[]}` |
| PUT | `/api/academic-users/me` | ✅ | `{fullName, email, newPassword?}` |
| PUT | `/api/academic-users/{userId}/roles` | Admin | `{roles: ["DOCENTE"]}` |
| GET | `/api/academic-staff` | ✅ | List all staff |

### 📚 Catalog (Select Options)
| Endpoint | Description |
|----------|-------------|
| `GET /api/catalog/roles` | ADMIN, DOCENTE, AUXILIAR, ESTUDIANTE |
| `GET /api/catalog/email-domains` | @umss.edu.bo, @fcyt.umss.edu.bo, @est.umss.edu.bo |
| `GET /api/catalog/exam-types` | PRIMER PARCIAL, EXAMEN FINAL, etc. |
| `GET /api/catalog/rooms` | Rooms with capacity |
| `GET /api/catalog/courses` | Materias (INF110, INF210, FIS100) |
| `GET /api/catalog/course-groups` | Course groups with teacher |
| `GET /api/catalog/exam-types` | PRIMER PARCIAL, EXAMEN FINAL, etc. |
| `GET /api/catalog/rooms` | Aula 691A (50), Aula 691B (80), Auditorio (200) |
| `GET /api/catalog/functions` | System permissions |
| `GET /api/catalog/enrollment-statuses` | HABILITADO, INHABILITADO |
| `GET /api/catalog/exam-student-statuses` | AUSENTE, PRESENTE, EXPULSADO, INGRESO EXCEPCIONAL |
| `GET /api/catalog/user-roles` | Alias for roles |
| `GET /api/catalog/email-domains` | Email domains |

### 📚 Course Groups
| Method | Endpoint | Params |
|--------|----------|--------|
| GET | `/api/catalog/course-groups?gestion=2/2026&sigla=INF110` | `gestion`, `sigla` (optional) |

### 📝 Exams
| Method | Endpoint | Body |
|--------|----------|------|
| GET | `/api/courses/{courseGroupId}/exams` | - |
| POST | `/api/courses/{courseGroupId}/exams` | `{examTypeId, date, startTime, rooms:[{roomId, students:[], auxiliarId?}], generalRules:[], studentRules:[{studentId, rule}]}` |

### 🏫 Rooms
| Method | Endpoint | Params |
|--------|----------|--------|
| GET | `/api/rooms/available?date=2026-10-15&startTime=08:00` | date, startTime |

### 📋 Processed Rosters
| Method | Endpoint |
|--------|----------|
| GET | `/api/processed-rosters` |
| GET | `/api/processed-rosters/{courseGroupId}` |

### 👨‍🎓 Student Status
| Method | Endpoint | Body |
|--------|----------|------|
| PUT | `/api/courses/{courseGroupId}/students/{userId}/status` | `{status: "HABILITADO\|INHABILITADO", reason?}` |

### 📥 Import Roster
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/student-roster/import` | `file` (multipart) |
| GET | `/api/student-roster/template` | - (downloads CSV) |

### 👨‍🏫 Teacher Courses
| Method | Endpoint |
|--------|----------|
| GET | `/api/teachers/{teacherId}/courses?gestion=2/2026` |

---

## 🔑 Auth Flow
```bash
# 1. Login
curl -X POST /api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana.morales@umss.edu.bo","password":"password123"}'

# 2. Use token
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/me
```

---

## 🔑 Key IDs Reference
| ID Type | Source | Example |
|---------|---------|---------|
| `courseGroupId` | `materia_grupo.id` | `1` |
| `userId` / `studentKey` | `usuario.id` | `7` |
| `studentKey` | `estudiante.codigo_sis` | `202600001` |
| `roomId` | `aula.id` | `1` |
| `examTypeId` | `tipo_examen.id` | `1` (PRIMER PARCIAL) |

---

## ⚠️ Common Errors
| Code | Message | Fix |
|------|---------|-----|
| 401 | "Unauthorized" / "Token not provided" | Add valid `Authorization: Bearer <token>` |
| 401 | "Token Signature could not be verified" | Token expired/invalid, re-login |
| 400 | "El motivo de inhabilitación es obligatorio" | Provide `reason` when status=INHABILITADO |
| 404 | "Usuario no encontrado" | User ID doesn't exist |
| 404 | "El estudiante no está inscrito" | Student not enrolled in course group |
| 422 | Validation errors | Check field formats |

---

*Base URL: `http://localhost:8000/api` • All endpoints require `Authorization: Bearer <token>` except `/auth/login`*