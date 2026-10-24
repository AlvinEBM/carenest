import { Transform } from 'class-transformer';
import {
    MinLength,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    IsIn,
    IsOptional,
} from 'class-validator';

import { MSG, REGEX_DNI, REGEX_SOLO_LETRAS, normalizarNombre, recortar } from '../../../../shared/validation/reglas';

export class CrearFamiliarDTO {
    @Transform(normalizarNombre)
    @IsNotEmpty({ message: 'Los nombres del familiar son obligatorios' })
    @IsString()
    @MinLength(2, { message: 'Los nombres deben tener al menos 2 letras' })
    @MaxLength(100)
    @Matches(REGEX_SOLO_LETRAS, { message: MSG.nombres })
    nombres!: string;

    @Transform(normalizarNombre)
    @IsNotEmpty({ message: 'Los apellidos del familiar son obligatorios' })
    @IsString()
    @MinLength(2, { message: 'Los apellidos deben tener al menos 2 letras' })
    @MaxLength(100)
    @Matches(REGEX_SOLO_LETRAS, { message: MSG.apellidos })
    apellidos!: string;

    @Transform(recortar)
    @IsNotEmpty({ message: 'El DNI del familiar es obligatorio' })
    @Matches(REGEX_DNI, { message: MSG.dni })
    dni!: string;

    @IsOptional()
    @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
    fecha_nacimiento?: string;

    @IsNotEmpty({ message: 'El parentesco es obligatorio' })
    @IsIn(['Padre', 'Madre', 'Hermano', 'Hermana', 'Tio', 'Tia', 'Abuelo', 'Abuela', 'Apoderado', 'Otro'], {
        message: 'Parentesco inválido',
    })
    parentesco!: string;
}