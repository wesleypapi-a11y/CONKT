import { useState } from 'react';
import { Upload, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { conktColors } from '../styles/colors';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [userType, setUserType] = useState<'colaborador' | 'cliente'>('colaborador');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha incorretos. Tente novamente.');
    } else {
      setSuccess('Bem-vindo!');
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('As senhas não correspondem.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, nome, userType, avatarFile || undefined);

    if (error) {
      setError('Erro ao criar conta. Verifique se o email já está registrado.');
    } else {
      setSuccess('Conta criada com sucesso! Faça login com suas credenciais.');
      setIsSignUp(false);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setNome('');
      setUserType('colaborador');
      setAvatarFile(null);
      setAvatarPreview(null);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="flex-1 flex items-center justify-center p-8"
        style={{ backgroundColor: conktColors.neutral.gray50 }}
      >
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="mb-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="mb-3">
                  <img
                    src="/logo_conkt-removebg-preview.png"
                    alt="CONKT Logo"
                    className="h-20 mx-auto"
                  />
                </div>

                <div>
                  <h1 className="text-xl font-bold text-gray-800 mb-1">
                    Sistema de Gestão de Obras
                  </h1>
                  <p className="text-sm text-gray-600">
                    {isSignUp ? 'Crie sua conta' : 'Entre com suas credenciais para acessar'}
                  </p>
                </div>
              </div>

              {isSignUp && (
                <div className="flex flex-col items-center">
                  <label htmlFor="avatar" className="cursor-pointer">
                    <div className="relative">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Preview"
                          className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                        />
                      ) : (
                        <div
                          className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-dashed border-gray-300"
                          style={{ backgroundColor: conktColors.neutral.gray100 }}
                        >
                          <User size={28} className="text-gray-400" />
                        </div>
                      )}
                      <div
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: conktColors.sidebar.main }}
                      >
                        <Upload size={14} />
                      </div>
                    </div>
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    Clique para adicionar foto
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
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

              {isSignUp && (
                <>
                  <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo
                    </label>
                    <input
                      id="nome"
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                      placeholder="Seu nome completo"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              {isSignUp && (
                <>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Senha
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-2 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tipo de Usuário
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUserType('colaborador')}
                        className={`p-3 rounded-lg border-2 transition-all text-center font-medium ${
                          userType === 'colaborador'
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-sm">Colaborador</div>
                        <div className="text-xs text-gray-600 mt-1">Da equipe</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserType('cliente')}
                        className={`p-3 rounded-lg border-2 transition-all text-center font-medium ${
                          userType === 'cliente'
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-sm">Cliente</div>
                        <div className="text-xs text-gray-600 mt-1">Proprietário</div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg text-white font-medium transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: conktColors.sidebar.main,
                }}
              >
                {loading ? 'Processando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 mb-2">
                {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setSuccess('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setNome('');
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}
                className="text-sm font-medium transition-colors"
                style={{ color: conktColors.sidebar.main }}
              >
                {isSignUp ? 'Voltar para login' : 'Cadastre-se agora'}
              </button>
            </div>

            <div className="mt-4 text-center text-xs text-gray-500">
              <p>A gestão da obra na sua mão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
