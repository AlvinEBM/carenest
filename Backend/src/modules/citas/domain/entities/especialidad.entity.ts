// =================================================================
// CAPA: Domain / Entities
// Entidad PURA del dominio "Especialidad".
// Representa una especialidad médica del centro (Medicina General,
// Pediatría, Obstetricia, etc.).
// No conoce TypeORM ni HTTP.
// =================================================================
// =================================================================
// CAPA: Domain / Entities
// Entidad PURA del dominio "Especialidad".
// =================================================================
export class Especialidad {
    constructor(
        public id_especialidad: number,
        public nombre: string,
        public descripcion: string | null,
        public estado: 'ACTIVA' | 'INACTIVA',
        public requiere_datos_menor: boolean = false,
        public precio: number = 0,
    ) {}
}