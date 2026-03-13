import { useState } from 'react';
import { Building2, Users, Shield, Bug } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import EmpresasManager from './EmpresasManager';
import DebugPanel from './DebugPanel';

type MasterTab = 'empresas' | 'usuarios' | 'perfis' | 'debug';

export default function MasterPanel() {
  const { profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<MasterTab>('empresas');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!profile || profile.role !== 'master') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md">
          <Shield size={48} className="mx-auto text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Acesso Restrito
          </h3>
          <p className="text-gray-500">
            Apenas usuários master podem acessar este painel.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Seu perfil atual: {profile?.role || 'Desconhecido'}
          </p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'debug' as MasterTab, label: 'Debug', icon: Bug },
    { id: 'empresas' as MasterTab, label: 'Empresas', icon: Building2 },
    { id: 'usuarios' as MasterTab, label: 'Usuários', icon: Users },
    { id: 'perfis' as MasterTab, label: 'Perfis', icon: Shield },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel de Usuários</h1>
            <p className="text-sm text-gray-500">Gerenciamento completo do sistema</p>
          </div>
          <div className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
            MASTER
          </div>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        {activeTab === 'debug' && <DebugPanel />}
        {activeTab === 'empresas' && (
          <div>
            <EmpresasManager />
          </div>
        )}
        {activeTab === 'usuarios' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Gerenciamento de Usuários
            </h3>
            <p className="text-gray-500">
              Em desenvolvimento - gerenciamento de usuários e administradores
            </p>
          </div>
        )}
        {activeTab === 'perfis' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Shield size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Gerenciamento de Perfis
            </h3>
            <p className="text-gray-500">
              Em desenvolvimento - visualização e gestão de perfis do sistema
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
