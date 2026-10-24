// =================================================================
// CAPA: Domain / Entities
// Entidad PURA del dominio "Horario".
// Representa un bloque de tiempo disponible de un médico
// (fecha + hora + tipo de visita).
//
// La fecha se maneja como STRING "YYYY-MM-DD" para evitar el
// desfase de zona horaria (UTC) que ocurría con el tipo Date.
// =================================================================
export class Horario {
    constructor(
        public id_horario: number,
        public id_medico: number,
        public fecha: string,                         // formato 'YYYY-MM-DD'
        public hora: string,                          // formato 'HH:MM:SS'
        public tipo_visita: 'PRESENCIAL' | 'VIRTUAL',
        public disponible: boolean,
    ) {}

    /**
     * Método PROTOTYPE.
     * Devuelve una COPIA independiente de este Horario.
     * El nuevo objeto comparte los mismos valores pero NO la misma
     * referencia en memoria. Modificarlo no afecta al original.
     */
    clone(): Horario {
        return new Horario(
            0,                          // el clon siempre nace con id 0 (lo asigna MySQL)
            this.id_medico,
            this.fecha,                 // string: copia por valor, no necesita new Date
            this.hora,
            this.tipo_visita,
            this.disponible,
        );
    }
}