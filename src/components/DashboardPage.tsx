import { useState, useEffect } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Work } from '../types/work';
import { Contract } from '../types/contract';
import BudgetOverviewDashboard from './dashboards/BudgetOverviewDashboard';
import ContractsDashboard from './dashboards/ContractsDashboard';
import PurchasesDashboard from './dashboards/PurchasesDashboard';
import OverrunDashboard from './dashboards/OverrunDashboard';
import CashFlowDashboard from './dashboards/CashFlowDashboard';
import { generateDashboardPdf } from '../utils/dashboardPdfGenerator';

export default function DashboardPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>('30');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    loadWorks();
  }, []);

  useEffect(() => {
    if (selectedWorkId) {
      loadWorkData();
      loadContracts();
    }
  }, [selectedWorkId]);

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const loadWorkData = async () => {
    if (!selectedWorkId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('id', selectedWorkId)
        .maybeSingle();

      if (error) throw error;
      setSelectedWork(data);
    } catch (error) {
      console.error('Error loading work data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    if (!selectedWorkId) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .eq('work_id', selectedWorkId)
        .order('contract_number', { ascending: true });

      if (error) throw error;

      const contractsWithSupplierName = (data || []).map(contract => ({
        ...contract,
        total_value: Number(contract.total_value),
        supplier_name: contract.supplier?.name || 'Sem fornecedor'
      }));

      console.log('Loaded contracts:', contractsWithSupplierName);
      setContracts(contractsWithSupplierName);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  };

  const getDateRange = () => {
    if (periodFilter === 'custom') {
      return { start: customStartDate, end: customEndDate };
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(periodFilter));

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const handleGeneratePdf = async () => {
    if (!selectedWork) {
      alert('Selecione uma obra primeiro');
      return;
    }

    setGeneratingPdf(true);
    try {
      const dateRange = getDateRange();
      await generateDashboardPdf(selectedWork, dateRange, periodFilter);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Visão geral e análises da obra</p>
          </div>
        </div>

        {selectedWorkId && (
          <button
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Download className={`w-4 h-4 ${generatingPdf ? 'animate-pulse' : ''}`} />
            {generatingPdf ? 'Gerando PDF...' : 'Imprimir PDF'}
          </button>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Obra *
            </label>
            <select
              value={selectedWorkId}
              onChange={(e) => setSelectedWorkId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione uma obra...</option>
              {works.map((work) => (
                <option key={work.id} value={work.id}>
                  {work.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Período
            </label>
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              disabled={!selectedWorkId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>

          {periodFilter === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {!selectedWorkId ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecione uma obra para visualizar os dashboards
          </h3>
          <p className="text-sm text-gray-500">
            Os dashboards serão carregados automaticamente após a seleção
          </p>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-gray-500">Carregando dashboards...</div>
      ) : (
        <div className="space-y-6">
          <BudgetOverviewDashboard workId={selectedWorkId} />

          <ContractsDashboard workId={selectedWorkId} contracts={contracts} />

          <PurchasesDashboard workId={selectedWorkId} dateRange={getDateRange()} />

          <OverrunDashboard workId={selectedWorkId} />

          <CashFlowDashboard workId={selectedWorkId} />
        </div>
      )}
    </div>
  );
}
