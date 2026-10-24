// =================================================================
// CAPA: Domain / Entities
// Entidad PURA "Atencion": registro clínico que deja el médico
// al atender una cita (diagnóstico + indicaciones).
// =================================================================
export class Atencion {
    constructor(
        public id_atencion: number,
        public id_cita: number,
        public id_medico: number,
        public diagnostico: string,
        public indicaciones: string | null,
        public fecha_atencion: Date,
    ) {}
}
