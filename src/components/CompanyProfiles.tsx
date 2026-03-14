import { useState, useEffect } from 'react';
import { Users, Shield, User as UserIcon, Mail, Phone, Briefcase, CheckCircle, XCircle } from 'lucide-react';
import { arcoColors } from '../styles/colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  nome: string;
}

export default function CompanyProfiles() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

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
        .select('id, nome')
        .eq('id', profile.empresa_id)
        .single();

      if (error) throw error;
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar empresa:', error);
    }
  };

  const loadUsers = async () => {
    if (!profile?.empresa_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando perfis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users size={32} style={{ color: arcoColors.primary.blue }} />
        <div>
          <h2 className="text-2xl font-bold" style={{ color: arcoColors.text.primary }}>
            Perfis da Minha Empresa
          </h2>
          {empresa && (
            <p className="text-sm text-gray-500 mt-1">
              {empresa.nome} - {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
            </p>
          )}
        </div>
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
            <h3 className="font-semibold text-blue-900 mb-1">Gerenciar Usuários</h3>
            <p className="text-sm text-blue-700">
              Para criar, editar ou excluir usuários da sua empresa, acesse a aba <strong>Usuários</strong> no menu acima.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
