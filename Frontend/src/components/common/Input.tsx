// =================================================================
// Input reutilizable con label y mensaje de error
// =================================================================
import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icono?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icono, className = '', id, ...props }, ref) => {
        // Accesibilidad (WCAG 1.3.1 / Ley 29973): el label queda asociado
        // al campo, así los lectores de pantalla lo anuncian.
        const idAuto = useId();
        const idCampo = id ?? idAuto;
        const idError = `${idCampo}-error`;
        const tieneError = !!error;
        const borderClass = tieneError ? 'border-danger' : 'border-gray-200 focus:border-sky-main';

        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={idCampo} className="block text-xs font-semibold text-ink-soft mb-2">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icono && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none">
                            {icono}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={idCampo}
                        aria-invalid={tieneError || undefined}
                        aria-describedby={tieneError ? idError : undefined}
                        className={`
                            w-full px-4 py-3 text-sm bg-white rounded-lg border outline-none transition-colors
                            ${icono ? 'pl-10' : ''}
                            ${borderClass}
                            placeholder:text-mute-soft
                            ${className}
                        `}
                        {...props}
                    />
                </div>
                {tieneError && (
                    <p id={idError} role="alert" className="mt-1.5 text-xs text-danger font-medium">{error}</p>
                )}
            </div>
        );
    },
);

Input.displayName = 'Input';