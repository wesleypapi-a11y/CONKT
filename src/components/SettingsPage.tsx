import { useState, useMemo } from 'react';
import { Users, Palette, Server } from 'lucide-react';
import UserManagement from './UserManagement';
import AppearanceSettings from './AppearanceSettings';
import SystemSettings from './SystemSettings';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'users' | 'appearance' | 'system';

interface SettingsPageProps {
  onNavigateHome: () => void;
}

export default function SettingsPage({}: SettingsPageProps) {
  const { profile } = useAuth();
  const isMaster = profile?.email === 'wesley.papi@gmail.com';

  const defaultTab: SettingsTab = isMaster ? 'users' : 'appearance';
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab);

  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'users' as SettingsTab, label: 'Usuários', icon: Users, masterOnly: true },
      { id: 'appearance' as SettingsTab, label: 'Aparência', icon: Palette, masterOnly: false },
      { id: 'system' as SettingsTab, label: 'Sistema', icon: Server, masterOnly: false }
    ];

    return allTabs.filter(tab => !tab.masterOnly || isMaster);
  }, [isMaster]);

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
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'system' && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}
