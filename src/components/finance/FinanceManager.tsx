import { useState } from 'react';
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
import { conktColors } from '../../styles/colors';
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
  | 'contas_bancarias'
  | 'contas_gerenciais';

export default function FinanceManager() {
  const [activeTab, setActiveTab] = useState<FinanceTab>('documentos');

  const tabs = [
    { id: 'documentos' as FinanceTab, label: 'Documentos', icon: FileText },
    { id: 'movimentos' as FinanceTab, label: 'Movimentos', icon: TrendingUp },
    { id: 'fluxo_caixa' as FinanceTab, label: 'Fluxo de Caixa', icon: BarChart3 },
    { id: 'notas_fiscais' as FinanceTab, label: 'Notas Fiscais', icon: Receipt },
    { id: 'faturamento' as FinanceTab, label: 'Faturamento', icon: DollarSign },
    { id: 'contas_bancarias' as FinanceTab, label: 'Contas Bancárias', icon: CreditCard },
    { id: 'contas_gerenciais' as FinanceTab, label: 'Contas Gerenciais', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${conktColors.primary.blue}15` }}>
          <DollarSign className="w-8 h-8" style={{ color: conktColors.primary.blue }} />
        </div>
        <div>
          <h1 className="text-3xl font-bold" style={{ color: conktColors.primary.blue }}>
            Financeiro
          </h1>
          <p className="text-gray-600">Gestão financeira completa</p>
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
                          color: conktColors.primary.blue,
                          borderBottomColor: conktColors.primary.blue,
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
          {activeTab === 'documentos' && <FinancialDocumentsManager />}
          {activeTab === 'movimentos' && <FinancialMovementsManager />}
          {activeTab === 'fluxo_caixa' && <CashflowView />}
          {activeTab === 'notas_fiscais' && <InvoicesManager />}
          {activeTab === 'faturamento' && <BillingRulesManager />}
          {activeTab === 'contas_bancarias' && <BankAccountsManager />}
          {activeTab === 'contas_gerenciais' && <FinancialAccountsManager />}
        </div>
      </div>
    </div>
  );
}
