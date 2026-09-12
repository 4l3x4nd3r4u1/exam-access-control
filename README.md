# Sistema de Control de Ingreso a Exámenes Masivos (Exam Access Control)

Sistema informático para la gestión, validación y control del ingreso de estudiantes durante la realización de exámenes masivos universitarios.

---

## 🛠️ Requisitos Previos

Antes de comenzar, cada desarrollador debe tener instalado en su máquina:

* **Node.js** (v20 o superior) y **npm** (v10 o superior)
* **PHP** (v8.2 o superior) y **Composer** (v2 o superior)
* **Git**
* **PostgreSQL** (local, vía Docker o servicio en la nube como Neon/Supabase)

### Instalación de dependencias del sistema según tu S.O.:

* **Fedora / RHEL:**
  ```bash
  sudo dnf install -y nodejs npm php php-cli php-pgsql php-mbstring php-xml php-curl php-zip composer
  ```
* **Ubuntu / Debian:**
  ```bash
  sudo apt update && sudo apt install -y nodejs npm php php-cli php-pgsql php-mbstring php-xml php-curl php-zip composer
  ```
* **Windows:**
  * Descargar e instalar Node.js desde [nodejs.org](https://nodejs.org/).
  * Descargar e instalar Composer + PHP desde [getcomposer.org](https://getcomposer.org/Composer-Setup.exe).
* **macOS:**
  ```bash
  brew install node php composer
  ```

---

## 🚀 Instalación y Puesta en Marcha

Sigue estos pasos la primera vez que clones el repositorio:

### 1. Clonar el repositorio
```bash
git clone https://github.com/4l3x4nd3r4u1/exam-access-control.git
cd exam-access-control
```

---

### 2. Configurar el Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
> El frontend estará disponible en: **http://localhost:5173**

---

### 3. Configurar el Backend (Laravel API)
En una nueva terminal:
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```
> El backend estará disponible en: **http://localhost:8000**  
> Puedes probar la API en: **http://localhost:8000/api/health**

---

## 🗄️ Base de Datos (PostgreSQL)

En el archivo `backend/.env`, configura las credenciales de tu base de datos PostgreSQL:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=exam_access_control
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña
```

Para correr las migraciones:
```bash
cd backend
php artisan migrate
```

---

## 🌿 Flujo de Trabajo Git y Ramas (Obligatorio para el equipo)

El repositorio cuenta con un pipeline de **Integración Continua (CI/CD)** y ramas protegidas:

* **`main`**: Rama de despliegue oficial. Solo contiene versiones estables y verificadas para entrega.
* **`develop`**: Rama de integración continua donde se une el trabajo diario del sprint.

### Reglas:
1. 🚫 **Prohibido hacer push directo a `main` o `develop`.** La terminal rechazará el comando.
2. 🔄 **Todo cambio debe realizarse mediante una rama y un Pull Request (PR) hacia `develop`.**

### Pasos para desarrollar una nueva funcionalidad:

1. **Actualizar tu rama develop local:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Crear una rama con el identificador de la Historia de Usuario:**
   ```bash
   git checkout -b feature/HU-01-nombre-de-la-tarea
   ```

3. **Realizar los cambios, probarlos localmente y commitear:**
   ```bash
   git add .
   git commit -m "feat(HU-01): descripción clara del cambio"
   git push -u origin feature/HU-01-nombre-de-la-tarea
   ```

4. **Abrir Pull Request en GitHub:**
   * Abre el PR seleccionando como base la rama **`develop`**.
   * **GitHub Actions** ejecutará automáticamente la compilación de React y las pruebas de Laravel.
   * El administrador revisará y aprobará el PR para habilitar el botón de **Merge**.

---

## 📁 Estructura del Repositorio

```
exam-access-control/
├── .github/              # Pipelines de CI/CD (GitHub Actions) y CODEOWNERS
├── frontend/             # Módulo 6: Interfaz de usuario (React + Vite + TypeScript)
│   ├── src/              # Componentes, vistas y lógica del cliente
│   └── package.json      # Dependencias de Node.js
├── backend/              # Módulos 1-5: API REST y Lógica de Negocio (Laravel 12)
│   ├── app/
│   │   ├── Http/         # Controladores y Endpoints HTTP
│   │   ├── Models/       # Modelos Eloquent / Tablas de PostgreSQL
│   │   └── Modules/      # Clases y reglas de negocio del sistema
│   ├── routes/           # Definición de rutas API (api.php)
│   └── database/         # Migraciones y esquemas de base de datos
└── docs/                 # Documentación de ingeniería y especificaciones
```
