import { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Search, Eye, EyeOff, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import ConfirmModal from '../common/ConfirmModal';

interface Usuario {
  id: string;
  email: string;
  nome_completo: string;
  role: string;
  empresa_id: string | null;
  empresa?: {
    nome_fantasia: string;
  };
  status: string;
  created_at: string;
}

interface EmpresaSelectSelect {
  id: string;
  nome?: string;
  nome_fantasia?: string;
  razao_social?: string;
  status?: string;
}

interface NovoUsuarioForm {
  email: string;
  senha: string;
  role: string;
  empresa_id: string;
}

export default function UsuariosManager() {
  const { showAlert } = useAlert();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresaSelects] = useState<EmpresaSelect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresaSelect, setFilterEmpresaSelect] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [formData, setFormData] = useState<NovoUsuarioForm>({
    email: '',
    senha: '123456789',
    role: 'colaborador',
    empresa_id: '',
  });

  useEffect(() => {
    loadUsuarios();
    loadEmpresaSelects();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          empresa:empresas(nome_fantasia)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error: any) {
      showAlert(error.message || 'Erro ao carregar usuários', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresaSelects = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social')
        .eq('status', 'ativa')
        .order('nome_fantasia');

      if (error) throw error;
      setEmpresaSelects(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.senha || !formData.empresa_id) {
      showAlert('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    try {
      // Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.senha,
        options: {
          data: {
            role: formData.role,
            empresa_id: formData.empresa_id,
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Erro ao criar usuário');
      }

      // Atualizar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: formData.role,
          empresa_id: formData.empresa_id,
          status: 'ativo'
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      showAlert('Usuário cadastrado com sucesso!', 'success');
      setShowModal(false);
      resetForm();
      await loadUsuarios();
    } catch (error: any) {
      const errorMsg = error.message || 'Erro ao cadastrar usuário';
      showAlert(errorMsg, 'error');
      console.error('Error in handleSubmit:', error);
    }
  };

  const handleToggleStatus = async (usuario: Usuario) => {
    try {
      const newStatus = usuario.status === 'ativo' ? 'inativo' : 'ativo';

      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', usuario.id);

      if (error) throw error;

      showAlert(`Usuário ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`, 'success');
      loadUsuarios();
    } catch (error: any) {
      showAlert(error.message || 'Erro ao alterar status do usuário', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showAlert('Usuário excluído com sucesso!', 'success');
      loadUsuarios();
    } catch (error: any) {
      showAlert(error.message || 'Erro ao excluir usuário', 'error');
      console.error(error);
    } finally {
      setConfirmDelete(null);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      senha: '123456789',
      role: 'colaborador',
      empresa_id: '',
    });
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmpresaSelect = !filterEmpresaSelect || usuario.empresa_id === filterEmpresaSelect;
    const matchesRole = !filterRole || usuario.role === filterRole;
    return matchesSearch && matchesEmpresaSelect && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'master': return 'Master';
      case 'administrador': return 'Administrador';
      case 'financeiro': return 'Financeiro';
      case 'colaborador': return 'Colaborador';
      case 'cliente': return 'Cliente';
      // Manter compatibilidade com roles antigos
      case 'admin': return 'Administrador';
      case 'usuario': return 'Colaborador';
      default: return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'master': return 'bg-red-100 text-red-800';
      case 'administrador': return 'bg-blue-100 text-blue-800';
      case 'financeiro': return 'bg-green-100 text-green-800';
      case 'colaborador': return 'bg-gray-100 text-gray-800';
      case 'cliente': return 'bg-yellow-100 text-yellow-800';
      // Manter compatibilidade com roles antigos
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'usuario': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usuários do Sistema</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gerenciar todos os usuários cadastrados no sistema
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterEmpresaSelect}
            onChange={(e) => setFilterEmpresaSelect(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as empresas</option>
            {empresas.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome_fantasia}
              </option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos os perfis</option>
            <option value="master">Master</option>
            <option value="administrador">Administrador</option>
            <option value="financeiro">Financeiro</option>
            <option value="colaborador">Colaborador</option>
            <option value="cliente">Cliente</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterEmpresaSelect('');
              setFilterRole('');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login (Email)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Senha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EmpresaSelect
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users size={48} className="mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg font-medium">
                      Nenhum usuário cadastrado
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Clique em "Novo Usuário" para adicionar o primeiro usuário
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{usuario.email}</div>
                      {usuario.nome_completo && (
                        <div className="text-sm text-gray-500">{usuario.nome_completo}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">••••••••</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {usuario.empresa?.nome_fantasia || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(usuario.role)}`}>
                        {getRoleLabel(usuario.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleStatus(usuario)}
                          className={`p-2 rounded-lg transition-all ${
                            usuario.status === 'ativo'
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={usuario.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                        >
                          {usuario.status === 'ativo' ? (
                            <Power size={18} />
                          ) : (
                            <PowerOff size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(usuario.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                          disabled={usuario.role === 'master'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-gray-900">Novo Usuário</h3>
              <p className="text-sm text-gray-500 mt-1">
                Preencha os dados do novo usuário
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail do usuário *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="usuario@exemplo.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha padrão *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Senha padrão: 123456789 (o usuário deve alterá-la no primeiro acesso)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Perfil do usuário *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="colaborador">Colaborador</option>
                  <option value="administrador">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="cliente">Cliente</option>
                  <option value="master">Master</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  EmpresaSelect vinculada *
                </label>
                <select
                  value={formData.empresa_id}
                  onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map(empresa => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome_fantasia}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cadastrar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {confirmDelete && (
        <ConfirmModal
          title="Excluir Usuário"
          message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          type="danger"
        />
      )}
    </div>
  );
}
