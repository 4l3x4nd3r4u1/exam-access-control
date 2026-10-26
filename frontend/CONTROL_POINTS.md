# Puntos de control: ingreso

Acceso: **Panel → Puntos de control → tocar materia → control de ingreso**.

La fila abre directamente el aula autorizada para el usuario. Si hay varias
aulas asignadas en el mismo examen, se muestra una fila por punto de control.
La lista conserva el diseño de materia, grupo, tipo y estado; el aula se
identifica en el encabezado del control y en la etiqueta accesible de la fila.
Los exámenes sin un aula autorizada se muestran deshabilitados.

La entrada permite a cualquier usuario autenticado consultar el listado, como
lo permite `GET /api/exams`. No se inventa un código de permiso ni se cambia
el catálogo de funciones del backend. Para abrir un aula se requiere
`can_interact: true` y que `assistant_id` coincida con el usuario de la sesión.
Si el backend rechaza una acción con 401 o 403, se bloquea el control y se
permite volver al listado para revisar la asignación.

## APIs

| Operación | Endpoint | Comportamiento |
| --- | --- | --- |
| Exámenes y aulas | `GET /api/exams` | Consulta, con autorización por aula. |
| Tipos de examen | `GET /api/catalog/exam-types` | Opciones del filtro Tipo, obtenidas del catálogo. |
| Gestión | `GET /api/course-groups` | Relaciona `course_group_id` con `academic_term`. Su fallo no bloquea el listado. |
| Coincidencias de estudiantes | `GET /api/courses/{courseGroupId}/students` | Inscritos de la materia; no presupone asignación al examen o aula. |
| Validar ingreso | `POST /api/exam-access/check` | Envía `identifier`, `exam_id` y `room_id`. Puede registrar asistencia. |
| Observación | `POST /api/exam-access/observations` | Envía `identifier`, `exam_id` y `observation`. |

Se reutilizan la URL y el token de sesión del cliente existente. La nueva capa
de servicio conserva la respuesta de estudiante no encontrado (404) sin
modificar el comportamiento de los servicios anteriores.

## Comportamiento

- Escribir o filtrar no registra ingresos. Seleccionar una coincidencia o
  confirmar un SIS/CI completo ejecuta la validación una vez.
- Los estudiantes se muestran al entrar, incluso con el buscador vacío.
  Escribir filtra el listado y Limpiar vuelve a mostrarlo.
- Se muestra `access.result`, no se interpreta `success: true` como autorización.
- La vista muestra hora de ingreso, aula asignada, norma particular e historial
  de expulsiones tal como los devuelve el backend.
- Las observaciones requieren un estudiante identificado y habilitado, en el
  aula seleccionada. En ingresos previamente registrados se comprueba además
  la habilitación académica del listado: un ingreso excepcional previo no
  habilita por sí mismo el registro de observaciones.
- La observación admite hasta 5000 caracteres. Se conserva el texto si falla
  el guardado y se evitan envíos simultáneos o repetidos del mismo texto.
- Los filtros combinan materia, tipo, estado y gestión. Los estados usan las
  fechas y horas del examen en Bolivia (UTC−04:00); se actualizan cada 30 segundos.
- Los filtros usan iconos y menús compactos. Se pueden abrir y recorrer con
  las flechas del teclado, elegir con Enter y cerrar con Escape.
- No se muestran cifras de ocupación/capacidad que no están en estas respuestas.
- La pestaña «Durante el examen» se muestra desactivada. El ingreso excepcional
  y el registro de expulsiones quedan fuera de estas seis tareas; el historial
  sí está incluido.

## Verificación

Desde `frontend`:

```powershell
npm run build
npm run lint
node --test tests/controlPoint.test.mjs tests/controlPointService.test.mjs
node --test tests/controlPoint.browser.test.mjs
```

La prueba de navegador usa Chrome instalado en Windows, sin interfaz. Se puede
indicar otra ubicación con `CHROME_PATH`; si no existe, esa prueba se omite.
Las APIs se simulan en el navegador y no se modifica la base de datos real.
Las capturas se guardan en `node_modules/.tmp/control-points-*.png`.

## Datos y configuración

Los exámenes, aulas, asignaciones, estudiantes, gestiones, tipos de examen,
resultados de acceso e historial se obtienen de las APIs. Las observaciones
se envían al backend para su persistencia. La cuenta se toma de la sesión.
El frontend no contiene los registros de los grupos de prueba ni sus SIS.

Los textos, iconos, abreviaturas y reglas para calcular el estado por horario
son parte de la interfaz. La URL local del servidor sigue definida en
`src/services/apiClient.ts`: `http://127.0.0.1:8000/api`. Los datos simulados
están en los archivos de prueba. Los casos del grupo 99 descritos abajo
fueron registrados en la base de datos local mediante las APIs.

## Prueba manual con la base local

Se prepararon estos registros mediante las APIs el 26 de octubre de 2026.
Los SIS siguientes identifican estudiantes existentes de la base local;
la aplicación continúa obteniendo todos sus datos del backend.

1. Abre `http://127.0.0.1:5173/` e inicia sesión con
   `superadmin@umss.edu.bo`, contraseña `password123`.
2. En el Panel, abre **Puntos de control** al final del menú.
3. Pulsa **Limpiar**, escribe **99** en el buscador de materias y selecciona
   **Primer Parcial** en Tipo.
4. Abre una fila **Física General · G99 · Primer Parcial**. El encabezado del
   control indica el aula. Para los casos siguientes usa **Aula 691B**; si
   entras a 691A, vuelve y abre la otra fila del mismo examen.
5. Usa **Limpiar** en el buscador de estudiantes entre los casos.

| Caso | SIS que debes buscar | Resultado esperado en Aula 691B |
| --- | --- | --- |
| Coincidencias | Escribe solo `209900` | Lista de inscritos con nombre, SIS y CI. Escribir no registra asistencia. |
| Primer ingreso | `209900001` | HABILITADO y hora registrada, en la primera validación. Muestra una norma particular de tiempo adicional. |
| Inhabilitado | `209900002` | INHABILITADO, con motivo académico de prueba. |
| Ingreso repetido | `209900003` | YA REGISTRÓ INGRESO. Se dejó registrado para este caso. |
| Historial | `209900004` | Muestra una expulsión de un examen anterior del grupo 99. Su primer ingreso en el parcial actual también se registra al validarlo. |
| Otra aula | `209900005` | AULA INCORRECTA; indica Aula 691A. |
| Fuera del examen | `209900008` | NO FIGURA EN EL EXAMEN. Está inscrito en la materia, pero no fue distribuido en este parcial. |
| SIS inexistente | `999999999` | ESTUDIANTE NO ENCONTRADO. Escríbelo completo y pulsa Validar SIS o CI. |

Para validar un SIS completo se puede pulsar **Validar SIS o CI** o Enter.
Para buscar por nombre, selecciona la coincidencia de la lista.
Después del primer ingreso, repetir la consulta muestra YA REGISTRÓ INGRESO:
ese cambio es el comportamiento previsto.

Para probar observaciones, valida `209900001` o `209900003`, escribe un texto
en **Información relativa** y pulsa **Registrar información relativa**.
El botón está deshabilitado con texto vacío o espacios. Tras guardarlo aparece
la confirmación; el mismo texto no se envía otra vez hasta que se modifica.

Los filtros pueden probarse con el parcial del grupo 99 del **26/10/2026,
09:00–10:30**, y su examen final del **25/10/2026, 09:00–10:30**. El estado
se calcula con el horario de Bolivia y cambia con el tiempo. El grupo 9
conserva su examen de prueba inicial.

Para comprobar falta de asignación, inicia otra sesión con la cuenta inicial
`juan.perez@umss.edu.bo`, contraseña `password123`: sin asignación en estos
exámenes, las filas no permiten abrir el control. Luego vuelve a entrar como
superadmin para continuar las pruebas.

El grupo 99 usa las inscripciones de prueba para sus estados; la habilitación
de los estudiantes en el grupo 9 se verificó sin cambios durante la preparación.
Estas pruebas cubren las seis tareas de selección, filtros, búsqueda, ingreso,
resultados e información relativa. «Durante el examen», el ingreso excepcional
y el botón para expulsar todavía no forman parte del frontend implementado.
