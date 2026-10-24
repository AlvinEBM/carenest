import 'reflect-metadata';
process.env.DOTENV_CONFIG_QUIET = 'true';
// Variables de entorno comunes a TODAS las pruebas.
// TZ fijo en Lima para que las pruebas de fechas sean deterministas.
process.env.TZ = 'America/Lima';
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'clave_de_pruebas_carenest_2026';
process.env.DB_NAME = process.env.DB_NAME_TEST || 'carenest_test';
process.env.LOGIN_MAX_INTENTOS = '1000';
process.env.FRONTEND_URL = 'http://localhost:5173';
delete process.env.FRONTEND_PUBLIC_URL;
delete process.env.BACKEND_PUBLIC_URL;
