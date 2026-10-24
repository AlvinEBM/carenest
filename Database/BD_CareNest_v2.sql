-- =================================================================
-- CareNest - Sistema de Citas - Centro de Salud San Genaro
-- SCRIPT COMPLETO v2 (instalación desde cero)
--
-- Alineado con los models TypeORM del backend:
--   * usuarios con rol FAMILIAR (menores a cargo), id_tutor,
--     cancelaciones y fecha_bloqueo
--   * citas.id_dependiente → usuarios (antes apuntaba a la tabla
--     "dependientes", lo que rompía las reservas para menores)
--   * correos_remitentes (envío de notificaciones)
--   * NUEVO: medicos.id_usuario + colegiatura (login de médicos)
--   * NUEVO: especialidades.precio (monto de la consulta)
--   * NUEVO: pagos (Mercado Pago) y atenciones (registro del médico)
--
-- Si ya tienes la BD con datos, NO uses este script: usa
-- migracion_v2_medicos_pagos.sql
-- =================================================================
SET NAMES utf8mb4;
DROP DATABASE IF EXISTS citasmedicassangenaro;
CREATE DATABASE citasmedicassangenaro
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE citasmedicassangenaro;

-- =================================================================
-- 1) USUARIOS  (PACIENTE, ADMIN, ADMISION, MEDICO, FAMILIAR)
-- =================================================================
CREATE TABLE `usuarios` (
  `id_usuario`        int NOT NULL AUTO_INCREMENT,
  `correo`            varchar(100) DEFAULT NULL,          -- NULL para FAMILIAR (no inicia sesión)
  `contrasena`        varchar(255) DEFAULT NULL,          -- hash bcrypt
  `rol`               enum('PACIENTE','ADMIN','ADMISION','MEDICO','FAMILIAR') NOT NULL,
  `id_tutor`          int DEFAULT NULL,                   -- paciente responsable del FAMILIAR
  `dni`               varchar(8) DEFAULT NULL,
  `nombres`           varchar(100) DEFAULT NULL,
  `apellidos`         varchar(100) DEFAULT NULL,
  `telefono`          varchar(20) DEFAULT NULL,
  `fecha_nacimiento`  date DEFAULT NULL,
  `direccion`         varchar(200) DEFAULT NULL,
  `genero`            enum('Masculino','Femenino','Otros') DEFAULT NULL,
  `parentesco`        varchar(50) DEFAULT NULL,
  `inasistencias`     int NOT NULL DEFAULT 0,
  `cancelaciones`     int NOT NULL DEFAULT 0,
  `cuenta_bloqueada`  tinyint NOT NULL DEFAULT 0,
  `fecha_bloqueo`     date DEFAULT NULL,
  `intentos_fallidos` int NOT NULL DEFAULT 0,
  `activo`            tinyint NOT NULL DEFAULT 1,
  `fecha_registro`    datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuarios_correo` (`correo`),
  UNIQUE KEY `uk_usuarios_dni` (`dni`),
  KEY `idx_usuarios_tutor` (`id_tutor`),
  CONSTRAINT `fk_usuarios_tutor` FOREIGN KEY (`id_tutor`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 2) ESPECIALIDADES
-- =================================================================
CREATE TABLE `especialidades` (
  `id_especialidad`            int NOT NULL AUTO_INCREMENT,
  `nombre`                     varchar(100) NOT NULL,
  `descripcion`                text,
  `estado`                     enum('ACTIVA','INACTIVA') NOT NULL DEFAULT 'ACTIVA',
  `requiere_datos_menor`       tinyint NOT NULL DEFAULT 0,
  `precio`                     decimal(8,2) NOT NULL DEFAULT 30.00,
  `fecha_inhabilitacion`       date DEFAULT NULL,
  `fecha_habilitacion`         date DEFAULT NULL,
  `aviso_habilitacion_enviado` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_especialidad`),
  UNIQUE KEY `uk_especialidades_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 3) MEDICOS  (cada médico pertenece a una especialidad y puede
--             tener una cuenta de acceso con rol MEDICO)
-- =================================================================
CREATE TABLE `medicos` (
  `id_medico`                  int NOT NULL AUTO_INCREMENT,
  `nombres`                    varchar(100) NOT NULL,
  `apellidos`                  varchar(100) NOT NULL,
  `id_especialidad`            int NOT NULL,
  `id_usuario`                 int DEFAULT NULL,
  `colegiatura`                varchar(6) DEFAULT NULL,
  `estado`                     enum('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `fecha_inhabilitacion`       date DEFAULT NULL,
  `fecha_habilitacion`         date DEFAULT NULL,
  `aviso_habilitacion_enviado` tinyint NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_medico`),
  UNIQUE KEY `uk_medicos_usuario` (`id_usuario`),
  KEY `idx_medicos_especialidad` (`id_especialidad`),
  CONSTRAINT `fk_medicos_especialidad` FOREIGN KEY (`id_especialidad`)
    REFERENCES `especialidades` (`id_especialidad`),
  CONSTRAINT `fk_medicos_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 4) HORARIOS  (Enfoque A1: se crean al reservar)
-- =================================================================
CREATE TABLE `horarios` (
  `id_horario`  int NOT NULL AUTO_INCREMENT,
  `id_medico`   int NOT NULL,
  `fecha`       date NOT NULL,
  `hora`        time NOT NULL,
  `tipo_visita` enum('PRESENCIAL','VIRTUAL') NOT NULL DEFAULT 'PRESENCIAL',
  `disponible`  tinyint NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_horario`),
  UNIQUE KEY `uk_medico_fecha_hora` (`id_medico`,`fecha`,`hora`),
  CONSTRAINT `fk_horarios_medico` FOREIGN KEY (`id_medico`)
    REFERENCES `medicos` (`id_medico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 5) FECHAS BLOQUEADAS  (cancelaciones masivas / inhabilitaciones)
-- =================================================================
CREATE TABLE `fechas_bloqueadas` (
  `id_bloqueo`      int NOT NULL AUTO_INCREMENT,
  `fecha`           date NOT NULL,
  `id_especialidad` int DEFAULT NULL,
  `motivo`          varchar(200) DEFAULT NULL,
  `creado_por`      int NOT NULL,
  `fecha_registro`  datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_bloqueo`),
  KEY `idx_fb_especialidad` (`id_especialidad`),
  CONSTRAINT `fk_fb_especialidad` FOREIGN KEY (`id_especialidad`)
    REFERENCES `especialidades` (`id_especialidad`),
  CONSTRAINT `fk_fb_usuario` FOREIGN KEY (`creado_por`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 6) CITAS
--    id_dependiente → usuarios (rol FAMILIAR)
-- =================================================================
CREATE TABLE `citas` (
  `id_cita`        int NOT NULL AUTO_INCREMENT,
  `id_usuario`     int NOT NULL,
  `id_horario`     int NOT NULL,
  `id_dependiente` int DEFAULT NULL,
  `motivo`         text,
  `notas`          text,
  `estado`         enum('RESERVADA','CONFIRMADA','RECORDATORIO','COMPLETADA','CANCELADA','FALTA') NOT NULL DEFAULT 'RESERVADA',
  `fecha_registro` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_cita`),
  UNIQUE KEY `uk_citas_horario` (`id_horario`),
  KEY `idx_citas_usuario` (`id_usuario`),
  KEY `idx_citas_dependiente` (`id_dependiente`),
  CONSTRAINT `fk_citas_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_citas_horario` FOREIGN KEY (`id_horario`)
    REFERENCES `horarios` (`id_horario`),
  CONSTRAINT `fk_citas_dependiente` FOREIGN KEY (`id_dependiente`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 7) HISTORIAL DE ASISTENCIA
-- =================================================================
CREATE TABLE `historial_asistencia` (
  `id_historial`   int NOT NULL AUTO_INCREMENT,
  `id_cita`        int NOT NULL,
  `id_usuario`     int NOT NULL,
  `estado`         enum('COMPLETADA','FALTA') NOT NULL,
  `fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `idx_hist_cita` (`id_cita`),
  KEY `idx_hist_usuario` (`id_usuario`),
  CONSTRAINT `fk_hist_cita` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_hist_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 8) NOTIFICACIONES
-- =================================================================
CREATE TABLE `notificaciones` (
  `id_notificacion`  int NOT NULL AUTO_INCREMENT,
  `id_cita`          int DEFAULT NULL,
  `id_usuario`       int NOT NULL,
  `tipo`             enum('RECORDATORIO','CANCELACION','BLOQUEO_CUENTA') NOT NULL,
  `mensaje`          text NOT NULL,
  `enviado`          tinyint NOT NULL DEFAULT 0,
  `correo_enviado`   tinyint NOT NULL DEFAULT 0,
  `leida`            tinyint NOT NULL DEFAULT 0,
  `fecha_programada` datetime DEFAULT NULL,
  `fecha_envio`      datetime DEFAULT NULL,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notif_cita` (`id_cita`),
  KEY `idx_notif_usuario` (`id_usuario`),
  CONSTRAINT `fk_notif_cita` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 9) CONFIGURACION DEL SISTEMA
-- =================================================================
CREATE TABLE `configuracion_sistema` (
  `id_config`   int NOT NULL AUTO_INCREMENT,
  `clave`       varchar(100) NOT NULL,
  `valor`       varchar(255) NOT NULL,
  `descripcion` text,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `uk_config_clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 10) SESIONES
-- =================================================================
CREATE TABLE `sesiones` (
  `id_sesion`        int NOT NULL AUTO_INCREMENT,
  `id_usuario`       int NOT NULL,
  `token`            varchar(500) DEFAULT NULL,
  `fecha_inicio`     timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_sesion`),
  KEY `idx_sesiones_usuario` (`id_usuario`),
  CONSTRAINT `fk_sesiones_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 11) CORREOS REMITENTES  (cuentas SMTP con failover)
-- =================================================================
CREATE TABLE `correos_remitentes` (
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

-- =================================================================
-- 12) PAGOS  (NUEVO - Mercado Pago Checkout Pro)
--     external_reference enviado a Mercado Pago = id_pago
-- =================================================================
CREATE TABLE `pagos` (
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
  CONSTRAINT `fk_pagos_cita` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_pagos_usuario` FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_pagos_monto` CHECK (`monto` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =================================================================
-- 13) ATENCIONES  (NUEVO - registro clínico del médico)
-- =================================================================
CREATE TABLE `atenciones` (
  `id_atencion`    int NOT NULL AUTO_INCREMENT,
  `id_cita`        int NOT NULL,
  `id_medico`      int NOT NULL,
  `diagnostico`    text NOT NULL,
  `indicaciones`   text,
  `fecha_atencion` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id_atencion`),
  UNIQUE KEY `uk_atenciones_cita` (`id_cita`),
  KEY `idx_atenciones_medico` (`id_medico`),
  CONSTRAINT `fk_atenciones_cita` FOREIGN KEY (`id_cita`)
    REFERENCES `citas` (`id_cita`),
  CONSTRAINT `fk_atenciones_medico` FOREIGN KEY (`id_medico`)
    REFERENCES `medicos` (`id_medico`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- =================================================================
-- DATOS INICIALES (SEED)   — contraseña de TODOS: admin123
-- =================================================================
SET @hash = '$2b$10$.TAwn4G3R.fzAZachB9bqux7uL/h310urEuJngYs.pIzqLTQnLNMe';

INSERT INTO `usuarios`
  (correo, contrasena, rol, dni, nombres, apellidos, telefono, fecha_nacimiento, direccion, genero)
VALUES
('admin@carenest.pe',     @hash, 'ADMIN',    '00000001', 'Director', 'Principal',  '999999999', NULL,         NULL,                 NULL),
('admision@carenest.pe',  @hash, 'ADMISION', '00000002', 'Ana',      'Ventanilla', '988888888', NULL,         NULL,                 NULL),
('juan@gmail.com',        @hash, 'PACIENTE', '76543210', 'Juan',     'Perez',      '987654321', '2003-04-15', 'Av. Los Olivos 123', 'Masculino'),
-- Cuentas de los médicos (rol MEDICO)
('carlos.lopez@carenest.pe',   @hash, 'MEDICO', '40000001', 'Carlos', 'Lopez',     '977000001', NULL, NULL, 'Masculino'),
('maria.gonzales@carenest.pe', @hash, 'MEDICO', '40000002', 'Maria',  'Gonzales',  '977000002', NULL, NULL, 'Femenino'),
('lucia.ramirez@carenest.pe',  @hash, 'MEDICO', '40000003', 'Lucia',  'Ramirez',   '977000003', NULL, NULL, 'Femenino'),
('rosa.fernandez@carenest.pe', @hash, 'MEDICO', '40000004', 'Rosa',   'Fernandez', '977000004', NULL, NULL, 'Femenino'),
('pedro.sanchez@carenest.pe',  @hash, 'MEDICO', '40000005', 'Pedro',  'Sanchez',   '977000005', NULL, NULL, 'Masculino');

INSERT INTO `especialidades` (nombre, descripcion, estado, requiere_datos_menor, precio) VALUES
('Medicina General', 'Atención médica integral a los pacientes',          'ACTIVA', 0, 30.00),
('Pediatria',        'Atención integral a niños y adolescentes',          'ACTIVA', 1, 35.00),
('Psicologia',       'Evaluación, diagnóstico y orientación psicológica', 'ACTIVA', 0, 40.00),
('Obstetricia',      'Control prenatal y planificación familiar',         'ACTIVA', 0, 35.00),
('Enfermeria',       'Toma de signos vitales y triaje',                   'ACTIVA', 0, 15.00);

-- Médicos vinculados a sus cuentas (subconsulta por correo)
INSERT INTO `medicos` (nombres, apellidos, id_especialidad, id_usuario, colegiatura) VALUES
('Carlos', 'Lopez',     1, (SELECT id_usuario FROM usuarios WHERE correo = 'carlos.lopez@carenest.pe'),   '045123'),
('Maria',  'Gonzales',  2, (SELECT id_usuario FROM usuarios WHERE correo = 'maria.gonzales@carenest.pe'), '051234'),
('Lucia',  'Ramirez',   3, (SELECT id_usuario FROM usuarios WHERE correo = 'lucia.ramirez@carenest.pe'),  '012345'),
('Rosa',   'Fernandez', 4, (SELECT id_usuario FROM usuarios WHERE correo = 'rosa.fernandez@carenest.pe'), '023456'),
('Pedro',  'Sanchez',   5, (SELECT id_usuario FROM usuarios WHERE correo = 'pedro.sanchez@carenest.pe'),  '034567');

INSERT INTO `configuracion_sistema` (clave, valor, descripcion) VALUES
('limite_inasistencias',          '3',  'Número máximo de inasistencias antes del bloqueo automático'),
('dias_suspension',               '15', 'Días de suspensión al superar el límite de inasistencias'),
('limite_cancelaciones',          '3',  'Número máximo de cancelaciones de último momento antes de bloquear cuenta'),
('dias_suspension_cancelaciones', '15', 'Días de suspensión por exceder límite de cancelaciones');

-- =================================================================
-- FIN DEL SCRIPT
--
-- Usuarios de prueba (contraseña: admin123):
--   admin@carenest.pe            → ADMIN
--   admision@carenest.pe         → ADMISION
--   juan@gmail.com               → PACIENTE
--   carlos.lopez@carenest.pe     → MEDICO (Medicina General)
--   maria.gonzales@carenest.pe   → MEDICO (Pediatría)
--   lucia.ramirez@carenest.pe    → MEDICO (Psicología)
--   rosa.fernandez@carenest.pe   → MEDICO (Obstetricia)
--   pedro.sanchez@carenest.pe    → MEDICO (Enfermería)
-- =================================================================
