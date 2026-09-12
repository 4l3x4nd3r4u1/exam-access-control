# Exam Access Control System

Sistema de Control de Ingreso a Examenes Masivos.

## Requisitos Previos

Tener instalado en el sistema:
- Node.js (v20+) y npm
- PHP (v8.2+) y Composer
- PostgreSQL

### Instalacion de herramientas:

- **Fedora:**
  ```bash
  sudo dnf install -y nodejs npm php php-cli php-pgsql php-mbstring php-xml php-curl php-zip composer
  ```

- **Ubuntu/Debian:**
  ```bash
  sudo apt update && sudo apt install -y nodejs npm php php-cli php-pgsql php-mbstring php-xml php-curl php-zip composer
  ```

- **Windows:**
  - Instalar Node.js desde https://nodejs.org/
  - Instalar Composer y PHP desde https://getcomposer.org/Composer-Setup.exe

- **macOS:**
  ```bash
  brew install node php composer
  ```

## 1. Clonar el repositorio

```bash
git clone https://github.com/4l3x4nd3r4u1/exam-access-control.git
cd exam-access-control
```

## 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

El frontend estara disponible en `http://localhost:5173`.

## 3. Backend (Laravel)

En otra terminal:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

El backend estara disponible en `http://localhost:8000`.

Para verificar que responde:
`http://localhost:8000/api/health`

## 4. Base de Datos (PostgreSQL)

Configurar las credenciales en `backend/.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=exam_access_control
DB_USERNAME=postgres
DB_PASSWORD=tu_password
```

Ejecutar migraciones cuando la base de datos este lista:

```bash
cd backend
php artisan migrate
```


