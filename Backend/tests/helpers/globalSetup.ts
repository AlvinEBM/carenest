// =================================================================
// Se ejecuta UNA vez antes de las pruebas de integración:
// recrea la BD "carenest_test" desde Database/BD_CareNest_v2.sql
// (mismo script de producción, cambiando solo el nombre).
// =================================================================
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

export default async function globalSetup() {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
    const nombreBD = process.env.DB_NAME_TEST || 'carenest_test';

    const sqlOriginal = fs.readFileSync(
        path.join(__dirname, '../../../Database/BD_CareNest_v2.sql'),
        'utf8',
    );
    const sql = sqlOriginal.replace(/citasmedicassangenaro/g, nombreBD);

    const conexion = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true,
        charset: 'utf8mb4',
    });
    await conexion.query(sql);
    await conexion.end();
}
