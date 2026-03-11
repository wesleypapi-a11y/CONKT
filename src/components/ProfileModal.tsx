import { useState, useEffect } from 'react';
import { X, Upload, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { conktColors } from '../styles/colors';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, updateProfile } = useAuth();
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [funcao, setFuncao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile) {
      setNomeCompleto(profile.nome_completo || '');
      setFuncao(profile.funcao || '');
      setTelefone(profile.telefone || '');
      setAvatarPreview(profile.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : null);
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nomeCompleto.trim()) {
      setError('Nome completo é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updateProfile({
        nome_completo: nomeCompleto,
        funcao,
        telefone,
      }, avatarFile || undefined);

      if (updateError) {
        console.error('Erro ao atualizar perfil:', updateError);
        setError(updateError.message || 'Erro ao atualizar perfil. Verifique os dados e tente novamente.');
      } else {
        setSuccess('Perfil atualizado com sucesso!');
        setTimeout(() => {
          setSuccess('');
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setError('Erro inesperado ao atualizar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Editar Perfil</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div
              className="p-4 rounded-lg text-sm text-white"
              style={{ backgroundColor: conktColors.status.error }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              className="p-4 rounded-lg text-sm text-white"
              style={{ backgroundColor: conktColors.status.success }}
            >
              {success}
            </div>
          )}

          <div className="flex justify-center">
            <label htmlFor="avatarEdit" className="cursor-pointer">
              <div className="relative">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                  />
                ) : (
                  <div
                    className="w-32 h-32 rounded-full flex items-center justify-center border-4 border-dashed border-gray-300"
                    style={{ backgroundColor: conktColors.neutral.gray100 }}
                  >
                    <User size={48} className="text-gray-400" />
                  </div>
                )}
                <div
                  className="absolute bottom-0 right-0 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: conktColors.sidebar.main }}
                >
                  <Upload size={20} />
                </div>
              </div>
              <input
                id="avatarEdit"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="nomeEdit" className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo *
              </label>
              <input
                id="nomeEdit"
                type="text"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label htmlFor="funcaoEdit" className="block text-sm font-medium text-gray-700 mb-2">
                Função
              </label>
              <input
                id="funcaoEdit"
                type="text"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                placeholder="Sua função na empresa"
              />
            </div>

            <div>
              <label htmlFor="telefoneEdit" className="block text-sm font-medium text-gray-700 mb-2">
                Telefone
              </label>
              <input
                id="telefoneEdit"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between">
                <span>Email:</span>
                <span className="font-medium text-gray-800">{profile?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: conktColors.sidebar.main }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
