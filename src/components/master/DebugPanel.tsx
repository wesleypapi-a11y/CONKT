import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function DebugPanel() {
  const { profile, user } = useAuth();
  const [empresasCount, setEmpresasCount] = useState<number | null>(null);
  const [empresasError, setEmpresasError] = useState<string | null>(null);
  const [profileFromDb, setProfileFromDb] = useState<any>(null);
  const [insertTestResult, setInsertTestResult] = useState<string | null>(null);
  const [insertTestError, setInsertTestError] = useState<string | null>(null);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfileFromDb(profileData);

      const { count, error: empresasError } = await supabase
        .from('empresas')
        .select('*', { count: 'exact', head: true });

      if (empresasError) {
        setEmpresasError(empresasError.message);
        setEmpresasCount(null);
      } else {
        setEmpresasCount(count || 0);
      }
    } catch (error: any) {
      console.error('Debug error:', error);
      setEmpresasError(error.message);
    }
  };

  const testInsert = async () => {
    setInsertTestResult(null);
    setInsertTestError(null);

    try {
      const testData = {
        razao_social: 'TESTE EMPRESA LTDA',
        nome_fantasia: 'Teste Empresa',
        cnpj: `99999999999999${Date.now().toString().slice(-2)}`,
        telefone: '11999999999',
        email: 'teste@teste.com',
        data_inicio_vigencia: new Date().toISOString().split('T')[0],
        data_fim_vigencia: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'ativa',
      };

      console.log('Tentando inserir empresa de teste:', testData);

      const { data, error } = await supabase
        .from('empresas')
        .insert([testData])
        .select();

      if (error) {
        console.error('Erro no insert de teste:', error);
        setInsertTestError(JSON.stringify({
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        }, null, 2));
        return;
      }

      console.log('Insert de teste bem sucedido:', data);
      setInsertTestResult(JSON.stringify(data, null, 2));
      await checkAccess();
    } catch (error: any) {
      console.error('Erro no teste de insert:', error);
      setInsertTestError(error.message);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-blue-900 mb-4">Painel de Depuração - Acesso Master</h2>

        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Informações do Usuário Atual</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">ID:</span> {user?.id || 'N/A'}</p>
              <p><span className="font-medium">Email:</span> {user?.email || 'N/A'}</p>
              <p><span className="font-medium">Role (Context):</span>
                <span className={`ml-2 px-2 py-1 rounded ${
                  profile?.role === 'master' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {profile?.role || 'N/A'}
                </span>
              </p>
              <p><span className="font-medium">Empresa ID:</span> {profile?.empresa_id || 'NULL (correto para master)'}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Perfil no Banco de Dados</h3>
            {profileFromDb ? (
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Role (DB):</span>
                  <span className={`ml-2 px-2 py-1 rounded ${
                    profileFromDb.role === 'master' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {profileFromDb.role}
                  </span>
                </p>
                <p><span className="font-medium">Nome:</span> {profileFromDb.nome_completo}</p>
                <p><span className="font-medium">Empresa ID (DB):</span> {profileFromDb.empresa_id || 'NULL'}</p>
                <p><span className="font-medium">Ativo:</span> {profileFromDb.is_active ? 'Sim' : 'Não'}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Carregando...</p>
            )}
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Teste de Acesso à Tabela Empresas</h3>
            {empresasError ? (
              <div className="flex items-start gap-2 text-red-600">
                <XCircle size={20} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Erro ao acessar tabela empresas:</p>
                  <p className="text-sm mt-1">{empresasError}</p>
                  <p className="text-xs mt-2 text-gray-600">
                    Isso indica que as políticas RLS podem não estar reconhecendo o perfil master.
                  </p>
                </div>
              </div>
            ) : empresasCount !== null ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <p>Acesso OK - {empresasCount} empresas encontradas</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Verificando acesso...</p>
            )}
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Diagnóstico</h3>
            <div className="space-y-2 text-sm">
              {profile?.role === 'master' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={16} />
                  <span>Role master detectado no contexto</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle size={16} />
                  <span>Role master NÃO detectado no contexto (atual: {profile?.role || 'undefined'})</span>
                </div>
              )}

              {profileFromDb?.role === 'master' ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={16} />
                  <span>Role master confirmado no banco de dados</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle size={16} />
                  <span>Role master NÃO encontrado no banco</span>
                </div>
              )}

              {!profile?.empresa_id ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={16} />
                  <span>Empresa ID é NULL (correto para master)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-orange-600">
                  <AlertCircle size={16} />
                  <span>Master tem empresa_id definido (deveria ser NULL)</span>
                </div>
              )}

              {!empresasError ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle size={16} />
                  <span>Acesso à tabela empresas funcionando</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle size={16} />
                  <span>Falha ao acessar tabela empresas</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Teste de INSERT</h3>
            <button
              onClick={testInsert}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Testar INSERT na tabela empresas
            </button>

            {insertTestResult && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                <p className="text-green-800 font-medium text-sm mb-2">Sucesso!</p>
                <pre className="text-xs text-green-700 overflow-x-auto">{insertTestResult}</pre>
              </div>
            )}

            {insertTestError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-800 font-medium text-sm mb-2">Erro no INSERT:</p>
                <pre className="text-xs text-red-700 overflow-x-auto">{insertTestError}</pre>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle size={20} />
              Solução
            </h3>
            <p className="text-sm text-yellow-800 mb-2">
              Se o role não estiver como 'master' no banco de dados, execute:
            </p>
            <code className="block bg-yellow-100 p-2 rounded text-xs text-yellow-900 overflow-x-auto">
              UPDATE profiles SET role = 'master', empresa_id = NULL WHERE email = '{user?.email}';
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
