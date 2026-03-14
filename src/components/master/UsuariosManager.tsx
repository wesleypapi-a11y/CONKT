import { useState, useEffect } from 'react';
import { Users, Plus, CreditCard as Edit, Trash2, Search, Eye, EyeOff, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import { useAlert } from '../../hooks/useAlert';
import ConfirmModal from '../common/ConfirmModal';

interface Usuario {
  id: string;
  email: string;
  nome_completo: string;
  role: string;
  empresa_id: string | null;
  empresa?: {
    nome: string;
  } | null;
  is_active: boolean;
  created_at: string;
}

interface EmpresaSelect {
  id: string;
  razao_social: string;
}

interface NovoUsuarioForm {
  nome_completo: string;
  email: string;
  senha: string;
  role: string;
  empresa_id: string;
}

export default function UsuariosManager() {
  const { showAlert } = useAlert();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaSelect[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresaSelect] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState<NovoUsuarioForm>({
    nome_completo: '',
    email: '',
    senha: '123456789',
    role: 'colaborador',
    empresa_id: '',
  });

  useEffect(() => {
    loadUsuarios();
    loadEmpresas();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      console.log('========================================');
      console.log('=== INICIANDO CARREGAMENTO USUÁRIOS ===');
      console.log('========================================');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('1️⃣ QUERY SIMPLIFICADA (SEM JOIN):');
      console.log('   - Error:', error);
      console.log('   - Data recebida:', data);
      console.log('   - Total de registros:', data?.length || 0);

      if (data && data.length > 0) {
        console.log('2️⃣ DETALHAMENTO DOS USUÁRIOS RETORNADOS:');
        data.forEach((user, index) => {
          console.log(`   Usuário ${index + 1}:`, {
            id: user.id,
            email: user.email,
            nome_completo: user.nome_completo,
            role: user.role,
            empresa_id: user.empresa_id,
            is_active: user.is_active,
          });
        });
      }

      if (error) {
        console.error('❌ ERRO NA QUERY:', error);
        throw error;
      }

      const usuariosComEmpresa = await Promise.all(
        (data || []).map(async (user) => {
          if (user.empresa_id) {
            const { data: empresaData } = await supabase
              .from('empresas')
              .select('razao_social')
              .eq('id', user.empresa_id)
              .maybeSingle();

            return {
              ...user,
              empresa: empresaData ? { nome: empresaData.razao_social } : null,
            };
          }
          return { ...user, empresa: null };
        })
      );

      console.log('3️⃣ DEPOIS DE BUSCAR EMPRESAS SEPARADAMENTE:', usuariosComEmpresa);
      console.log('   - Total após enriquecimento:', usuariosComEmpresa.length);

      console.log('4️⃣ ANTES DE setUsuarios - Array que será salvo:', usuariosComEmpresa);
      setUsuarios(usuariosComEmpresa);
      console.log('5️⃣ DEPOIS de setUsuarios - Chamada concluída');
    } catch (error: any) {
      showAlert(error.message || 'Erro ao carregar usuários', 'error');
      console.error('❌ EXCEPTION ao carregar usuários:', error);
    } finally {
      setLoading(false);
      console.log('========================================');
    }
  };

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razao_social')
        .eq('status', 'ativa')
        .is('deleted_at', null)
        .order('razao_social');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo || !formData.email || !formData.empresa_id) {
      showAlert('Preencha todos os campos obrigatórios', 'error');
      return;
    }

    try {
      if (editingUserId) {
        const { error } = await supabase
          .from('profiles')
          .update({
            nome_completo: formData.nome_completo,
            role: formData.role,
            empresa_id: formData.empresa_id,
          })
          .eq('id', editingUserId);

        if (error) throw error;
        showAlert('Usuário atualizado com sucesso!', 'success');
      } else {
        if (!formData.senha) {
          showAlert('Senha é obrigatória para novo usuário', 'error');
          return;
        }

        const { data: existingUser } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', formData.email)
          .maybeSingle();

        if (existingUser) {
          showAlert('Email já cadastrado', 'error');
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        console.log('=== DEBUG SESSION ===');
        console.log('sessionError:', sessionError);
        console.log('session:', session);
        console.log('session?.access_token:', session?.access_token);

        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          showAlert('Erro ao obter sessão. Tente novamente.', 'error');
          return;
        }

        if (!session) {
          showAlert('Sessão inválida. Faça login novamente.', 'error');
          return;
        }

        if (!session.access_token) {
          showAlert('Token de acesso não encontrado. Faça login novamente.', 'error');
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        console.log('=== DEBUG USER ===');
        console.log('userError:', userError);
        console.log('user:', user);

        if (userError || !user) {
          console.error('Erro ao obter usuário:', userError);
          showAlert('Usuário não autenticado. Faça login novamente.', 'error');
          return;
        }

        console.log('=== CHAMANDO EDGE FUNCTION ===');
        const payload = {
          email: formData.email,
          password: formData.senha,
          nome: formData.nome_completo,
          telefone: '',
          funcao: '',
          role: formData.role,
          is_active: true,
          empresa_id: formData.empresa_id,
          avatar_url: '',
          created_by: user.id,
        };

        console.log('payload:', payload);

        const { data, error: fnError } = await supabase.functions.invoke('create-user', {
          body: payload,
        });

        console.log('fnError:', fnError);
        console.log('data:', data);

        if (fnError) {
          if (fnError instanceof FunctionsHttpError) {
            const errorBody = await fnError.context.json();
            console.error('Erro HTTP real da função:', errorBody);
            throw new Error(errorBody?.error || errorBody?.message || 'Erro HTTP na Edge Function');
          } else if (fnError instanceof FunctionsRelayError) {
            throw new Error(fnError.message);
          } else if (fnError instanceof FunctionsFetchError) {
            throw new Error(fnError.message);
          } else {
            throw new Error(fnError.message || 'Erro desconhecido na Edge Function');
          }
        }

        if (data?.success !== true) {
          throw new Error(data?.error || 'Erro desconhecido ao criar usuário');
        }

        showAlert('Usuário cadastrado com sucesso!', 'success');
        setShowModal(false);
        setEditingUserId(null);
        resetForm();
        console.log('=== RECARREGANDO USUÁRIOS APÓS CRIAÇÃO ===');
        await loadUsuarios();
        console.log('=== USUÁRIOS RECARREGADOS - ESTADO FINAL:', usuarios);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Erro ao salvar usuário';
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

  const handleEdit = (usuario: Usuario) => {
    setEditingUserId(usuario.id);
    setFormData({
      nome_completo: usuario.nome_completo || '',
      email: usuario.email,
      senha: '',
      role: usuario.role,
      empresa_id: usuario.empresa_id || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      senha: '123456789',
      role: 'colaborador',
      empresa_id: '',
    });
    setEditingUserId(null);
  };

  console.log('========================================');
  console.log('=== APLICANDO FILTROS ===');
  console.log('6️⃣ ESTADO usuarios ANTES DO FILTRO:');
  console.log('   - Total no estado:', usuarios.length);
  console.log('   - Array completo:', usuarios);

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         usuario.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEmpresa = !filterEmpresa || usuario.empresa_id === filterEmpresa;
    const matchesRole = !filterRole || usuario.role === filterRole;

    console.log(`   Filtrando ${usuario.email}:`, {
      matchesSearch,
      matchesEmpresa,
      matchesRole,
      passa: matchesSearch && matchesEmpresa && matchesRole
    });

    return matchesSearch && matchesEmpresa && matchesRole;
  });

  console.log('7️⃣ RESULTADO APÓS FILTROS:');
  console.log('   - searchTerm:', searchTerm);
  console.log('   - filterEmpresa:', filterEmpresa);
  console.log('   - filterRole:', filterRole);
  console.log('   - Total após filtro:', filteredUsuarios.length);
  console.log('   - Array filtrado:', filteredUsuarios);
  console.log('========================================');

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
            value={filterEmpresa}
            onChange={(e) => setFilterEmpresaSelect(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas as empresas</option>
            {empresas.map(empresa => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome}
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
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  E-mail do usuário *
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Senha padrão *
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Perfil do usuário *
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa vinculada *
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {console.log('=== RENDERIZANDO TABELA ===', {
                totalUsuarios: usuarios.length,
                filteredUsuarios: filteredUsuarios.length,
                usuariosParaRenderizar: filteredUsuarios
              })}
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
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
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {usuario.nome_completo || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {usuario.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Eye size={18} className="text-gray-400" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(usuario.role)}`}>
                        {getRoleLabel(usuario.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {usuario.empresa?.nome || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(usuario)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit size={18} />
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
              <h3 className="text-xl font-bold text-gray-900">
                {editingUserId ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {editingUserId ? 'Atualize os dados do usuário' : 'Preencha os dados do novo usuário'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome completo *
                </label>
                <input
                  type="text"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome completo do usuário"
                  required
                />
              </div>

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
                  disabled={!!editingUserId}
                />
              </div>

              {!editingUserId && (
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
              )}

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
                  Empresa vinculada *
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
                      {empresa.razao_social}
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
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação */}
      {confirmDelete && (
        <ConfirmModal
          isOpen={!!confirmDelete}
          title="Excluir Usuário"
          message="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          type="danger"
        />
      )}
    </div>
  );
}
