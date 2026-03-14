import { useState, useEffect } from 'react';
import { FileText, Download, Filter, Calendar, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

type ReportType = 'resumo' | 'centro_custos' | 'contas' | 'fluxo_caixa' | 'resultado';

export function RelatoriosFinanceiros({ workId }: { workId?: string }) {
  const [works, setWorks] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState(workId || '');
  const [selectedReport, setSelectedReport] = useState<ReportType>('resumo');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0]
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    if (!workId) loadWorks();
  }, []);

  useEffect(() => {
    if (selectedWorkId) {
      generateReport();
    }
  }, [selectedWorkId, selectedReport, dateRange]);

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

  const generateReport = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId || !selectedWorkId) {
        setLoading(false);
        return;
      }

      switch (selectedReport) {
        case 'resumo':
          await generateResumoFinanceiro(empresaId);
          break;
        case 'centro_custos':
          await generateDespesasPorCentroCusto(empresaId);
          break;
        case 'contas':
          await generateContasPagarReceber(empresaId);
          break;
        case 'fluxo_caixa':
          await generateFluxoCaixa(empresaId);
          break;
        case 'resultado':
          await generateResultadoFinanceiro(empresaId);
          break;
      }
    } catch (error: any) {
      showAlert('Erro ao gerar relatório', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateResumoFinanceiro = async (empresaId: string) => {
    const { data: documents } = await supabase
      .from('financial_documents')
      .select('*, financial_cost_centers(nome)')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .gte('data_vencimento', dateRange.start)
      .lte('data_vencimento', dateRange.end)
      .is('deleted_at', null);

    const { data: movements } = await supabase
      .from('financial_movements')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .gte('data_movimento', dateRange.start)
      .lte('data_movimento', dateRange.end)
      .is('deleted_at', null);

    const totalPrevisto = documents?.reduce((sum, d) => sum + Number(d.valor), 0) || 0;
    const totalPago = documents?.reduce((sum, d) => sum + Number(d.valor_pago), 0) || 0;
    const totalMovimentos = movements?.reduce((sum, m) => sum + Number(m.valor), 0) || 0;

    setReportData({
      tipo: 'resumo',
      totalPrevisto,
      totalPago,
      totalMovimentos,
      documentos: documents?.length || 0,
      movimentos: movements?.length || 0
    });
  };

  const generateDespesasPorCentroCusto = async (empresaId: string) => {
    const { data: documents } = await supabase
      .from('financial_documents')
      .select('valor, valor_pago, financial_cost_centers(id, nome)')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .gte('data_vencimento', dateRange.start)
      .lte('data_vencimento', dateRange.end)
      .eq('tipo', 'Conta a Pagar')
      .is('deleted_at', null);

    const centroCustosMap = new Map();

    documents?.forEach(doc => {
      const ccName = doc.financial_cost_centers?.nome || 'Sem Centro de Custo';
      const existing = centroCustosMap.get(ccName) || { previsto: 0, realizado: 0 };
      centroCustosMap.set(ccName, {
        previsto: existing.previsto + Number(doc.valor),
        realizado: existing.realizado + Number(doc.valor_pago)
      });
    });

    const despesas = Array.from(centroCustosMap.entries()).map(([nome, valores]) => ({
      nome,
      ...valores
    }));

    setReportData({
      tipo: 'centro_custos',
      despesas
    });
  };

  const generateContasPagarReceber = async (empresaId: string) => {
    const { data: contasPagar } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .eq('tipo', 'Conta a Pagar')
      .gte('data_vencimento', dateRange.start)
      .lte('data_vencimento', dateRange.end)
      .is('deleted_at', null)
      .order('data_vencimento');

    const { data: contasReceber } = await supabase
      .from('financial_documents')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .eq('tipo', 'Conta a Receber')
      .gte('data_vencimento', dateRange.start)
      .lte('data_vencimento', dateRange.end)
      .is('deleted_at', null)
      .order('data_vencimento');

    setReportData({
      tipo: 'contas',
      contasPagar: contasPagar || [],
      contasReceber: contasReceber || []
    });
  };

  const generateFluxoCaixa = async (empresaId: string) => {
    const { data: movements } = await supabase
      .from('financial_movements')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .gte('data_movimento', dateRange.start)
      .lte('data_movimento', dateRange.end)
      .is('deleted_at', null)
      .order('data_movimento');

    const monthlyFlow = new Map();

    movements?.forEach(mov => {
      const month = new Date(mov.data_movimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      const existing = monthlyFlow.get(month) || { entradas: 0, saidas: 0 };

      if (mov.tipo === 'entrada') {
        existing.entradas += Number(mov.valor);
      } else {
        existing.saidas += Number(mov.valor);
      }

      monthlyFlow.set(month, existing);
    });

    const fluxo = Array.from(monthlyFlow.entries()).map(([mes, valores]) => ({
      mes,
      ...valores,
      saldo: valores.entradas - valores.saidas
    }));

    setReportData({
      tipo: 'fluxo_caixa',
      fluxo
    });
  };

  const generateResultadoFinanceiro = async (empresaId: string) => {
    const { data: documents } = await supabase
      .from('financial_documents')
      .select('tipo, valor, valor_pago')
      .eq('empresa_id', empresaId)
      .eq('work_id', selectedWorkId)
      .gte('data_vencimento', dateRange.start)
      .lte('data_vencimento', dateRange.end)
      .is('deleted_at', null);

    const receitas = documents?.filter(d => d.tipo === 'Conta a Receber').reduce((sum, d) => sum + Number(d.valor_pago), 0) || 0;
    const despesas = documents?.filter(d => d.tipo === 'Conta a Pagar').reduce((sum, d) => sum + Number(d.valor_pago), 0) || 0;
    const resultado = receitas - despesas;

    const receitasPrevistas = documents?.filter(d => d.tipo === 'Conta a Receber').reduce((sum, d) => sum + Number(d.valor), 0) || 0;
    const despesasPrevistas = documents?.filter(d => d.tipo === 'Conta a Pagar').reduce((sum, d) => sum + Number(d.valor), 0) || 0;
    const resultadoPrevisto = receitasPrevistas - despesasPrevistas;

    setReportData({
      tipo: 'resultado',
      receitas,
      despesas,
      resultado,
      receitasPrevistas,
      despesasPrevistas,
      resultadoPrevisto
    });
  };

  const exportToPDF = () => {
    showAlert('Exportação para PDF em desenvolvimento', 'info');
  };

  const exportToExcel = () => {
    showAlert('Exportação para Excel em desenvolvimento', 'info');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const reportTypes = [
    { value: 'resumo', label: 'Resumo Financeiro' },
    { value: 'centro_custos', label: 'Despesas por Centro de Custo' },
    { value: 'contas', label: 'Contas a Pagar/Receber' },
    { value: 'fluxo_caixa', label: 'Fluxo de Caixa' },
    { value: 'resultado', label: 'Resultado Financeiro' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Relatórios Financeiros</h2>
        <p className="text-gray-600 mt-1">Relatórios financeiros automáticos da obra</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {!workId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obra
              </label>
              <select
                value={selectedWorkId}
                onChange={(e) => setSelectedWorkId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma obra...</option>
                {works.map(work => (
                  <option key={work.id} value={work.id}>{work.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Relatório
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={exportToPDF}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exportar PDF
          </button>
          <button
            onClick={exportToExcel}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exportar Excel
          </button>
        </div>

        {!selectedWorkId && !workId ? (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 text-gray-400" />
            <p>Selecione uma obra para gerar relatórios</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-gray-500">
            Gerando relatório...
          </div>
        ) : (
          <div className="space-y-6">
            {reportData?.tipo === 'resumo' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Resumo Financeiro da Obra</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Previsto</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.totalPrevisto)}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Pago</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totalPago)}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total de Movimentos</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.totalMovimentos)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Documentos Cadastrados</p>
                    <p className="text-2xl font-bold text-gray-800">{reportData.documentos}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Movimentos Registrados</p>
                    <p className="text-2xl font-bold text-gray-800">{reportData.movimentos}</p>
                  </div>
                </div>
              </div>
            )}

            {reportData?.tipo === 'centro_custos' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Despesas por Centro de Custo</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Centro de Custo</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Previsto</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Realizado</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Diferença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.despesas.map((despesa: any, index: number) => {
                        const diferenca = despesa.realizado - despesa.previsto;
                        return (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm text-gray-700">{despesa.nome}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(despesa.previsto)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(despesa.realizado)}</td>
                            <td className={`py-3 px-4 text-sm text-right font-semibold ${diferenca <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(diferenca))} {diferenca > 0 ? '↑' : '↓'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportData?.tipo === 'contas' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Contas a Pagar</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Vencimento</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Pago</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.contasPagar.map((conta: any) => (
                          <tr key={conta.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm text-gray-700">{conta.descricao}</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-700">{formatDate(conta.data_vencimento)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(conta.valor)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(conta.valor_pago)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                conta.status === 'pago' ? 'bg-green-100 text-green-800' :
                                conta.status === 'previsto' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {conta.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Contas a Receber</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Vencimento</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor</th>
                          <th className="text-right py-3 px-4 font-semibold text-gray-700">Recebido</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.contasReceber.map((conta: any) => (
                          <tr key={conta.id} className="border-b border-gray-100">
                            <td className="py-3 px-4 text-sm text-gray-700">{conta.descricao}</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-700">{formatDate(conta.data_vencimento)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(conta.valor)}</td>
                            <td className="py-3 px-4 text-sm text-right text-gray-700">{formatCurrency(conta.valor_pago)}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                conta.status === 'recebido' ? 'bg-green-100 text-green-800' :
                                conta.status === 'previsto' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {conta.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {reportData?.tipo === 'fluxo_caixa' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Fluxo de Caixa Mensal</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Mês</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Entradas</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Saídas</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.fluxo.map((item: any, index: number) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm font-semibold text-gray-700">{item.mes}</td>
                          <td className="py-3 px-4 text-sm text-right text-green-600">{formatCurrency(item.entradas)}</td>
                          <td className="py-3 px-4 text-sm text-right text-red-600">{formatCurrency(item.saidas)}</td>
                          <td className={`py-3 px-4 text-sm text-right font-bold ${
                            item.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(item.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportData?.tipo === 'resultado' && (
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4">Resultado Financeiro da Obra</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Realizado</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Receitas</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.receitas)}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Despesas</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.despesas)}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${reportData.resultado >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <p className="text-sm text-gray-600">Resultado</p>
                        <p className={`text-2xl font-bold ${reportData.resultado >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {formatCurrency(reportData.resultado)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Previsto</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Receitas Previstas</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.receitasPrevistas)}</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">Despesas Previstas</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.despesasPrevistas)}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${reportData.resultadoPrevisto >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                        <p className="text-sm text-gray-600">Resultado Previsto</p>
                        <p className={`text-2xl font-bold ${reportData.resultadoPrevisto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {formatCurrency(reportData.resultadoPrevisto)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
