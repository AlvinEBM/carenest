// =================================================================
// Componente raíz de la app.
// Envuelve toda la app con el AuthProvider para que cualquier
// componente pueda acceder al estado de autenticación.
// =================================================================
import { AuthProvider } from './auth/AuthContext';
import { AppRouter } from './routes/AppRouter';
import { TamanoTexto } from './components/common/TamanoTexto';

function App() {
    return (
        <AuthProvider>
            <AppRouter />
            {/* Accesibilidad: botón «Aa» para agrandar el texto en todas las pantallas */}
            <TamanoTexto />
        </AuthProvider>
    );
}

export default App;