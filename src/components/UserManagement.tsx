import { useState, useEffect, useRef } from 'react';
import { Users, Plus, CreditCard as Edit2, Trash2, X, Save, Shield, User as UserIcon, Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, Camera } from 'lucide-react';
import { conktColors } from '../styles/colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type UserRole = 'master' | 'administrador' | 'financeiro' | 'colaborador' | 'cliente';

interface UserProfile {
  id: string;
  email: string;
  nome: string;
  telefone?: string;
  funcao?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  created_by?: string;
  avatar_url?: string;
  empresa_id?: string;
}

interface Empresa {
  id: string;
  nome: string;
}

export default function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nome: '',
    telefone: '',
    funcao: '',
    role: 'colaborador' as UserRole,
    is_active: true,
    avatar_url: '',
    empresa_id: ''
  });

  useEffect(() => {
    loadUsers();
    loadEmpresas();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome')
        .eq('is_active', true)
        .order('nome');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleOpenModal = (userToEdit?: UserProfile) => {
    if (userToEdit) {
      setEditingUser(userToEdit);
      setFormData({
        email: userToEdit.email,
        password: '',
        nome: userToEdit.nome,
        telefone: userToEdit.telefone || '',
        funcao: userToEdit.funcao || '',
        role: userToEdit.role,
        is_active: userToEdit.is_active,
        avatar_url: userToEdit.avatar_url || '',
        empresa_id: userToEdit.empresa_id || ''
      });
      setAvatarPreview(userToEdit.avatar_url || '');
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        nome: '',
        telefone: '',
        funcao: '',
        role: 'colaborador',
        is_active: true,
        avatar_url: '',
        empresa_id: ''
      });
      setAvatarPreview('');
    }
    setAvatarFile(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      nome: '',
      telefone: '',
      funcao: '',
      role: 'colaborador',
      is_active: true,
      avatar_url: '',
      empresa_id: ''
    });
    setShowPassword(false);
    setAvatarFile(null);
    setAvatarPreview('');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB');
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!formData.email || !formData.nome) {
      alert('Email e nome são obrigatórios');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Senha é obrigatória para novos usuários');
      return;
    }

    if (formData.role !== 'master' && !formData.empresa_id) {
      alert('Empresa é obrigatória para usuários não-Master');
      return;
    }

    if (formData.role === 'master') {
      const existingMaster = users.find(u => u.role === 'master' && u.id !== editingUser?.id);
      if (existingMaster) {
        alert('Já existe um usuário Master no sistema');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingUser) {
        let avatarUrl = formData.avatar_url;

        if (avatarFile) {
          const uploadedUrl = await uploadAvatar(editingUser.id);
          if (uploadedUrl) avatarUrl = uploadedUrl;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome: formData.nome,
            telefone: formData.telefone,
            funcao: formData.funcao,
            role: formData.role,
            is_active: formData.is_active,
            avatar_url: avatarUrl,
            empresa_id: formData.role === 'master' ? null : formData.empresa_id
          })
          .eq('id', editingUser.id);

        if (profileError) throw profileError;

        if (formData.password) {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            editingUser.id,
            { password: formData.password }
          );
          if (passwordError) console.error('Erro ao atualizar senha:', passwordError);
        }

        alert('Usuário atualizado com sucesso!');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Sessão inválida');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nome: formData.nome,
            telefone: formData.telefone,
            funcao: formData.funcao,
            role: formData.role,
            is_active: formData.is_active,
            empresa_id: formData.empresa_id,
            avatar_url: '',
            created_by: user?.id,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao criar usuário');
        }

        if (avatarFile && result.user?.id) {
          const uploadedUrl = await uploadAvatar(result.user.id);
          if (uploadedUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: uploadedUrl })
              .eq('id', result.user.id);
          }
        }

        alert('Usuário criado com sucesso!');
      }

      handleCloseModal();
      await loadUsers();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      alert(error.message || 'Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`Deseja ${currentStatus ? 'desativar' : 'ativar'} este usuário?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do usuário');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      loadUsers();
      alert('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('Erro ao excluir usuário');
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
    if (role === 'master') return Shield;
    if (role === 'administrador') return Shield;
    if (role === 'financeiro') return Shield;
    if (role === 'cliente') return Users;
    return UserIcon;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={32} style={{ color: conktColors.primary.blue }} />
          <h2 className="text-2xl font-bold" style={{ color: conktColors.text.primary }}>
            Gerenciamento de Usuários
          </h2>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
          style={{ backgroundColor: conktColors.primary.blue }}
        >
          <Plus size={20} />
          Novo Usuário
        </button>
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
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ações
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
                            alt={userItem.nome}
                            className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: conktColors.primary.blue + '20' }}>
                            <UserIcon size={20} style={{ color: conktColors.primary.blue }} />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{userItem.nome}</div>
                          <div className="text-sm text-gray-500">{userItem.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{userItem.funcao || '-'}</div>
                      <div className="text-xs text-gray-500">{userItem.telefone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: getRoleColor(userItem.role) + '20', color: getRoleColor(userItem.role) }}>
                        <RoleIcon size={14} />
                        {getRoleLabel(userItem.role)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {userItem.is_active ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <CheckCircle size={14} />
                          Ativo
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          <XCircle size={14} />
                          Inativo
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(userItem.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(userItem.id, userItem.is_active)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ backgroundColor: userItem.is_active ? '#fee2e2' : '#dcfce7', color: userItem.is_active ? '#dc2626' : '#16a34a' }}
                          title={userItem.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {userItem.is_active ? <XCircle size={16} /> : <CheckCircle size={16} />}
                        </button>
                        <button
                          onClick={() => handleOpenModal(userItem)}
                          className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{ color: conktColors.primary.blue }}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(userItem.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users size={48} className="mx-auto text-gray-900 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum usuário cadastrado</p>
            <p className="text-gray-400 text-sm mt-1">Clique em "Novo Usuário" para adicionar</p>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 lg:left-64 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full flex items-center justify-center bg-gray-100 border-4 border-gray-200">
                      <UserIcon size={48} className="text-gray-400" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full text-white shadow-lg hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: conktColors.primary.blue }}
                  >
                    <Camera size={20} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Clique no ícone para adicionar uma foto</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!!editingUser}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="usuario@exemplo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {!editingUser && <span className="text-red-500">*</span>}
                    {editingUser && <span className="text-gray-500 text-xs">(deixe em branco para manter)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Digite a senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Função
                  </label>
                  <input
                    type="text"
                    value={formData.funcao}
                    onChange={(e) => setFormData({ ...formData, funcao: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Engenheiro, Gerente"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perfil de Acesso <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="administrador">Administrador</option>
                    <option value="financeiro">Financeiro</option>
                    <option value="cliente">Cliente</option>
                    <option value="master">Master</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.role === 'master' && 'Acesso global ao sistema e todas as empresas'}
                    {formData.role === 'administrador' && 'Gerente da empresa - acesso total aos módulos'}
                    {formData.role === 'financeiro' && 'Responsável financeiro - acesso a compras e contratos'}
                    {formData.role === 'colaborador' && 'Usuário operacional - acesso às obras e tarefas'}
                    {formData.role === 'cliente' && 'Acesso apenas ao Portal do Cliente'}
                  </p>
                </div>

                {formData.role !== 'master' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Empresa <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.empresa_id}
                      onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione uma empresa</option>
                      {empresas.map((empresa) => (
                        <option key={empresa.id} value={empresa.id}>
                          {empresa.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={formData.is_active}
                        onChange={() => setFormData({ ...formData, is_active: true })}
                        className="w-4 h-4"
                        style={{ accentColor: conktColors.primary.blue }}
                      />
                      <span className="text-sm text-gray-700">Ativo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!formData.is_active}
                        onChange={() => setFormData({ ...formData, is_active: false })}
                        className="w-4 h-4"
                        style={{ accentColor: conktColors.primary.blue }}
                      />
                      <span className="text-sm text-gray-700">Inativo</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="btn-cancel"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: conktColors.primary.blue }}
              >
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
