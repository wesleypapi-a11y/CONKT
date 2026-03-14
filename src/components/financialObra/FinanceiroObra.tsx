import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, FileText, Receipt, CreditCard, FolderTree, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';
import { DocumentosFinanceiros } from './DocumentosFinanceiros';
import { MovimentosFinanceiros } from './MovimentosFinanceiros';
import { FluxoCaixaObra } from './FluxoCaixaObra';
import { NotasFiscais } from './NotasFiscais';
import { Faturamento } from './Faturamento';
import { ContasBancarias } from './ContasBancarias';
import { CentroCustos } from './CentroCustos';
import { PrevisaoFinanceira } from './PrevisaoFinanceira';
import { RelatoriosFinanceiros } from './RelatoriosFinanceiros';

type TabType = 'dashboard' | 'documentos' | 'movimentos' | 'fluxo' | 'notas' | 'faturamento' | 'contas' | 'centros' | 'previsao' | 'relatorios';

export function FinanceiroObra({ workId }: { workId?: string }) {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [works, setWorks] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState(workId || '');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { showAlert } = useAlert();

  useEffect(() => {
    if (!workId) loadWorks();
  }, []);

  useEffect(() => {
    const currentWorkId = workId || selectedWorkId;
    if (currentWorkId) {
      loadDashboard();
    }
  }, [selectedWorkId, workId]);

  const loadWorks = async () => {
    try {
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) return;

      const { data } = await supabase
        .from('works')
        .select('id, nome')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null);

      setWorks(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      const currentWorkId = workId || selectedWorkId;

      if (!empresaId || !currentWorkId) {
        setLoading(false);
        return;
      }

      const { data: documents } = await supabase
        .from('financial_documents')
        .select('*, financial_cost_centers(nome)')
        .eq('empresa_id', empresaId)
        .eq('work_id', currentWorkId)
        .is('deleted_at', null);

      const { data: movements } = await supabase
        .from('financial_movements')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('work_id', currentWorkId)
        .is('deleted_at', null);

      const { data: billings } = await supabase
        .from('financial_billings')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('work_id', currentWorkId)
        .is('deleted_at', null);

      const totalCustoPrevisto = documents
        ?.filter(d => d.tipo === 'Conta a Pagar')
        .reduce((sum, d) => sum + Number(d.valor), 0) || 0;

      const totalPago = documents
        ?.filter(d => d.tipo === 'Conta a Pagar')
        .reduce((sum, d) => sum + Number(d.valor_pago), 0) || 0;

      const aindaPagar = totalCustoPrevisto - totalPago;

      const totalReceitaPrevista = documents
        ?.filter(d => d.tipo === 'Conta a Receber')
        .reduce((sum, d) => sum + Number(d.valor), 0) || 0;

      const totalRecebido = documents
        ?.filter(d => d.tipo === 'Conta a Receber')
        .reduce((sum, d) => sum + Number(d.valor_pago), 0) || 0;

      const resultadoEstimado = totalRecebido - totalPago;

      const despesasPorCentro = new Map();
      documents
        ?.filter(d => d.tipo === 'Conta a Pagar')
        .forEach(doc => {
          const ccName = doc.financial_cost_centers?.nome || 'Sem Centro de Custo';
          const existing = despesasPorCentro.get(ccName) || 0;
          despesasPorCentro.set(ccName, existing + Number(doc.valor_pago));
        });

      const despesasPorCentroArray = Array.from(despesasPorCentro.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      setDashboardData({
        totalCustoPrevisto,
        totalPago,
        aindaPagar,
        totalRecebido,
        resultadoEstimado,
        despesasPorCentro: despesasPorCentroArray,
        totalDocumentos: documents?.length || 0,
        totalMovimentos: movements?.length || 0,
        totalFaturamentos: billings?.length || 0
      });
    } catch (error: any) {
      showAlert('Erro ao carregar dashboard financeiro', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'movimentos', label: 'Movimentos', icon: CreditCard },
    { id: 'fluxo', label: 'Fluxo de Caixa', icon: TrendingUp },
    { id: 'notas', label: 'Notas Fiscais', icon: Receipt },
    { id: 'faturamento', label: 'Faturamento', icon: DollarSign },
    { id: 'contas', label: 'Contas Bancárias', icon: CreditCard },
    { id: 'centros', label: 'Centro de Custos', icon: FolderTree },
    { id: 'previsao', label: 'Previsão', icon: Calendar },
    { id: 'relatorios', label: 'Relatórios', icon: FileText }
  ];

  const currentWorkId = workId || selectedWorkId;

  return (
    <div className="space-y-6">
      {!workId && (
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione uma Obra
          </label>
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma obra...</option>
            {works.map(work => (
              <option key={work.id} value={work.id}>{work.nome}</option>
            ))}
          </select>
        </div>
      )}

      {currentWorkId ? (
        <>
          <div className="border-b border-gray-200 overflow-x-auto">
            <div className="flex min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {loading ? (
                  <div className="text-center py-12 text-gray-500">
                    Carregando dashboard...
                  </div>
                ) : !dashboardData ? (
                  <div className="text-center py-12 text-gray-500">
                    <AlertCircle size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>Carregando dados financeiros...</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Indicadores Principais</h2>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={20} className="text-blue-600" />
                            <p className="text-sm text-gray-600">Custo Previsto</p>
                          </div>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(dashboardData.totalCustoPrevisto)}
                          </p>
                        </div>

                        <div className="bg-red-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingDown size={20} className="text-red-600" />
                            <p className="text-sm text-gray-600">Total Pago</p>
                          </div>
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(dashboardData.totalPago)}
                          </p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle size={20} className="text-orange-600" />
                            <p className="text-sm text-gray-600">Ainda a Pagar</p>
                          </div>
                          <p className="text-2xl font-bold text-orange-600">
                            {formatCurrency(dashboardData.aindaPagar)}
                          </p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={20} className="text-green-600" />
                            <p className="text-sm text-gray-600">Recebido do Cliente</p>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(dashboardData.totalRecebido)}
                          </p>
                        </div>

                        <div className={`p-4 rounded-lg ${dashboardData.resultadoEstimado >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <BarChart3 size={20} className={dashboardData.resultadoEstimado >= 0 ? 'text-blue-600' : 'text-red-600'} />
                            <p className="text-sm text-gray-600">Resultado Estimado</p>
                          </div>
                          <p className={`text-2xl font-bold ${dashboardData.resultadoEstimado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(dashboardData.resultadoEstimado)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Despesas por Centro de Custo</h3>
                        {dashboardData.despesasPorCentro.length > 0 ? (
                          <div className="space-y-3">
                            {dashboardData.despesasPorCentro.map((item: any, index: number) => {
                              const totalPago = dashboardData.totalPago;
                              const percentage = totalPago > 0 ? (item.valor / totalPago * 100) : 0;
                              return (
                                <div key={index} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700">{item.nome}</span>
                                    <span className="text-sm font-semibold text-gray-800">
                                      {formatCurrency(item.valor)} ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Nenhuma despesa registrada</p>
                        )}
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Visão Geral</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Documentos Cadastrados</span>
                            <span className="text-lg font-bold text-gray-800">{dashboardData.totalDocumentos}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Movimentos Registrados</span>
                            <span className="text-lg font-bold text-gray-800">{dashboardData.totalMovimentos}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <span className="text-sm text-gray-600">Faturamentos</span>
                            <span className="text-lg font-bold text-gray-800">{dashboardData.totalFaturamentos}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-blue-700 font-medium">% Executado</span>
                            <span className="text-lg font-bold text-blue-600">
                              {dashboardData.totalCustoPrevisto > 0
                                ? ((dashboardData.totalPago / dashboardData.totalCustoPrevisto) * 100).toFixed(1)
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'documentos' && <DocumentosFinanceiros workId={currentWorkId} />}
            {activeTab === 'movimentos' && <MovimentosFinanceiros workId={currentWorkId} />}
            {activeTab === 'fluxo' && <FluxoCaixaObra workId={currentWorkId} />}
            {activeTab === 'notas' && <NotasFiscais workId={currentWorkId} />}
            {activeTab === 'faturamento' && <Faturamento workId={currentWorkId} />}
            {activeTab === 'contas' && <ContasBancarias workId={currentWorkId} />}
            {activeTab === 'centros' && <CentroCustos />}
            {activeTab === 'previsao' && <PrevisaoFinanceira workId={currentWorkId} />}
            {activeTab === 'relatorios' && <RelatoriosFinanceiros workId={currentWorkId} />}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <AlertCircle size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Selecione uma Obra</h3>
          <p className="text-gray-600">Escolha uma obra acima para visualizar o módulo financeiro</p>
        </div>
      )}
    </div>
  );
}
