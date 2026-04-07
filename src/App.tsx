import { AuthProvider, useAuth } from './AuthContext';
import SentinelDashboard from './components/SentinelDashboard';
import AuthScreen from './components/AuthScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { user, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="antialiased">
      {user ? <SentinelDashboard /> : <AuthScreen />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
