import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, Calendar, FileText, BarChart3, DollarSign, Building2 } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import ClientBudgetView from './ClientBudgetView';
import ClientScheduleView from './ClientScheduleView';
import ClientDiaryView from './ClientDiaryView';
import ClientDashboardView from './ClientDashboardView';
import ClientCashflowView from './ClientCashflowView';

interface PortalAccess {
  id: string;
  client_id: string;
  work_id: string;
  access_email: string;
  is_active: boolean;
  modules_enabled: {
    budget: boolean;
    schedule: boolean;
    diary: boolean;
    dashboard: boolean;
    cashflow: boolean;
  };
}

interface Work {
  id: string;
  name: string;
  work_address: string;
  work_city: string;
  work_state: string;
  status: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ClientPortalViewProps {
  access: PortalAccess;
  onBack: () => void;
}

export default function ClientPortalView({ access, onBack }: ClientPortalViewProps) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [work, setWork] = useState<Work | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [access]);

  useEffect(() => {
    const enabledModules = Object.entries(access.modules_enabled)
      .filter(([_, enabled]) => enabled)
      .map(([module, _]) => module);

    if (enabledModules.length > 0 && !access.modules_enabled[activeTab as keyof typeof access.modules_enabled]) {
      setActiveTab(enabledModules[0]);
    }
  }, [access]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: workData, error: workError } = await supabase
        .from('works')
        .select('*')
        .eq('id', access.work_id)
        .maybeSingle();

      if (workError) throw workError;
      setWork(workData);

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('id', access.client_id)
        .maybeSingle();

      if (clientError) throw clientError;
      setClient(clientData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, enabled: access.modules_enabled.dashboard },
    { id: 'budget', name: 'Orçamento', icon: TrendingUp, enabled: access.modules_enabled.budget },
    { id: 'schedule', name: 'Cronograma', icon: Calendar, enabled: access.modules_enabled.schedule },
    { id: 'diary', name: 'Diário de Obras', icon: FileText, enabled: access.modules_enabled.diary },
    { id: 'cashflow', name: 'Fluxo de Caixa', icon: DollarSign, enabled: access.modules_enabled.cashflow }
  ].filter(tab => tab.enabled);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para Gerenciamento
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-8 h-8" style={{ color: arcoColors.primary.blue }} />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{work?.name}</h1>
                  <p className="text-sm text-gray-600">
                    {work?.work_city} - {work?.work_state}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Cliente</p>
              <p className="text-lg font-semibold text-gray-800">{client?.name}</p>
              <p className="text-xs text-gray-500">{client?.email}</p>
            </div>
          </div>
        </div>

        <div className="px-6">
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard' && access.modules_enabled.dashboard && (
          <ClientDashboardView workId={access.work_id} />
        )}
        {activeTab === 'budget' && access.modules_enabled.budget && (
          <ClientBudgetView workId={access.work_id} />
        )}
        {activeTab === 'schedule' && access.modules_enabled.schedule && (
          <ClientScheduleView workId={access.work_id} />
        )}
        {activeTab === 'diary' && access.modules_enabled.diary && (
          <ClientDiaryView workId={access.work_id} />
        )}
        {activeTab === 'cashflow' && access.modules_enabled.cashflow && (
          <ClientCashflowView workId={access.work_id} />
        )}
      </div>
    </div>
  );
}
