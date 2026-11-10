# Login con CI o correo

Rama de trabajo: `feature/login-ci-correo`, basada en `develop` (`c62a481`).

El inicio de sesión acepta **CI o correo + contraseña** usando el mismo usuario,
JWT, sesión, roles y permisos existentes. El formulario muestra un único campo
de texto y el backend consulta la columna correspondiente. No se agrega una
pantalla ni se cambia el registro, las materias, los exámenes o Puntos de control.

## Commits separados

1. `feat(auth): permitir inicio de sesion con CI o correo`: validación, controlador
   y búsqueda del usuario. Conserva el contrato anterior por correo.
2. `test(auth): cubrir acceso por CI y compatibilidad por correo`: pruebas de la
   API, formatos de CI, credenciales e identidad/permisos.
3. `feat(frontend): conectar login con CI o correo`: formulario, petición a la API,
   sesión existente y bloqueo de envíos duplicados.
4. `test(frontend): verificar login y documentar acceso por CI`: pruebas del
   servicio y del navegador, contrato y esta guía.

## Probar en el navegador

Abre **http://127.0.0.1:5173** y actualiza con **Ctrl + F5**. Si ya tienes una
sesión abierta, ciérrala primero para que aparezca el formulario.

Se comprobó esta cuenta existente en la base local, sin crear usuarios ni cambiar
sus datos:

| Dato | Valor |
| --- | --- |
| CI | `30000001` |
| Correo alternativo | `ana.morales@umss.edu.bo` |
| Contraseña de esta cuenta de ejemplo | `password123` |
| Identidad | Ana Morales, usuario interno `2` |

1. Escribe `30000001` en **CI o correo**, introduce la contraseña y pulsa
   **Empezar**. Debe aparecer el panel correspondiente a Ana.
2. Recarga la página: debe conservar la sesión y los permisos.
3. Cierra sesión y repite con `ana.morales@umss.edu.bo`. Debe abrir la misma cuenta.
4. Prueba el correo en mayúsculas o espacios al principio/final: el ingreso sigue
   funcionando.
5. Introduce una contraseña incorrecta: debe mostrar **Credenciales incorrectas**,
   permanecer en el login y permitir otro intento.
6. Deja vacío el identificador o escribe solo espacios: el botón queda
   desactivado. El CI nunca se convierte a número.

Los CI con letras, ceros iniciales o complemento se escriben **como están
registrados**. La columna `usuario.ci` ya existe y es única, pero puede estar
vacía; una cuenta sin CI puede seguir ingresando por correo.

Estas credenciales pertenecen a los datos iniciales ya presentes en esta
instalación. En otra base utiliza una cuenta existente y su contraseña real.

## Iniciar los servidores si están detenidos

En una terminal desde la raíz del proyecto:

```powershell
cd backend
php artisan serve --host=127.0.0.1 --port=8000
```

En otra terminal desde la raíz:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Este cambio no requiere migraciones ni volver a cargar los datos iniciales.

## Contrato de la API

`POST http://127.0.0.1:8000/api/auth/login`

```json
{
  "identifier": "30000001",
  "password": "password123"
}
```

`identifier` también acepta correo. No se modifica el formato de la respuesta:
`success`, `message` y `data` con `token`, `is_active`, `token_type` y `expires_in`.

Las peticiones anteriores con `email` + `password` continúan funcionando. Si se
envían `identifier` y `email` juntos, se rechaza la petición con HTTP 422 para
evitar una elección ambigua. Un número JSON se rechaza: el CI debe enviarse como
texto. Un identificador inexistente o una contraseña incorrecta responde HTTP 401.
Se mantiene el rechazo de usuarios inactivos.

## Pruebas automatizadas

Desde `backend`:

```powershell
$env:APP_ENV = 'testing'
$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = ':memory:'
php vendor/bin/phpunit
```

Las pruebas utilizan SQLite en memoria. No necesitan modificar la base local de
la aplicación. Resultado comprobado: **58 pruebas y 254 aserciones correctas**;
27 de esas pruebas cubren autenticación y compatibilidad.

Desde `frontend`:

```powershell
npm run build
npm run lint -- src/views/LoginView.tsx src/services/authService.ts tests/authService.test.mjs tests/login.browser.test.mjs
node --test tests/authService.test.mjs
node --test tests/login.browser.test.mjs
```

Build y lint de los archivos de la tarea correctos. Hay seis pruebas del servicio
y seis escenarios de navegador, más el contenedor del test de navegador. Se
comprueban el envío del identificador, ceros y letras, contraseña sin recortar,
errores, sesión persistida, permisos del panel y ausencia de envíos duplicados.

La prueba de navegador usa Chrome instalado y APIs simuladas; si no lo encuentra,
se marca omitida. Se puede configurar otra ruta mediante `CHROME_PATH`. No se
añaden dependencias. Las respuestas y los tokens ficticios solo existen en los
archivos de pruebas.

También se verificó la API real: CI `30000001` y correo
`ANA.MORALES@UMSS.EDU.BO` devolvieron tokens para el mismo usuario local `2`, y
`/api/auth/me` confirmó su CI y correo.

## Archivos incluidos en la tarea

- `backend/app/Http/Requests/LoginRequest.php`
- `backend/app/Http/Controllers/AuthController.php`
- `backend/app/Modules/CoreDataStorage.php` (solo `authenticate`)
- `backend/tests/Feature/LoginIdentifierTest.php`
- `frontend/src/views/LoginView.tsx`
- `frontend/src/services/authService.ts`
- `frontend/tests/authService.test.mjs`
- `frontend/tests/login.browser.test.mjs`
- `docs/api-frontend-backend.md` (solo la sección de login)
- `docs/login-ci-correo.md`

Los cambios locales previos de otros archivos se guardan y se recuperan aparte;
no forman parte de estos cuatro commits. Las modificaciones no crean cuentas ni
incluyen credenciales o respuestas de ejemplo en el login de producción.
