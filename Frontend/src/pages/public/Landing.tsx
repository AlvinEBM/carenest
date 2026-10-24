// =================================================================
// Landing page pública de "Centro Psicológico Felizmente".
// Ruta: "/". Presenta el centro y dirige a login o registro.
// =================================================================
import { Link } from 'react-router-dom';

// ----- Logo -----
const LogoFelizmente = ({ size = 40 }: { size?: number }) => (
    <div className="rounded-2xl bg-sky-main flex items-center justify-center shadow-cta" style={{ width: size, height: size }}>
        <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-8 9 8" />
            <path d="M5 10v10h14V10" />
            <path d="M12 14.5c-1-1.2-3-1-3 .6 0 1.3 1.6 2.4 3 3.4 1.4-1 3-2.1 3-3.4 0-1.6-2-1.8-3-.6z" fill="#fff" stroke="none" />
        </svg>
    </div>
);

const Estrella = () => (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="#F59E0B"><path d="M10 1l2.6 5.3 5.9.9-4.2 4.1 1 5.9L10 14.4 4.7 17.2l1-5.9L1.5 7.2l5.9-.9z" /></svg>
);

// ----- Ilustración cálida de bienestar (escena de terapia/calma) -----
const IlustracionBienestar = () => (
    <svg viewBox="0 0 520 420" className="w-full h-auto max-w-lg" role="img" aria-label="Ilustración de bienestar emocional">
        {/* Blob de fondo */}
        <path d="M120 60C200 20 340 20 410 90c60 60 70 160 20 230-50 70-190 90-290 60C60 350 10 250 30 170 45 120 70 85 120 60z" fill="#E0F2FE" />
        <path d="M150 90C215 60 320 65 375 120c50 50 55 135 15 195-45 65-160 75-245 45C25 330 40 235 65 180 90 130 105 110 150 90z" fill="#F0F9FF" opacity="0.7" />

        {/* Sol / luz cálida */}
        <circle cx="400" cy="110" r="34" fill="#FDE68A" />
        <circle cx="400" cy="110" r="34" fill="#FCD34D" opacity="0.5" />
        <g stroke="#FBBF24" strokeWidth="3" strokeLinecap="round">
            <line x1="400" y1="52" x2="400" y2="40" /><line x1="446" y1="64" x2="455" y2="55" />
            <line x1="458" y1="110" x2="470" y2="110" /><line x1="446" y1="156" x2="455" y2="165" />
        </g>

        {/* Planta izquierda (maceta) */}
        <rect x="60" y="300" width="46" height="52" rx="6" fill="#FDBA74" />
        <rect x="60" y="300" width="46" height="14" rx="4" fill="#FB923C" />
        <path d="M83 300c0-30-18-44-32-50 14 0 34 10 34 40z" fill="#34D399" />
        <path d="M83 300c0-34 16-52 34-58-12 4-30 18-30 46z" fill="#6EE7B7" />
        <path d="M83 300c0-22 2-40 2-40s2 18 2 40z" fill="#10B981" />

        {/* Persona sentada en actitud de calma sobre cojín */}
        {/* Cojín */}
        <ellipse cx="270" cy="350" rx="95" ry="26" fill="#93C5FD" />
        <ellipse cx="270" cy="345" rx="85" ry="22" fill="#BFDBFE" />
        {/* Cuerpo */}
        <path d="M230 350c-6-46 12-84 40-84s46 38 40 84z" fill="#0EA5E9" />
        {/* Brazos en meditación */}
        <path d="M232 320c-14 4-24 16-24 30 10 2 20-2 26-10z" fill="#0284C7" />
        <path d="M308 320c14 4 24 16 24 30-10 2-20-2-26-10z" fill="#0284C7" />
        {/* Cabeza */}
        <circle cx="270" cy="238" r="30" fill="#FBCFE8" />
        <path d="M240 234c0-22 14-36 30-36s30 14 30 36c-8-10-18-14-30-14s-22 4-30 14z" fill="#7C3AED" />
        {/* Cara serena */}
        <circle cx="260" cy="240" r="2.5" fill="#4C1D95" />
        <circle cx="280" cy="240" r="2.5" fill="#4C1D95" />
        <path d="M262 250c4 4 12 4 16 0" stroke="#4C1D95" strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Corazón flotante (bienestar) */}
        <path d="M150 170c-8-9-24-6-24 8 0 11 14 19 24 27 10-8 24-16 24-27 0-14-16-17-24-8z" fill="#F472B6" />
        {/* Ondas de calma */}
        <path d="M360 300c14-6 28-6 42 0" stroke="#38BDF8" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M366 316c10-4 20-4 30 0" stroke="#38BDF8" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.4" />

        {/* Estrellitas de destello */}
        <path d="M190 110l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="#FBBF24" />
        <path d="M330 180l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#38BDF8" />
    </svg>
);

export const Landing = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-soft via-blue-50 to-white">
            {/* ===================== BARRA SUPERIOR ===================== */}
            <header className="w-full">
                <div className="max-w-[1400px] mx-auto px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <LogoFelizmente size={48} />
                        <span className="text-2xl font-extrabold text-blue-deep">Felizmente</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/login" className="px-6 py-3 rounded-xl border border-slate-200 bg-white text-ink-soft font-bold text-sm hover:border-sky-main hover:text-sky-deep transition">
                            Iniciar Sesión
                        </Link>
                        <Link to="/registro" className="px-6 py-3 rounded-xl bg-sky-main text-white font-bold text-sm shadow-cta hover:bg-sky-deep transition">
                            Empieza Tu Camino
                        </Link>
                    </div>
                </div>
            </header>

            {/* ===================== HERO ===================== */}
            <main className="max-w-[1400px] mx-auto px-8 pt-10 pb-20">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Columna izquierda: ilustración + mensaje */}
                    <div>
                        <div className="flex justify-center lg:justify-start mb-8">
                            <IlustracionBienestar />
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold text-ink leading-[1.05]">
                            Prioriza tu Bienestar.<br />
                            <span className="text-sky-deep">Transforma tu Vida.</span>
                        </h1>
                        <p className="mt-7 text-xl text-mute leading-relaxed max-w-xl">
                            Terapia psicológica personalizada y accesible desde la{' '}
                            <span className="font-bold text-ink-soft">comodidad de tu hogar</span>. Conecta con profesionales
                            cualificados en un entorno seguro y privado.
                        </p>
                        <Link to="/registro" className="mt-9 inline-flex items-center justify-center w-full sm:w-auto px-12 py-5 rounded-2xl bg-sky-main text-white font-extrabold text-lg shadow-cta hover:bg-sky-deep transition">
                            Empieza Tu Primera Sesión
                        </Link>
                    </div>

                    {/* Columna derecha: tarjeta de bienvenida */}
                    <div className="flex justify-center lg:justify-end">
                        <div className="w-full max-w-md bg-white rounded-3xl shadow-card p-12 flex flex-col items-center text-center">
                            <LogoFelizmente size={72} />
                            <h2 className="mt-6 text-3xl font-extrabold text-blue-deep">Felizmente</h2>
                            <p className="text-mute">Tu bienestar, nuestra prioridad</p>
                            <div className="w-full border-t border-slate-100 my-8" />
                            <h3 className="text-2xl font-extrabold text-ink">Bienvenido</h3>
                            <p className="mt-2 text-mute">Da el primer paso hacia tu bienestar emocional.</p>
                            <Link to="/registro" className="mt-7 w-full px-6 py-4 rounded-xl bg-sky-main text-white font-bold text-lg shadow-cta hover:bg-sky-deep transition">
                                Crear cuenta gratis
                            </Link>
                            <Link to="/login" className="mt-3 w-full px-6 py-4 rounded-xl border border-slate-200 text-ink-soft font-bold hover:border-sky-main hover:text-sky-deep transition">
                                Ya tengo cuenta
                            </Link>
                            <p className="mt-7 text-xs text-mute-soft">Al continuar aceptas nuestro compromiso de confidencialidad y cuidado.</p>
                        </div>
                    </div>
                </div>

                {/* ===================== FEATURES (ancho completo) ===================== */}
                <div className="mt-24 grid md:grid-cols-3 gap-8">
                    <FeatureCard titulo="Seguridad y Privacidad" texto="Tus datos y tus sesiones protegidos en un entorno completamente confidencial." icon={<path d="M12 2l7 4v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z" />} />
                    <FeatureCard titulo="Especialistas Cualificados" texto="Psicólogos colegiados con amplia experiencia en distintas áreas del bienestar." icon={<><circle cx="12" cy="8" r="5" /><path d="M9 13l-1 8 4-2 4 2-1-8" /></>} />
                    <FeatureCard titulo="Sesiones Flexibles" texto="Agenda tus sesiones en el día y horario que mejor se adapte a tu rutina." icon={<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>} />
                </div>

                {/* ===================== TESTIMONIOS ===================== */}
                <div className="mt-10 grid md:grid-cols-3 gap-8">
                    <Testimonio texto="Increíble experiencia, me sentí escuchada desde el primer día." autor="María S." />
                    <Testimonio texto="Un espacio seguro y cálido que me ayudó muchísimo a mejorar." autor="Carlos R." />
                    <Testimonio texto="Profesionales excelentes y una plataforma muy fácil de usar." autor="Lucía P." />
                </div>
            </main>

            {/* ===================== FRANJA CTA (centrada) ===================== */}
            <section className="max-w-[1400px] mx-auto px-8 pb-20">
                <div className="bg-gradient-to-r from-sky-main to-sky-deep rounded-3xl px-8 py-14 flex flex-col items-center text-center gap-6 shadow-cta">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-white">Toma el Primer Paso Hoy</h2>
                    <p className="text-sky-soft text-lg max-w-2xl">Tu bienestar emocional merece atención. Empieza tu camino con nosotros de forma gratuita.</p>
                    <Link to="/registro" className="px-10 py-4 rounded-xl bg-white text-sky-deep font-extrabold text-lg hover:bg-sky-soft transition">
                        Regístrate Gratuitamente
                    </Link>
                </div>
            </section>

            {/* ===================== FOOTER ===================== */}
            <footer className="border-t border-slate-100 py-8 text-center">
                <p className="text-sm text-mute">© 2026 Felizmente · Centro Psicológico</p>
            </footer>
        </div>
    );
};

// -------- Subcomponentes --------
const FeatureCard = ({ titulo, texto, icon }: { titulo: string; texto: string; icon: React.ReactNode }) => (
    <div className="bg-white rounded-2xl shadow-card p-8 hover:shadow-card-hover transition">
        <div className="w-14 h-14 rounded-2xl bg-sky-soft flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#0369A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon}
            </svg>
        </div>
        <h4 className="font-extrabold text-ink text-lg">{titulo}</h4>
        <p className="mt-2 text-mute leading-relaxed">{texto}</p>
    </div>
);

const Testimonio = ({ texto, autor }: { texto: string; autor: string }) => (
    <div className="bg-white rounded-2xl shadow-card p-6">
        <div className="flex gap-1 mb-3"><Estrella /><Estrella /><Estrella /><Estrella /><Estrella /></div>
        <p className="text-ink-soft leading-relaxed">"{texto}"</p>
        <p className="mt-3 text-sm text-mute font-bold">— {autor}</p>
    </div>
);