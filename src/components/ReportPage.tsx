import { useState, useEffect } from 'react';
import { BarChart3, FileText, Download, Calendar, CheckSquare, Camera, TrendingUp } from 'lucide-react';
import { conktColors } from '../styles/colors';
import { supabase } from '../lib/supabase';
import { generateConsolidatedReport } from '../utils/consolidatedReportGenerator';
import { Work } from '../types/work';

interface ReportModule {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
}

type ReportMode = 'client' | 'internal';

export default function ReportPage() {
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWork, setSelectedWork] = useState('');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportMode, setReportMode] = useState<ReportMode>('client');
  const [modules, setModules] = useState<ReportModule[]>([
    {
      id: 'dashboard',
      name: 'Dashboard Geral',
      description: 'Indicadores principais e resumo executivo',
      icon: BarChart3,
      enabled: true
    },
    {
      id: 'budget',
      name: 'Orçado vs Realizado',
      description: 'Comparativo detalhado entre valores orçados e realizados',
      icon: FileText,
      enabled: true
    },
    {
      id: 'payments',
      name: 'Pagamentos Realizados',
      description: 'Histórico completo de pagamentos no período',
      icon: CheckSquare,
      enabled: true
    },
    {
      id: 'diary',
      name: 'Diário de Obras',
      description: 'Registros diários de atividades e progresso',
      icon: Calendar,
      enabled: true
    },
    {
      id: 'photos',
      name: 'Fotos da Obra',
      description: 'Registro fotográfico do período selecionado',
      icon: Camera,
      enabled: false
    },
    {
      id: 'schedule',
      name: 'Cronograma',
      description: 'Status e progresso das atividades planejadas',
      icon: Calendar,
      enabled: false
    },
    {
      id: 'cashflow',
      name: 'Fluxo de Caixa',
      description: 'Análise financeira de receitas e despesas',
      icon: TrendingUp,
      enabled: false
    }
  ]);

  useEffect(() => {
    loadWorks();
    setDefaultDates();
  }, []);

  const setDefaultDates = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const toggleModule = (moduleId: string) => {
    setModules(prev =>
      prev.map(m => m.id === moduleId ? { ...m, enabled: !m.enabled } : m)
    );
  };

  const selectAll = () => {
    setModules(prev => prev.map(m => ({ ...m, enabled: true })));
  };

  const deselectAll = () => {
    setModules(prev => prev.map(m => ({ ...m, enabled: false })));
  };

  const handleGenerateReport = async () => {
    if (!selectedWork) {
      alert('Selecione uma obra para gerar o relatório');
      return;
    }

    const selectedModules = modules.filter(m => m.enabled);
    if (selectedModules.length === 0) {
      alert('Selecione pelo menos um módulo para incluir no relatório');
      return;
    }

    if (!startDate || !endDate) {
      alert('Defina o período do relatório');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('A data inicial não pode ser maior que a data final');
      return;
    }

    try {
      setLoading(true);
      await generateConsolidatedReport({
        workId: selectedWork,
        modules: selectedModules.map(m => m.id),
        startDate,
        endDate,
        mode: reportMode
      });
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      alert('Erro ao gerar relatório consolidado');
    } finally {
      setLoading(false);
    }
  };

  const selectedWork_ = works.find(w => w.id === selectedWork);
  const enabledCount = modules.filter(m => m.enabled).length;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: conktColors.primary.blue }}
          >
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerador de Relatórios</h1>
            <p className="text-sm text-gray-500">Crie relatórios consolidados customizados para enviar aos clientes</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-auto">
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">1. Selecione a Obra</h3>
                <select
                  value={selectedWork}
                  onChange={(e) => setSelectedWork(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                >
                  <option value="">Selecione uma obra...</option>
                  {works.map(work => (
                    <option key={work.id} value={work.id}>{work.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">2. Defina o Período</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Inicial
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Final
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  O período será usado para filtrar dados de diário de obras, pagamentos, fotos e fluxo de caixa
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">3. Modo do Relatório</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setReportMode('client')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      reportMode === 'client'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 mb-1">Modo Cliente</div>
                      <div className="text-sm text-gray-600">
                        Layout limpo e profissional, ideal para apresentação ao cliente
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setReportMode('internal')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      reportMode === 'internal'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 mb-1">Modo Interno</div>
                      <div className="text-sm text-gray-600">
                        Relatório completo com todos os detalhes técnicos e administrativos
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">4. Escolha os Módulos</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Selecionar Todos
                    </button>
                    <button
                      onClick={deselectAll}
                      className="text-xs px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Limpar Seleção
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <label
                        key={module.id}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          module.enabled
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={module.enabled}
                          onChange={() => toggleModule(module.id)}
                          className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-5 h-5 text-gray-600" />
                            <span className="font-semibold text-gray-900">{module.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{module.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Resumo do Relatório</h3>

                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Obra:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {selectedWork_ ? selectedWork_.name : 'Não selecionada'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-600">Período:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {startDate && endDate
                          ? `${new Date(startDate).toLocaleDateString('pt-BR')} até ${new Date(endDate).toLocaleDateString('pt-BR')}`
                          : 'Não definido'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-600">Modo:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {reportMode === 'client' ? 'Cliente (Limpo)' : 'Interno (Completo)'}
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-600">Módulos selecionados:</span>
                      <p className="font-semibold text-gray-900 mt-1">
                        {enabledCount} de {modules.length}
                      </p>
                      {enabledCount > 0 && (
                        <ul className="mt-2 space-y-1">
                          {modules.filter(m => m.enabled).map(m => (
                            <li key={m.id} className="text-xs text-gray-700">
                              • {m.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateReport}
                  disabled={loading || !selectedWork || enabledCount === 0}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: conktColors.primary.blue }}
                >
                  <Download className="w-5 h-5" />
                  {loading ? 'Gerando Relatório...' : 'GERAR RELATÓRIO'}
                </button>

                {(!selectedWork || enabledCount === 0) && (
                  <p className="text-xs text-center text-gray-500">
                    {!selectedWork
                      ? 'Selecione uma obra para continuar'
                      : 'Selecione pelo menos um módulo'}
                  </p>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-blue-800">
                    <strong>Dica:</strong> O relatório será gerado em um único arquivo PDF com capa, sumário e todas as seções selecionadas na ordem padrão.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
