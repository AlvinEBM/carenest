# CareNest – Mejoras para Calidad y Pruebas de Software

Sistema de citas del Centro de Salud Materno Infantil San Genaro de Villa.

## Qué se agregó

| Mejora | Dónde |
|---|---|
| **Login y panel del médico** (agenda del día, registrar diagnóstico, historial del paciente) | `Backend/src/modules/medicos`, `Frontend/src/pages/medico/Agenda.tsx` |
| **El admin crea médicos con cuenta de acceso** (y "Crear acceso" para médicos antiguos) | `administracion` (backend) y `pages/admin/Especialidades.tsx` |
| **Pasarela de pagos Mercado Pago** (modo pruebas, sin costo) | `Backend/src/modules/pagos`, `Mis citas` y `pages/paciente/PagoResultado.tsx` |
| **Precio por especialidad** | `especialidades.precio` y el botón "Precio" en el panel del admin |
| **Pruebas automatizadas** (247: unitarias + integración, con 80% de cobertura en los módulos nuevos) | `Backend/tests` |
| **Seguridad OWASP**: helmet, límite de intentos de login, JWT sin clave por defecto, CORS restringido, firma de webhooks | `Backend/src/app.ts` y `shared/` |
| **Accesibilidad (Ley 29973 / WCAG)**: labels asociados, modales con `role="dialog"`, cierre con Esc, `aria-*` | `components/common/Input.tsx` y `Modal.tsx` |
| **Script de BD alineado con el código** | `Database/` |

### Errores corregidos durante la depuración

| # | Error | Causa | Corrección |
|---|---|---|---|
| 1 | Reservar una cita para un menor fallaba por la llave foránea | `citas.id_dependiente` apuntaba a la tabla `dependientes`, pero el código guarda el id de un usuario `FAMILIAR` | La FK ahora apunta a `usuarios` |
| 2 | Admisión veía las citas de **mañana** desde las 19:00 | Se usaba `new Date().toISOString()` (UTC) para obtener "hoy" | Se usa `hoyLocal()` en el backend y el frontend |
| 3 | Una cita CONFIRMADA o en RECORDATORIO aparecía como "RESERVADA" | `BadgeEstadoCita` no tenía esos estados | Se agregaron los dos estados |
| 4 | El filtro "Próximas" ocultaba las citas pagadas | Solo filtraba `RESERVADA` | Ahora incluye RESERVADA, CONFIRMADA y RECORDATORIO |
| 5 | El rol MEDICO volvía a `/login` | No tenía ruta propia | Ahora va a `/medico/agenda` (la ruta de cada rol está en un solo archivo, `rutasPorRol.ts`) |
| 6 | Cualquiera podía firmar tokens si faltaba `JWT_SECRET` | `process.env.JWT_SECRET \|\| 'secret'` | El sistema no arranca sin un secreto de al menos 16 caracteres |
| 7 | Un JSON mal formado o un body gigante respondía "error inesperado" | El manejador global no distinguía esos casos | Ahora responde 400 o 413 con un mensaje claro |
| 8 | `BDActualizado.sql` no coincidía con el código | Faltaban `correos_remitentes`, el rol FAMILIAR, `cancelaciones`, etc. | Se crearon `BD_CareNest_v2.sql` y una migración |

---

## 1. Base de datos

**Opción A: ya tienes la BD con datos.** Ejecuta en MySQL Workbench:

```
Database/migracion_v2_medicos_pagos.sql
```

- Es re-ejecutable: solo agrega lo que falta y no borra datos.
- Cambia la línea `USE citasmedicassangenaro;` si tu BD tiene otro nombre.
- Crea una cuenta para cada médico existente: **`medico<ID>@carenest.pe`** con la contraseña `admin123` (por ejemplo, `medico1@carenest.pe`). Al final muestra la lista.

**Opción B: instalación desde cero** (borra la BD y la vuelve a crear):

```
Database/BD_CareNest_v2.sql
```

Usuarios de prueba (contraseña `admin123` para todos):

| Rol | Correo |
|---|---|
| Admin | admin@carenest.pe |
| Admisión | admision@carenest.pe |
| Paciente | juan@gmail.com |
| Médico (Medicina General) | carlos.lopez@carenest.pe |
| Médico (Pediatría) | maria.gonzales@carenest.pe |
| Médico (Psicología) | lucia.ramirez@carenest.pe |

## 2. Backend

```bash
cd Backend
npm install
copy .env.example .env      # (Windows)  — luego edita DB_PASSWORD
npm run dev
```

> `JWT_SECRET` debe tener **mínimo 16 caracteres**; si no, el servidor no arranca (corrección de seguridad).

## 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

## 4. Mercado Pago (modo pruebas, sin costo)

En modo pruebas **no se mueve dinero real**: se usan cuentas y tarjetas ficticias.

1. Entra a <https://www.mercadopago.com.pe/developers> con tu cuenta de Mercado Pago y crea una **aplicación** (tipo *Checkout Pro* / pagos en línea).
2. En la aplicación, abre **Cuentas de prueba** y crea dos cuentas de Perú: un **vendedor** y un **comprador**.
3. Copia el **Access Token** de las credenciales de prueba del vendedor (empieza con `APP_USR-` o `TEST-`) y pégalo en `Backend/.env`:
   ```
   MP_ACCESS_TOKEN=APP_USR-xxxxxxxx...
   ```
4. Reinicia el backend. El botón **"Pagar S/ xx.xx"** aparecerá en *Mis citas*.
5. Al pagar, inicia sesión en Mercado Pago con la **cuenta comprador de prueba** (de preferencia en una ventana de incógnito) y usa una tarjeta de prueba:

| Tarjeta | Número | CVV | Vence |
|---|---|---|---|
| Mastercard | 5031 7557 3453 0604 | 123 | 11/30 |
| Visa | 4009 1753 3280 6176 | 123 | 11/30 |

**Nombre del titular**, que decide el resultado: `APRO` → aprobado · `OTHE` → rechazado · `CONT` → pendiente. Documento: `123456789`.

6. Vuelve a CareNest y pulsa **"Verificar pago"**. El backend consulta el pago directamente a Mercado Pago; si fue aprobado, la cita pasa a **CONFIRMADA**.

> **¿Por qué el botón "Verificar pago"?** Mercado Pago **no acepta `localhost`** en las URLs de retorno, así que en tu PC no puede redirigir solo de vuelta. Si publicas el sistema con una URL pública (por ejemplo con `ngrok`), configura `FRONTEND_PUBLIC_URL` y `BACKEND_PUBLIC_URL` en el `.env`. Así la redirección y el webhook (`/pagos/webhook`) funcionan solos.

**Seguridad del pago:**
- El monto se toma del precio de la especialidad en la BD, **nunca del navegador**.
- El backend no confía en el `status` que llega en la URL: vuelve a consultar el pago real.
- Si el monto pagado no coincide con el registrado, el pago queda `RECHAZADO (monto_inconsistente)`.
- Opcional: con `MP_WEBHOOK_SECRET` configurado, se valida la firma HMAC de cada notificación.

## 5. Pruebas automatizadas (Jest + Supertest)

```bash
cd Backend
npm run test:unit          # 196 pruebas unitarias (no necesitan MySQL)
npm run test:integracion   # 51 pruebas de integración (API + MySQL real)
npm test                   # todas (247)
npm run test:cobertura     # reporte HTML en Backend/coverage/index.html
```

- Las pruebas de integración crean y recrean la BD **`carenest_test`** a partir de `BD_CareNest_v2.sql`. Usan el usuario y la contraseña de MySQL del `.env`, así que **no tocan tu BD real**.
- Mercado Pago se simula en esas pruebas, así que no necesitan internet.
- Cada prueba tiene un ID (`CP-DNI-02`, `PI-PAG-06`…) que coincide con la matriz de casos de prueba en Excel.

| Archivo | Técnica del curso |
|---|---|
| `tests/unit/dtos.test.ts` | Clases de equivalencia y valores límite (DNI, colegiatura, contraseña, diagnóstico, precio) |
| `tests/unit/horario.config.test.ts` | Valores límite (ventana de 60 días, anticipación de 120 min) |
| `tests/unit/reglas-atencion.test.ts` | TDD (reglas escritas antes del código) |
| `tests/unit/*.service.test.ts` | Pruebas unitarias con dobles (mocks) |
| `tests/integracion/*.int.test.ts` | Pruebas de integración y de seguridad (OWASP) |

## 6. Endpoints nuevos

| Método | Ruta | Rol |
|---|---|---|
| GET | `/medico/perfil` | MEDICO |
| GET | `/medico/agenda?fecha=YYYY-MM-DD` | MEDICO |
| PUT | `/medico/citas/:id/atender` | MEDICO |
| GET | `/medico/pacientes/:id/historial` | MEDICO |
| POST | `/admin/medico` (ahora con correo, contraseña, DNI y colegiatura) | ADMIN |
| POST | `/admin/medico/:id/cuenta` | ADMIN |
| PUT | `/admin/especialidad/:id/precio` | ADMIN |
| GET | `/pagos/estado` | autenticado |
| POST | `/pagos/preferencia` | PACIENTE |
| POST | `/pagos/:id/verificar` | PACIENTE |
| GET | `/pagos/mis-pagos` | PACIENTE |
| GET | `/pagos` | ADMIN |
| POST | `/pagos/webhook` | Mercado Pago |
