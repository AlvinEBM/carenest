export class User {
    constructor(
        public id_usuario: number,
        public correo: string | null,
        public contrasena: string | null,
        public rol: 'PACIENTE' | 'ADMIN' | 'ADMISION' | 'MEDICO' | 'FAMILIAR',

        // Datos personales
        public dni: string | null,
        public nombres: string | null,
        public apellidos: string | null,
        public telefono: string | null,
        public fecha_nacimiento: Date | null,
        public direccion: string | null,
        public genero: 'Masculino' | 'Femenino' | 'Otros' | null,

        // Estado de la cuenta
        public inasistencias: number,
        public cuenta_bloqueada: boolean,
        public intentos_fallidos: number,
        public activo: boolean,
        public fecha_registro: Date,

        // ----- Emparejamiento tutor-familiar (solo rol FAMILIAR) -----
        public id_tutor: number | null = null,
        public parentesco: string | null = null,
    ) {}
}