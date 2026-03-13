import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasAccess, type PageKey } from '../../utils/accessControl';
import { ShieldX } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPage: PageKey;
  fallback?: ReactNode;
}

export default function ProtectedRoute({ children, requiredPage, fallback }: ProtectedRouteProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!hasAccess(profile?.role, requiredPage)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX size={32} className="text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar esta página.
          </p>
          <p className="text-sm text-gray-500">
            Seu perfil atual: <span className="font-semibold">{profile?.role || 'Desconhecido'}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
