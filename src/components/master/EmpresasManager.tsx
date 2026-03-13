import { useState, useEffect } from 'react';
import { Building2, Plus, CreditCard as Edit, Trash2, Search, Check, X, AlertCircle, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { Empresa } from '../../types/empresa';
import ConfirmModal from '../common/ConfirmModal';

function EmpresasManagerContent() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showAlert } = useAlert();

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    data_inicio_vigencia: new Date().toISOString().split('T')[0],
    data_fim_vigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'ativa' as 'ativa' | 'inativa' | 'bloqueada',
  });

  useEffect(() => {
    loadEmpresas();
  }, []);

  const loadEmpresas = async () => {
    try {
      setError(null);
      setLoading(true);

      console.log('=== CARREGANDO EMPRESAS ===');

      const { data, error, count } = await supabase
        .from('empresas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('Resposta do Supabase:');
      console.log('- Error:', error);
      console.log('- Count:', count);
      console.log('- Data length:', data?.length);
      console.log('- Data:', data);

      if (error) {
        console.error('ERRO ao carregar empresas:', error);
        throw error;
      }

      if (data) {
        console.log('=== EMPRESAS CARREGADAS ===');
        data.forEach((emp, idx) => {
          console.log(`${idx + 1}. ${emp.nome_fantasia || 'SEM NOME'} | CNPJ: ${emp.cnpj || 'SEM CNPJ'} | Status: ${emp.status}`);
        });
      }

      setEmpresas(data || []);
      console.log('=== FIM CARREGAMENTO ===');
    } catch (error: any) {
      const errorMsg = error.message || 'Erro ao carregar empresas';
      setError(errorMsg);
      console.error('Error in loadEmpresas:', error);
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLegacyEmpresas = async () => {
    try {
      console.log('=== DELETANDO EMPRESAS LEGADAS ===');

      const { data: legacyEmpresas } = await supabase
        .from('empresas')
        .select('id, nome_fantasia')
        .in('nome_fantasia', ['OMEGA', 'BETA', 'ALPHA', 'CONKT']);

      console.log('Empresas a deletar:', legacyEmpresas);

      if (!legacyEmpresas || legacyEmpresas.length === 0) {
        showAlert('Nenhuma empresa legada encontrada', 'info');
        return;
      }

      for (const empresa of legacyEmpresas) {
        console.log(`Deletando empresa: ${empresa.nome_fantasia} (${empresa.id})`);

        await supabase
          .from('profiles')
          .update({ empresa_id: null })
          .eq('empresa_id', empresa.id);

        const { error } = await supabase
          .from('empresas')
          .delete()
          .eq('id', empresa.id);

        if (error) {
          console.error(`Erro ao deletar ${empresa.nome_fantasia}:`, error);
          throw error;
        }
      }

      showAlert('Empresas legadas deletadas com sucesso!', 'success');
      await loadEmpresas();

    } catch (error: any) {
      console.error('Erro ao deletar empresas legadas:', error);
      showAlert(`Erro: ${error.message}`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== INICIANDO CADASTRO DE EMPRESA ===');
    console.log('Dados do formulário:', formData);

    if (!formData.razao_social || !formData.nome_fantasia || !formData.cnpj) {
      console.log('Validação falhou - campos obrigatórios vazios');
      showAlert('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    console.log('Validação OK - todos os campos obrigatórios preenchidos');

    try {
      // Verificar usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Usuário logado:', user?.email, 'ID:', user?.id);

      // Verificar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('Perfil do usuário:', profile);

      const dbData = {
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia,
        cnpj: formData.cnpj,
        telefone: formData.telefone,
        email: formData.email,
        data_inicio_vigencia: formData.data_inicio_vigencia,
        data_fim_vigencia: formData.data_fim_vigencia,
        status: formData.status,
      };

      if (editingEmpresa) {
        console.log('Modo EDIÇÃO - atualizando empresa:', editingEmpresa.id);
        const { error } = await supabase
          .from('empresas')
          .update(dbData)
          .eq('id', editingEmpresa.id);

        if (error) {
          console.error('Erro ao atualizar empresa:', error);
          console.error('Detalhes do erro:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Empresa atualizada com sucesso!');
        showAlert('Empresa atualizada com sucesso!', 'success');
      } else {
        console.log('Modo CADASTRO - inserindo nova empresa');
        console.log('Tentando inserir:', dbData);

        const { data, error } = await supabase
          .from('empresas')
          .insert([dbData])
          .select();

        if (error) {
          console.error('ERRO AO INSERIR EMPRESA:', error);
          console.error('Detalhes completos do erro:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        console.log('Empresa cadastrada com sucesso! Dados retornados:', data);
        showAlert('Empresa cadastrada com sucesso!', 'success');
      }

      console.log('Fechando modal e recarregando lista...');
      setShowModal(false);
      setEditingEmpresa(null);
      resetForm();
      await loadEmpresas();
      console.log('=== CADASTRO FINALIZADO COM SUCESSO ===');
    } catch (error: any) {
      console.error('=== ERRO NO CADASTRO ===');
      console.error('Tipo do erro:', typeof error);
      console.error('Erro completo:', error);
      console.error('Error.message:', error.message);
      console.error('Error.details:', error.details);
      console.error('Error.hint:', error.hint);
      console.error('Error.code:', error.code);

      const errorMsg = error.message || 'Erro ao salvar empresa';
      showAlert(`Erro: ${errorMsg}`, 'error');
      console.error('=== FIM DO ERRO ===');
    }
  };

  const handleEdit = (empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormData({
      razao_social: empresa.razao_social || empresa.nome || '',
      nome_fantasia: empresa.nome_fantasia || empresa.nome || '',
      cnpj: empresa.cnpj,
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      data_inicio_vigencia: empresa.data_inicio_vigencia || empresa.data_inicio || '',
      data_fim_vigencia: empresa.data_fim_vigencia || empresa.data_fim || '',
      status: empresa.status as any,
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (empresa: Empresa) => {
    try {
      const newStatus = empresa.status === 'ativa' ? 'inativa' : 'ativa';

      const { error } = await supabase
        .from('empresas')
        .update({ status: newStatus })
        .eq('id', empresa.id);

      if (error) throw error;

      showAlert(`Empresa ${newStatus === 'ativa' ? 'ativada' : 'desativada'} com sucesso!`, 'success');
      loadEmpresas();
    } catch (error: any) {
      showAlert(error.message || 'Erro ao alterar status da empresa', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('=== INICIANDO EXCLUSÃO DE EMPRESA ===');
      console.log('ID da empresa:', id);

      console.log('Passo 1: Desvinculando profiles da empresa...');
      const updateResult = await supabase
        .from('profiles')
        .update({ empresa_id: null })
        .eq('empresa_id', id);

      if (updateResult.error) {
        console.error('Erro ao desvincular profiles:', updateResult.error);
        throw updateResult.error;
      }

      console.log('Profiles desvinculados com sucesso!');

      console.log('Passo 2: Deletando empresa...');
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro ao excluir empresa:', error);
        throw error;
      }

      console.log('Empresa excluída com sucesso!');
      showAlert('Empresa excluída com sucesso!', 'success');
      setConfirmDelete(null);
      await loadEmpresas();
    } catch (error: any) {
      console.error('=== ERRO NA EXCLUSÃO ===');
      console.error('Erro completo:', error);
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('Code:', error.code);

      showAlert(error.message || 'Erro ao excluir empresa', 'error');
      setConfirmDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      telefone: '',
      email: '',
      data_inicio_vigencia: new Date().toISOString().split('T')[0],
      data_fim_vigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ativa',
    });
  };

  const calculateDaysRemaining = (empresa: Empresa) => {
    const dataFim = empresa.data_fim;
    if (!dataFim) return null;

    const today = new Date();
    const endDate = new Date(dataFim);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredEmpresas = (empresas || []).filter(empresa => {
    if (!empresa) return false;

    const searchLower = searchTerm.toLowerCase();
    const razaoSocial = (empresa.razao_social || empresa.nome || '').toLowerCase();
    const nomeFantasia = (empresa.nome || '').toLowerCase();
    const cnpj = empresa.cnpj || '';

    return razaoSocial.includes(searchLower) ||
           nomeFantasia.includes(searchLower) ||
           cnpj.includes(searchTerm);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': return 'bg-green-100 text-green-800';
      case 'inativa': return 'bg-gray-100 text-gray-800';
      case 'bloqueada': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isVigenciaExpired = (dataFim: string) => {
    return new Date(dataFim) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Erro ao carregar dados
        </h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadEmpresas}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-blue-600" />
          <div>
            <h2 className="text-lg font-bold text-gray-900">Gerenciamento de Empresas</h2>
            <p className="text-xs text-gray-500">Cadastre e gerencie as empresas do sistema</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDeleteLegacyEmpresas}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <Trash2 size={16} />
            Limpar Empresas Teste
          </button>
          <button
            onClick={() => {
              setEditingEmpresa(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} />
            Nova Empresa
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
        <div className="p-2 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Razão Social
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  CNPJ
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Vigência
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Dias
                </th>
                <th className="px-3 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-xs">
                    Carregando...
                  </td>
                </tr>
              ) : filteredEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-xs">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : (
                filteredEmpresas.map((empresa, index) => {
                  if (!empresa || !empresa.id) return null;

                  const diasRestantes = calculateDaysRemaining(empresa);
                  const isExpired = diasRestantes !== null && diasRestantes < 0;
                  const isExpiringSoon = diasRestantes !== null && diasRestantes <= 30 && diasRestantes >= 0;

                  return (
                    <tr key={empresa.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                        #{index + 1}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                        {empresa.razao_social || empresa.nome || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                        {empresa.nome || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 font-mono">
                        {empresa.cnpj || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex flex-col">
                          <span>
                            {empresa.data_inicio
                              ? new Date(empresa.data_inicio).toLocaleDateString('pt-BR')
                              : '-'}
                          </span>
                          <span className={`text-[10px] ${
                            empresa.data_fim && isVigenciaExpired(empresa.data_fim)
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-500'
                          }`}>
                            até {empresa.data_fim
                              ? new Date(empresa.data_fim).toLocaleDateString('pt-BR')
                              : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {diasRestantes !== null ? (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            isExpired
                              ? 'bg-red-100 text-red-800'
                              : isExpiringSoon
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {isExpired ? `Exp ${Math.abs(diasRestantes)}d` : `${diasRestantes}d`}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleEdit(empresa)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Botão de exclusão clicado! ID:', empresa.id);
                              setConfirmDelete(empresa.id);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingEmpresa ? 'Editar Empresa' : 'Nova Empresa'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEmpresa(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razão Social *
                  </label>
                  <input
                    type="text"
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Fantasia *
                  </label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Início Vigência *
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio_vigencia}
                    onChange={(e) => setFormData({ ...formData, data_inicio_vigencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Fim Vigência *
                  </label>
                  <input
                    type="date"
                    value={formData.data_fim_vigencia}
                    onChange={(e) => setFormData({ ...formData, data_fim_vigencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="ativa">Ativa</option>
                    <option value="inativa">Inativa</option>
                    <option value="bloqueada">Bloqueada</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingEmpresa(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Check size={18} />
                  {editingEmpresa ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita e todos os dados relacionados serão perdidos."
        type="danger"
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={() => {
          console.log('Modal confirmado! Executando handleDelete...');
          if (confirmDelete) {
            handleDelete(confirmDelete);
          }
        }}
        onCancel={() => {
          console.log('Modal cancelado!');
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}

export default function EmpresasManager() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Error caught by EmpresasManager:', error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Erro ao carregar Gerenciamento de Empresas
        </h3>
        <p className="text-red-600 mb-4">
          Ocorreu um erro inesperado ao renderizar a página de empresas.
        </p>
        <button
          onClick={() => {
            setHasError(false);
            window.location.reload();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Recarregar Página
        </button>
      </div>
    );
  }

  try {
    return <EmpresasManagerContent />;
  } catch (error) {
    console.error('Render error in EmpresasManager:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Erro ao renderizar componente
        </h3>
        <p className="text-red-600 mb-4">
          Ocorreu um erro ao renderizar a lista de empresas.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Recarregar Página
        </button>
      </div>
    );
  }
}
