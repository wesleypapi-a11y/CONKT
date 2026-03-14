import { useState, useEffect } from 'react';
import { DollarSign, Building2, TrendingUp, Calendar, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { arcoColors } from '../../styles/colors';

interface EmpresaReceita {
  empresa_id: string;
  empresa_nome: string;
  plano: string;
  valor_mensal: number;
  status: string;
  data_inicio: string;
  data_fim: string | null;
  total_usuarios: number;
  usuarios_ativos: number;
}

export default function ReceitasView() {
  const [receitas, setReceitas] = useState<EmpresaReceita[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'ativo' | 'inativo'>('ativo');

  useEffect(() => {
    loadReceitas();
  }, []);

  const loadReceitas = async () => {
    setLoading(true);
    try {
      const { data: empresas, error } = await supabase
        .from('empresas')
        .select(`
          id,
          nome,
          status,
          data_inicio,
          data_fim
        `)
        .is('deleted_at', null)
        .order('nome');

      if (error) throw error;

      const receitasData: EmpresaReceita[] = [];

      for (const empresa of empresas || []) {
        const { count: totalUsuarios } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id);

        const { count: usuariosAtivos } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('empresa_id', empresa.id)
          .eq('is_active', true);

        receitasData.push({
          empresa_id: empresa.id,
          empresa_nome: empresa.nome,
          plano: 'Personalizado',
          valor_mensal: 0,
          status: empresa.status,
          data_inicio: empresa.data_inicio,
          data_fim: empresa.data_fim,
          total_usuarios: totalUsuarios || 0,
          usuarios_ativos: usuariosAtivos || 0,
        });
      }

      setReceitas(receitasData);
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    } finally {
      setLoading(false);
    }
  };

  const receitasFiltradas = receitas.filter(r => {
    if (filtroStatus === 'todas') return true;
    return r.status === filtroStatus;
  });

  const totalMensal = receitasFiltradas
    .filter(r => r.status === 'ativo')
    .reduce((sum, r) => sum + r.valor_mensal, 0);

  const totalAnual = totalMensal * 12;

  const exportarCSV = () => {
    const headers = ['Empresa', 'Plano', 'Valor Mensal', 'Status', 'Usuários Totais', 'Usuários Ativos', 'Data Início'];
    const rows = receitasFiltradas.map(r => [
      r.empresa_nome,
      r.plano,
      `R$ ${r.valor_mensal.toFixed(2)}`,
      r.status,
      r.total_usuarios.toString(),
      r.usuarios_ativos.toString(),
      new Date(r.data_inicio).toLocaleDateString('pt-BR'),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receitas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: arcoColors.primary.blue }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={32} className="opacity-80" />
            <TrendingUp size={24} className="opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">
            R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-green-100 text-sm">Receita Mensal</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar size={32} className="opacity-80" />
            <TrendingUp size={24} className="opacity-60" />
          </div>
          <div className="text-3xl font-bold mb-1">
            R$ {totalAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-blue-100 text-sm">Receita Anual (Projeção)</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Building2 size={32} className="opacity-80" />
          </div>
          <div className="text-3xl font-bold mb-1">
            {receitasFiltradas.filter(r => r.status === 'ativo').length}
          </div>
          <div className="text-purple-100 text-sm">Empresas Ativas</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Receitas por Empresa</h2>
            <div className="flex items-center gap-3">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="todas">Todas</option>
                <option value="ativo">Ativas</option>
                <option value="inativo">Inativas</option>
              </select>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: arcoColors.primary.blue }}
              >
                <Download size={16} />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Plano
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Valor Mensal
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Usuários
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Data Início
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {receitasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : (
                receitasFiltradas.map((receita) => (
                  <tr key={receita.empresa_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: arcoColors.primary.blue + '20' }}>
                          <Building2 size={20} style={{ color: arcoColors.primary.blue }} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{receita.empresa_nome}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {receita.plano}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-semibold text-lg" style={{ color: arcoColors.primary.blue }}>
                        R$ {receita.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500">
                        R$ {(receita.valor_mensal * 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {receita.status === 'ativo' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {receita.usuarios_ativos} / {receita.total_usuarios}
                      </div>
                      <div className="text-xs text-gray-500">ativos / total</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(receita.data_inicio).toLocaleDateString('pt-BR')}
                      </div>
                      {receita.data_fim && (
                        <div className="text-xs text-gray-500">
                          até {new Date(receita.data_fim).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {receitasFiltradas.length > 0 && (
              <tfoot className="bg-gray-50 font-semibold">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-left text-gray-900">
                    TOTAL ({receitasFiltradas.filter(r => r.status === 'ativo').length} empresas ativas)
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-lg font-bold" style={{ color: arcoColors.primary.blue }}>
                      R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-gray-500">
                      R$ {totalAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
                    </div>
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
