import { Shield, Crown, UserCog, User } from 'lucide-react';

export default function PerfisInfo() {
  const perfis = [
    {
      id: 'master',
      nome: 'Master',
      icon: Crown,
      cor: 'purple',
      descricao: 'Perfil de super administrador com acesso total ao sistema',
      permissoes: [
        'Acesso total a todas as funcionalidades',
        'Gerenciar todas as empresas do sistema',
        'Criar, editar e excluir empresas',
        'Gerenciar todos os usuários de todas as empresas',
        'Configurar perfis e permissões',
        'Acesso ao painel de debug e logs do sistema',
        'Não está vinculado a nenhuma empresa específica',
      ],
    },
    {
      id: 'admin',
      nome: 'Administrador',
      icon: UserCog,
      cor: 'blue',
      descricao: 'Administrador da empresa com permissões completas dentro de sua empresa',
      permissoes: [
        'Acesso completo aos dados da sua empresa',
        'Gerenciar usuários da sua empresa',
        'Criar e gerenciar obras, contratos e orçamentos',
        'Gerenciar fornecedores e compras',
        'Acesso a relatórios e dashboards',
        'Configurar preferências da empresa',
        'Vinculado a uma empresa específica',
      ],
    },
    {
      id: 'usuario',
      nome: 'Usuário',
      icon: User,
      cor: 'gray',
      descricao: 'Usuário padrão com permissões limitadas para operações do dia a dia',
      permissoes: [
        'Visualizar dados da sua empresa',
        'Criar e editar registros básicos',
        'Acessar obras e tarefas atribuídas',
        'Preencher diários de obra (RDO)',
        'Visualizar relatórios básicos',
        'Não pode gerenciar usuários ou configurações',
        'Vinculado a uma empresa específica',
      ],
    },
  ];

  const getColorClasses = (cor: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-900',
        icon: 'text-purple-600',
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600',
      },
      gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-900',
        icon: 'text-gray-600',
      },
    };
    return colors[cor] || colors.gray;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Perfis de Usuário</h2>
        <p className="text-sm text-gray-500 mt-1">
          Visualização dos perfis disponíveis no sistema e suas permissões
        </p>
      </div>

      {/* Cards de Perfis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {perfis.map((perfil) => {
          const Icon = perfil.icon;
          const colors = getColorClasses(perfil.cor);

          return (
            <div
              key={perfil.id}
              className={`${colors.bg} border ${colors.border} rounded-xl p-6 space-y-4`}
            >
              {/* Cabeçalho do Card */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 bg-white rounded-lg ${colors.icon}`}>
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${colors.text}`}>
                      {perfil.nome}
                    </h3>
                    <p className={`text-xs ${colors.text} opacity-75 mt-0.5`}>
                      Perfil: {perfil.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <p className={`text-sm ${colors.text} opacity-90`}>
                {perfil.descricao}
              </p>

              {/* Permissões */}
              <div>
                <h4 className={`text-sm font-semibold ${colors.text} mb-2`}>
                  Permissões:
                </h4>
                <ul className="space-y-1.5">
                  {perfil.permissoes.map((permissao, index) => (
                    <li
                      key={index}
                      className={`text-xs ${colors.text} opacity-80 flex items-start gap-2`}
                    >
                      <span className="text-lg leading-none">•</span>
                      <span className="flex-1">{permissao}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Informações Adicionais */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Shield size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-blue-900 mb-2">
              Informações Importantes sobre Perfis
            </h3>
            <div className="space-y-2 text-sm text-blue-900 opacity-90">
              <p>
                <strong>Master:</strong> É o perfil de mais alto nível, com acesso irrestrito a todo o sistema.
                Geralmente usado pela equipe de TI ou proprietários do sistema. Não está vinculado a nenhuma empresa.
              </p>
              <p>
                <strong>Administrador:</strong> Tem controle total sobre sua empresa, podendo gerenciar usuários,
                obras, contratos, orçamentos e todas as funcionalidades do sistema dentro do contexto da empresa.
              </p>
              <p>
                <strong>Usuário:</strong> Perfil operacional, com permissões limitadas para realizar tarefas do dia a dia,
                como preencher RDOs, visualizar obras e acessar informações básicas.
              </p>
              <p className="pt-2 border-t border-blue-200 mt-3">
                <strong>Nota:</strong> As permissões de cada perfil são controladas automaticamente pelo sistema através
                de políticas de segurança (RLS - Row Level Security) no banco de dados, garantindo que cada usuário
                acesse apenas os dados permitidos para seu perfil.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Visual */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Resumo de Perfis no Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <Crown size={32} className="mx-auto text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-900">Master</p>
            <p className="text-xs text-purple-700 mt-1">Super Administrador</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <UserCog size={32} className="mx-auto text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-900">Administrador</p>
            <p className="text-xs text-blue-700 mt-1">Gestor da Empresa</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <User size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">Usuário</p>
            <p className="text-xs text-gray-700 mt-1">Operacional</p>
          </div>
        </div>
      </div>
    </div>
  );
}
