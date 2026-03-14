import { useState, useMemo } from 'react';
import { Users, Palette, Server, Building2 } from 'lucide-react';
import UserManagement from './UserManagement';
import AppearanceSettings from './AppearanceSettings';
import SystemSettings from './SystemSettings';
import CompanyProfiles from './CompanyProfiles';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'users' | 'company-profiles' | 'appearance' | 'system';

interface SettingsPageProps {
  onNavigateHome: () => void;
}

export default function SettingsPage({}: SettingsPageProps) {
  const { profile } = useAuth();
  const isMaster = profile?.role === 'master';
  const isAdmin = profile?.role === 'administrador';

  const defaultTab: SettingsTab = isMaster ? 'users' : isAdmin ? 'company-profiles' : 'appearance';
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  const tabs = useMemo(() => {
    const allTabs: Array<{ id: SettingsTab; label: string; icon: any; masterOnly?: boolean; adminOnly?: boolean }> = [
      { id: 'users' as SettingsTab, label: 'Usuários', icon: Users, masterOnly: true },
      { id: 'company-profiles' as SettingsTab, label: 'Perfis da Minha Empresa', icon: Building2, adminOnly: true },
      { id: 'appearance' as SettingsTab, label: 'Aparência', icon: Palette },
      { id: 'system' as SettingsTab, label: 'Sistema', icon: Server }
    ];

    return allTabs.filter(tab => {
      if (tab.masterOnly) return isMaster;
      if (tab.adminOnly) return isAdmin;
      return true;
    });
  }, [isMaster, isAdmin]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'users' && isMaster && <UserManagement />}
          {activeTab === 'company-profiles' && isAdmin && <CompanyProfiles />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'system' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}
