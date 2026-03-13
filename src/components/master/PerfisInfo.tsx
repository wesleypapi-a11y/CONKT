import { Shield, Crown, UserCog, User, DollarSign } from 'lucide-react';

export default function PerfisInfo() {
  const perfis = [
    {
      id: 'master',
      nome: 'Master',
      icon: Crown,
      cor: 'red',
      descricao: 'Super administrador do sistema com acesso global',
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
      id: 'administrador',
      nome: 'Administrador',
      icon: UserCog,
      cor: 'blue',
      descricao: 'Gerente da empresa com acesso total aos módulos',
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
      id: 'financeiro',
      nome: 'Financeiro',
      icon: DollarSign,
      cor: 'green',
      descricao: 'Responsável financeiro com foco em compras e contratos',
      permissoes: [
        'Gerenciar compras e pedidos',
        'Aprovar cotações e ordens de compra',
        'Gerenciar contratos e pagamentos',
        'Acesso ao módulo financeiro completo',
        'Visualizar relatórios financeiros',
        'Gerenciar fornecedores',
        'Vinculado a uma empresa específica',
      ],
    },
    {
      id: 'colaborador',
      nome: 'Colaborador',
      icon: User,
      cor: 'gray',
      descricao: 'Usuário operacional com acesso às obras e tarefas',
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
    {
      id: 'cliente',
      nome: 'Cliente',
      icon: Shield,
      cor: 'yellow',
      descricao: 'Acesso limitado ao Portal do Cliente',
      permissoes: [
        'Acesso apenas ao Portal do Cliente',
        'Visualizar cronograma da obra',
        'Visualizar orçamento aprovado',
        'Visualizar diário de obra (RDO)',
        'Visualizar fluxo de caixa da obra',
        'Não tem acesso ao sistema completo',
        'Vinculado a obras específicas',
      ],
    },
  ];

  const getColorClasses = (cor: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-900',
        icon: 'text-red-600',
      },
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        icon: 'text-blue-600',
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        icon: 'text-green-600',
      },
      gray: {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-900',
        icon: 'text-gray-600',
      },
      yellow: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        icon: 'text-yellow-600',
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
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                <strong>Master:</strong> Super administrador do sistema com acesso global.
                Gerencia todas as empresas e usuários. Não está vinculado a nenhuma empresa.
              </p>
              <p>
                <strong>Administrador:</strong> Gerente da empresa com controle total sobre sua empresa,
                incluindo usuários, obras, contratos, orçamentos e todas as funcionalidades.
              </p>
              <p>
                <strong>Financeiro:</strong> Responsável pela gestão financeira da empresa,
                com acesso a compras, contratos, pagamentos e relatórios financeiros.
              </p>
              <p>
                <strong>Colaborador:</strong> Usuário operacional com permissões para trabalhar em obras,
                preencher RDOs, gerenciar tarefas e visualizar informações básicas.
              </p>
              <p>
                <strong>Cliente:</strong> Acesso exclusivo ao Portal do Cliente para acompanhar
                cronograma, orçamento, diário de obra e fluxo de caixa das suas obras.
              </p>
              <p className="pt-2 border-t border-blue-200 mt-3">
                <strong>Nota:</strong> As permissões são controladas automaticamente pelo sistema através
                de políticas RLS no banco de dados, garantindo segurança e isolamento dos dados.
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <Crown size={32} className="mx-auto text-red-600 mb-2" />
            <p className="text-xl font-bold text-red-900">Master</p>
            <p className="text-xs text-red-700 mt-1">Global</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <UserCog size={32} className="mx-auto text-blue-600 mb-2" />
            <p className="text-xl font-bold text-blue-900">Administrador</p>
            <p className="text-xs text-blue-700 mt-1">Gerente</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <DollarSign size={32} className="mx-auto text-green-600 mb-2" />
            <p className="text-xl font-bold text-green-900">Financeiro</p>
            <p className="text-xs text-green-700 mt-1">Compras</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <User size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-xl font-bold text-gray-900">Colaborador</p>
            <p className="text-xs text-gray-700 mt-1">Operacional</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <Shield size={32} className="mx-auto text-yellow-600 mb-2" />
            <p className="text-xl font-bold text-yellow-900">Cliente</p>
            <p className="text-xs text-yellow-700 mt-1">Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
