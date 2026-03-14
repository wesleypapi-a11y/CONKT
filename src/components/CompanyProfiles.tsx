import { useState, useEffect } from 'react';
import { Users, Shield, User as UserIcon, Mail, Phone, Briefcase, CheckCircle, XCircle, Plus } from 'lucide-react';
import { arcoColors } from '../styles/colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAlert } from '../hooks/useAlert';

type UserRole = 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente';

interface UserProfile {
  id: string;
  email: string;
  nome_completo: string;
  telefone?: string;
  funcao?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
  empresa_id?: string;
}

interface Empresa {
  id: string;
  razao_social: string;
}

export default function CompanyProfiles() {
  const { profile } = useAuth();
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (profile?.empresa_id) {
      loadCompanyData();
      loadUsers();
    }
  }, [profile?.empresa_id]);

  const loadCompanyData = async () => {
    if (!profile?.empresa_id) return;

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, razao_social')
        .eq('id', profile.empresa_id)
        .single();

      if (error) throw error;
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  const loadUsers = async () => {
    if (!profile?.empresa_id) {
      console.log('⚠️ CompanyProfiles: profile.empresa_id está vazio!', profile);
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 CompanyProfiles: Buscando usuários com empresa_id:', profile.empresa_id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ CompanyProfiles: Usuários carregados:', data?.length);
      console.log('📋 CompanyProfiles: Detalhes:', data?.map(u => ({
        email: u.email,
        empresa_id: u.empresa_id
      })));

      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: UserRole) => {
    const colors = {
      master: '#dc2626',
      administrador: '#3b82f6',
      financeiro: '#10b981',
      colaborador: '#6b7280',
      cliente: '#eab308'
    };
    return colors[role] || '#6b7280';
  };

  const getRoleLabel = (role: UserRole) => {
    const labels = {
      master: 'Master',
      administrador: 'Administrador',
      financeiro: 'Financeiro',
      colaborador: 'Colaborador',
      cliente: 'Cliente'
    };
    return labels[role] || role;
  };

  const getRoleIcon = (role: UserRole) => {
    if (role === 'master' || role === 'administrador' || role === 'financeiro') return Shield;
    if (role === 'cliente') return Users;
    return UserIcon;
  };

  const handleAddUser = () => {
    if (users.length >= 10) {
      showAlert('Sua empresa atingiu o limite máximo de 10 usuários', 'error');
      return;
    }
    setModalOpen(true);
  };

  const handleUserCreated = () => {
    loadUsers();
    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando perfis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={32} style={{ color: arcoColors.primary.blue }} />
          <div>
            <h2 className="text-2xl font-bold" style={{ color: arcoColors.text.primary }}>
              Perfis da Minha Empresa
            </h2>
            {empresa && (
              <p className="text-sm text-gray-500 mt-1">
                {empresa.razao_social} - {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
                {users.length < 10 && <span className="text-blue-600 font-medium"> (máximo 10)</span>}
              </p>
            )}
          </div>
        </div>
        {profile?.role === 'administrador' && (
          <button
            onClick={handleAddUser}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
            style={{ backgroundColor: arcoColors.primary.blue }}
          >
            <Plus size={20} />
            Adicionar Usuário
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Perfil
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Criado em
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((userItem) => {
                const RoleIcon = getRoleIcon(userItem.role);
                return (
                  <tr key={userItem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {userItem.avatar_url ? (
                          <img
                            src={userItem.avatar_url}
                            alt={userItem.nome_completo}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: arcoColors.primary.blue + '20' }}>
                            <UserIcon size={20} style={{ color: arcoColors.primary.blue }} />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{userItem.nome_completo || 'Sem nome'}</div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {userItem.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail size={14} className="text-gray-400" />
                            {userItem.email}
                          </div>
                        )}
                        {userItem.telefone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone size={14} className="text-gray-400" />
                            {userItem.telefone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {userItem.funcao ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Briefcase size={14} className="text-gray-400" />
                          {userItem.funcao}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <RoleIcon size={16} style={{ color: getRoleColor(userItem.role) }} />
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: getRoleColor(userItem.role) + '20',
                            color: getRoleColor(userItem.role)
                          }}
                        >
                          {getRoleLabel(userItem.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {userItem.is_active ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle size={16} />
                          <span className="text-sm font-medium">Ativo</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <XCircle size={16} />
                          <span className="text-sm font-medium">Inativo</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum usuário na sua empresa</p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Limite de Usuários</h3>
            <p className="text-sm text-blue-700">
              Cada empresa pode ter no máximo <strong>10 usuários</strong>. Atualmente você tem <strong>{users.length} de 10</strong> usuários cadastrados.
            </p>
          </div>
        </div>
      </div>

      {modalOpen && (
        <AddUserModal
          onClose={() => setModalOpen(false)}
          onSuccess={handleUserCreated}
          empresaId={profile?.empresa_id || ''}
        />
      )}
    </div>
  );
}

interface AddUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
  empresaId: string;
}

function AddUserModal({ onClose, onSuccess, empresaId }: AddUserModalProps) {
  const { showAlert } = useAlert();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    funcao: '',
    role: 'colaborador' as 'cliente' | 'colaborador' | 'financeiro',
    senha: '',
    confirmarSenha: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.senha !== formData.confirmarSenha) {
      showAlert('As senhas não coincidem', 'error');
      return;
    }

    if (formData.senha.length < 6) {
      showAlert('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.senha,
            nome: formData.nome,
            telefone: formData.telefone,
            funcao: formData.funcao,
            role: formData.role,
            is_active: true,
            empresa_id: empresaId,
            created_by: profile?.id,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Erro ao criar usuário');
      }

      showAlert('Usuário criado com sucesso!', 'success');
      onSuccess();
    } catch (error: any) {
      showAlert(error.message || 'Erro ao criar usuário', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Adicionar Novo Usuário</h2>
          <p className="text-sm text-gray-500 mt-1">Preencha os dados do novo usuário</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.telefone}
              onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Função/Cargo
            </label>
            <input
              type="text"
              value={formData.funcao}
              onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Perfil *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="colaborador">Colaborador</option>
              <option value="financeiro">Financeiro</option>
              <option value="cliente">Cliente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Senha *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.confirmarSenha}
              onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              O usuário será criado vinculado à sua empresa e receberá acesso ao sistema com o perfil selecionado.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: arcoColors.primary.blue }}
            >
              {saving ? 'Criando...' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
