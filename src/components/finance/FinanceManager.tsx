import { useState, useEffect } from 'react';
import {
  DollarSign,
  Building2,
  FileText,
  TrendingUp,
  CreditCard,
  Receipt,
  BarChart3,
  Settings
} from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import type { Work } from '../../types/work';
import BankAccountsManager from './BankAccountsManager';
import FinancialAccountsManager from './FinancialAccountsManager';
import FinancialDocumentsManager from './FinancialDocumentsManager';
import InvoicesManager from './InvoicesManager';
import FinancialMovementsManager from './FinancialMovementsManager';
import CashflowView from './CashflowView';
import BillingRulesManager from './BillingRulesManager';

type FinanceTab =
  | 'documentos'
  | 'movimentos'
  | 'fluxo_caixa'
  | 'notas_fiscais'
  | 'faturamento'
  | 'contas_bancarias';

export default function FinanceManager() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('documentos');
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('todos');
  const [loadingWorks, setLoadingWorks] = useState(true);

  const tabs = [
    { id: 'documentos' as FinanceTab, label: 'Documentos', icon: FileText },
    { id: 'movimentos' as FinanceTab, label: 'Movimentos', icon: TrendingUp },
    { id: 'fluxo_caixa' as FinanceTab, label: 'Fluxo de Caixa', icon: BarChart3 },
    { id: 'notas_fiscais' as FinanceTab, label: 'Notas Fiscais', icon: Receipt },
    { id: 'faturamento' as FinanceTab, label: 'Faturamento', icon: DollarSign },
    { id: 'contas_bancarias' as FinanceTab, label: 'Contas Bancárias', icon: CreditCard },
  ];

  useEffect(() => {
    loadWorks();
  }, []);

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    } finally {
      setLoadingWorks(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg" style={{ backgroundColor: `${arcoColors.primary.gold}15` }}>
            <DollarSign className="w-8 h-8" style={{ color: arcoColors.primary.gold }} />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: arcoColors.text.primary }}>
              Financeiro
            </h1>
            <p className="text-gray-600">Gestão financeira completa</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-400" />
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            disabled={loadingWorks}
          >
            <option value="todos">Todas as Obras</option>
            {works.map(work => (
              <option key={work.id} value={work.id}>
                {work.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="border-b overflow-x-auto">
          <div className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-b-2'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={
                    activeTab === tab.id
                      ? {
                          color: arcoColors.primary.gold,
                          borderBottomColor: arcoColors.primary.gold,
                        }
                      : {}
                  }
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'documentos' && <FinancialDocumentsManager workId={selectedWorkId} />}
          {activeTab === 'movimentos' && <FinancialMovementsManager workId={selectedWorkId} />}
          {activeTab === 'fluxo_caixa' && <CashflowView workId={selectedWorkId} />}
          {activeTab === 'notas_fiscais' && <InvoicesManager workId={selectedWorkId} />}
          {activeTab === 'faturamento' && <BillingRulesManager workId={selectedWorkId} />}
          {activeTab === 'contas_bancarias' && <BankAccountsManager />}
        </div>
      </div>
    </div>
  );
}
