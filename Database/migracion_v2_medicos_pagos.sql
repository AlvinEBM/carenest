-- =================================================================
-- CareNest - MIGRACIÓN v2: Login de médicos + Pagos (Mercado Pago)
--
-- Úsalo sobre tu base de datos EXISTENTE (no borra datos).
-- Es RE-EJECUTABLE: cada cambio verifica primero si ya existe.
--
-- Qué hace:
--   1. Alinea la BD con el código actual (columnas que el backend
--      ya usa: rol FAMILIAR, id_tutor, cancelaciones, etc.)
--   2. medicos.id_usuario + colegiatura   → login de médicos
--   3. especialidades.precio              → monto de la consulta
--   4. Tablas pagos y atenciones
--   5. Crea una cuenta MEDICO para cada médico que no tenga una:
--        correo:     medico<ID>@carenest.pe   (ej. medico1@carenest.pe)
--        contraseña: admin123
--
-- ANTES DE EJECUTAR: cambia el nombre de la BD en la línea USE.
-- =================================================================
SET NAMES utf8mb4;
USE citasmedicassangenaro;

-- -----------------------------------------------------------------
-- Procedimientos auxiliares (se eliminan al final)
-- -----------------------------------------------------------------
DROP PROCEDURE IF EXISTS cn_add_col;
DROP PROCEDURE IF EXISTS cn_add_index;
DROP PROCEDURE IF EXISTS cn_drop_fk_to;
DROP PROCEDURE IF EXISTS cn_add_fk;

DELIMITER $$

CREATE PROCEDURE cn_add_col(IN p_tabla VARCHAR(64), IN p_col VARCHAR(64), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = p_tabla AND column_name = p_col) THEN
    SET @sql_txt = CONCAT('ALTER TABLE `', p_tabla, '` ADD COLUMN `', p_col, '` ', p_def);
    PREPARE st FROM @sql_txt; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

CREATE PROCEDURE cn_add_index(IN p_tabla VARCHAR(64), IN p_nombre VARCHAR(64), IN p_def TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                  WHERE table_schema = DATABASE() AND table_name = p_tabla AND index_name = p_nombre) THEN
    SET @sql_txt = CONCAT('ALTER TABLE `', p_tabla, '` ADD ', p_def);
    PREPARE st FROM @sql_txt; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

-- Elimina la FK de p_tabla.p_col si apunta a p_ref_tabla
CREATE PROCEDURE cn_drop_fk_to(IN p_tabla VARCHAR(64), IN p_col VARCHAR(64), IN p_ref_tabla VARCHAR(64))
BEGIN
  DECLARE v_fk VARCHAR(64) DEFAULT NULL;
  SELECT constraint_name INTO v_fk
    FROM information_schema.key_column_usage
   WHERE table_schema = DATABASE() AND table_name = p_tabla
     AND column_name = p_col AND referenced_table_name = p_ref_tabla
   LIMIT 1;
  IF v_fk IS NOT NULL THEN
    SET @sql_txt = CONCAT('ALTER TABLE `', p_tabla, '` DROP FOREIGN KEY `', v_fk, '`');
    PREPARE st FROM @sql_txt; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

-- Agrega una FK si la columna aún no referencia a esa tabla
CREATE PROCEDURE cn_add_fk(IN p_tabla VARCHAR(64), IN p_col VARCHAR(64),
                           IN p_ref_tabla VARCHAR(64), IN p_ref_col VARCHAR(64), IN p_nombre VARCHAR(64))
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage
                  WHERE table_schema = DATABASE() AND table_name = p_tabla
                    AND column_name = p_col AND referenced_table_name = p_ref_tabla) THEN
    SET @sql_txt = CONCAT('ALTER TABLE `', p_tabla, '` ADD CONSTRAINT `', p_nombre,
                          '` FOREIGN KEY (`', p_col, '`) REFERENCES `', p_ref_tabla, '` (`', p_ref_col, '`)');
    PREPARE st FROM @sql_txt; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END $$

DELIMITER ;

-- =================================================================
-- PARTE 1: ALINEAR CON EL CÓDIGO ACTUAL
-- =================================================================
-- usuarios: rol FAMILIAR, campos nullables para familiares
ALTER TABLE `usuarios`
  MODIFY `rol` enum('PACIENTE','ADMIN','ADMISION','MEDICO','FAMILIAR') NOT NULL,
  MODIFY `correo` varchar(100) DEFAULT NULL,
  MODIFY `contrasena` varchar(255) DEFAULT NULL;

CALL cn_add_col('usuarios', 'id_tutor',      'int DEFAULT NULL AFTER `rol`');
CALL cn_add_col('usuarios', 'parentesco',    'varchar(50) DEFAULT NULL');
CALL cn_add_col('usuarios', 'cancelaciones', 'int NOT NULL DEFAULT 0');
CALL cn_add_col('usuarios', 'fecha_bloqueo', 'date DEFAULT NULL');

-- especialidades
CALL cn_add_col('especialidades', 'requiere_datos_menor',       'tinyint NOT NULL DEFAULT 0');
CALL cn_add_col('especialidades', 'fecha_inhabilitacion',       'date DEFAULT NULL');
CALL cn_add_col('especialidades', 'fecha_habilitacion',         'date DEFAULT NULL');
CALL cn_add_col('especialidades', 'aviso_habilitacion_enviado', 'tinyint NOT NULL DEFAULT 0');

-- medicos
CALL cn_add_col('medicos', 'estado',                     "enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO'");
CALL cn_add_col('medicos', 'fecha_inhabilitacion',       'date DEFAULT NULL');
CALL cn_add_col('medicos', 'fecha_habilitacion',         'date DEFAULT NULL');
CALL cn_add_col('medicos', 'aviso_habilitacion_enviado', 'tinyint NOT NULL DEFAULT 0');

-- fechas_bloqueadas
CALL cn_add_col('fechas_bloqueadas', 'id_especialidad', 'int DEFAULT NULL');
CALL cn_add_col('fechas_bloqueadas', 'creado_por',      'int NOT NULL DEFAULT 0');
CALL cn_add_col('fechas_bloqueadas', 'fecha_registro',  'datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)');

-- notificaciones
CALL cn_add_col('notificaciones', 'correo_enviado', 'tinyint NOT NULL DEFAULT 0');

-- citas.id_dependiente debe apuntar a usuarios (rol FAMILIAR),
-- no a la tabla "dependientes" (el código guarda id_usuario del familiar)
CALL cn_drop_fk_to('citas', 'id_dependiente', 'dependientes');

-- correos_remitentes (envío de notificaciones con failover)
CREATE TABLE IF NOT EXISTS `correos_remitentes` (
  `id_remitente`     int NOT NULL AUTO_INCREMENT,
  `correo`           varchar(255) NOT NULL,
  `app_password`     varchar(255) NOT NULL,
  `nombre_remitente` varchar(255) DEFAULT NULL,
  `host`             varchar(255) DEFAULT NULL,
  `puerto`           int DEFAULT NULL,
  `activo`           tinyint NOT NULL DEFAULT 1,
  `prioridad`        int NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_remitente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Configuración de cancelaciones (si no existe)
INSERT IGNORE INTO `configuracion_sistema` (clave, valor, descripcion) VALUES
('limite_cancelaciones',          '3',  'Número máximo de cancelaciones de último momento antes de bloquear cuenta'),
('dias_suspension_cancelaciones', '15', 'Días de suspensión por exceder límite de cancelaciones');

-- =================================================================
-- PARTE 2: LOGIN DE MÉDICOS
-- =================================================================
CALL cn_add_col('medicos', 'id_usuario',  'int DEFAULT NULL AFTER `id_especialidad`');
CALL cn_add_col('medicos', 'colegiatura', 'varchar(6) DEFAULT NULL AFTER `id_usuario`');
CALL cn_add_index('medicos', 'uk_medicos_usuario', 'UNIQUE KEY `uk_medicos_usuario` (`id_usuario`)');
CALL cn_add_fk('medicos', 'id_usuario', 'usuarios', 'id_usuario', 'fk_medicos_usuario');

-- Crear cuenta MEDICO a cada médico que no tenga una
SET @hash = '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe';  -- admin123

INSERT INTO `usuarios` (correo, contrasena, rol, nombres, apellidos)
SELECT CONCAT('medico', m.id_medico, '@carenest.pe'), @hash, 'MEDICO', m.nombres, m.apellidos
  FROM `medicos` m
 WHERE m.id_usuario IS NULL
   AND NOT EXISTS (SELECT 1 FROM `usuarios` u
                    WHERE u.correo = CONCAT('medico', m.id_medico, '@carenest.pe'));

UPDATE `medicos` m
  JOIN `usuarios` u ON u.correo = CONCAT('medico', m.id_medico, '@carenest.pe')
   SET m.id_usuario = u.id_usuario
 WHERE m.id_usuario IS NULL;

-- =================================================================
-- PARTE 3: PRECIO POR ESPECIALIDAD
-- =================================================================
CALL cn_add_col('especialidades', 'precio', 'decimal(8,2) NOT NULL DEFAULT 30.00');

-- =================================================================
-- PARTE 4: TABLAS NUEVAS
-- =================================================================
CREATE TABLE IF NOT EXISTS `pagos` (
  `id_pago`             int NOT NULL AUTO_INCREMENT,
  `id_cita`             int NOT NULL,
  `id_usuario`          int NOT NULL,
  `monto`               decimal(8,2) NOT NULL,
  `moneda`              varchar(3) NOT NULL DEFAULT 'PEN',
  `estado`              enum('PENDIENTE','APROBADO','RECHAZADO','CANCELADO','REEMBOLSADO') NOT NULL DEFAULT 'PENDIENTE',
  `preference_id`       varchar(100) DEFAULT NULL,
  `payment_id`          varchar(50) DEFAULT NULL,
  `metodo`              varchar(50) DEFAULT NULL,
  `detalle_estado`      varchar(100) DEFAULT NULL,
  `fecha_creacion`      datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fecha_actualizacion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_pago`),
  UNIQUE KEY `uk_pagos_payment` (`payment_id`),
  KEY `idx_pagos_cita` (`id_cita`),
  KEY `idx_pagos_usuario` (`id_usuario`),
  CONSTRAINT `fk_pagos_cita` FOREIGN KEY (`id_cita`) REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_pagos_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_pagos_monto` CHECK (`monto` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `atenciones` (
  `id_atencion`    int NOT NULL AUTO_INCREMENT,
  `id_cita`        int NOT NULL,
  `id_medico`      int NOT NULL,
  `diagnostico`    text NOT NULL,
  `indicaciones`   text,
  `fecha_atencion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_atencion`),
  UNIQUE KEY `uk_atenciones_cita` (`id_cita`),
  KEY `idx_atenciones_medico` (`id_medico`),
  CONSTRAINT `fk_atenciones_cita` FOREIGN KEY (`id_cita`) REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_atenciones_medico` FOREIGN KEY (`id_medico`) REFERENCES `medicos` (`id_medico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------------------------------------------------
-- Limpieza de procedimientos auxiliares
-- -----------------------------------------------------------------
DROP PROCEDURE IF EXISTS cn_add_col;
DROP PROCEDURE IF EXISTS cn_add_index;
DROP PROCEDURE IF EXISTS cn_drop_fk_to;
DROP PROCEDURE IF EXISTS cn_add_fk;

-- Verificación rápida: médicos y sus cuentas
SELECT m.id_medico, m.nombres, m.apellidos, u.correo AS cuenta_medico
  FROM medicos m LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
 ORDER BY m.id_medico;
