import { useState, useEffect } from 'react';
import {
  Home, Users as UsersIcon, Building2, Calculator, Truck, ShoppingCart,
  DollarSign, FileCheck, Menu, LogOut, User, Calendar, CalendarClock, LayoutDashboard, FileText, ListTodo, Settings, BarChart3, UserCog, Briefcase, Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { conktColors } from '../styles/colors';
import { supabase } from '../lib/supabase';
import { hasAccess, getRoleName, getRoleColor, type PageKey } from '../utils/accessControl';
import ProfileModal from './ProfileModal';
import ClientsList from './clients/ClientsList';
import WorksList from './works/WorksList';
import SuppliersList from './suppliers/SuppliersList';
import WorkDiaryList from './workDiary/WorkDiaryList';
import ContractsList from './contracts/ContractsList';
import TaskBoard from './tasks/TaskBoard';
import SettingsPage from './SettingsPage';
import BudgetsList from './budgets/BudgetsList';
import SchedulesManager from './schedules/SchedulesManager';
import PurchasesManager from './purchases/PurchasesManager';
import ReportPage from './ReportPage';
import AppropriationManager from './budgets/AppropriationManager';
import DashboardPage from './DashboardPage';
import FinanceManager from './finance/FinanceManager';
import ClientPortalManager from './clientPortal/ClientPortalManager';
import { CompanyCashflow } from './company/CompanyCashflow';
import { CompanyEmployees } from './company/CompanyEmployees';
import { CompanyFilesManager } from './company/CompanyFilesManager';
import MasterPanel from './master/MasterPanel';

type MenuItem = {
  id: PageKey;
  label: string;
  icon: any;
  badge?: string;
};

const allMenuItems: MenuItem[] = [
  { id: 'painel-usuarios', label: 'Painel de Usuários', icon: Shield, badge: 'MASTER' },
  { id: 'inicio', label: 'Início', icon: Home },
  { id: 'clientes', label: 'Clientes', icon: UsersIcon },
  { id: 'obras', label: 'Obras', icon: Building2 },
  { id: 'orcamento', label: 'Orçamentos', icon: Calculator },
  { id: 'fornecedores', label: 'Fornecedores', icon: Truck },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'compras', label: 'Compras', icon: ShoppingCart },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'minha-empresa', label: 'Minha Empresa', icon: Briefcase },
  { id: 'apropriacao', label: 'Apropriação', icon: FileCheck },
  { id: 'tarefas', label: 'Tarefas', icon: ListTodo },
  { id: 'diario-obra', label: 'Diário de obra', icon: Calendar },
  { id: 'cronograma', label: 'Cronograma', icon: CalendarClock },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'relatorios', label: 'Relatório', icon: BarChart3 },
  { id: 'portal-cliente', label: 'Portal do Cliente', icon: UserCog },
  { id: 'configuracao', label: 'Configuração', icon: Settings },
];

export default function Dashboard() {
  const [activeMenu, setActiveMenu] = useState<PageKey>('inicio');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { profile, signOut, user } = useAuth();

  const [appearance, setAppearance] = useState({
    logo_menu: null as string | null,
    logo_inicio: null as string | null,
  });

  const menuItems = allMenuItems.filter(item => hasAccess(profile?.role, item.id));

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 || activeMenu === 'inicio') {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMenu]);

  useEffect(() => {
    loadAppearancePreferences();
  }, [user]);

  const loadAppearancePreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appearance_preferences')
        .select('logo_menu, logo_inicio')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAppearance({
          logo_menu: data.logo_menu || null,
          logo_inicio: data.logo_inicio || null,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar preferências de aparência:', error);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
          }`}
          style={{ backgroundColor: conktColors.sidebar.main }}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 flex items-center justify-center border-b border-white/10 relative">
              {sidebarOpen && (
                <img
                  src={appearance.logo_menu || "/logo_conkt-removebg-preview.png"}
                  alt="Logo"
                  className="h-12 mx-auto object-contain"
                />
              )}

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`hidden lg:block p-2 hover:bg-white/10 rounded-lg ${sidebarOpen ? 'absolute right-4' : ''}`}
                style={{ color: '#ffffff' }}
              >
                <Menu size={20} />
              </button>
            </div>

            {sidebarOpen && (
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProfileModalOpen(true)}
                    className="flex-1 flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-all"
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={`${profile.avatar_url}?t=${Date.now()}`}
                        alt={profile.nome_completo}
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                        key={profile.avatar_url}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: conktColors.primary.cyan }}
                      >
                        <User size={18} />
                      </div>
                    )}
                    <div className="text-left flex-1" style={{ color: '#ffffff' }}>
                      <p className="font-medium text-sm truncate">
                        {profile?.nome_completo || 'Usuário'}
                      </p>
                      <p className="text-xs opacity-70 capitalize">
                        {profile?.role ? getRoleName(profile.role) : profile?.funcao}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={signOut}
                    className="p-2 rounded-lg hover:bg-white/10 transition-all"
                    style={{ color: '#ffffff' }}
                    title="Sair"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              </div>
            )}

            <nav className="flex-1 p-3 overflow-y-auto scrollbar-hide">
              <ul className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeMenu === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveMenu(item.id);
                          if (item.id === 'inicio') {
                            setSidebarOpen(true);
                          } else if (window.innerWidth < 1024) {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                          isActive
                            ? 'bg-white text-gray-900'
                            : 'hover:bg-white/10'
                        }`}
                        style={{ color: isActive ? '#000000' : '#ffffff' }}
                        title={item.label}
                      >
                        <Icon
                          size={18}
                          style={{ color: isActive ? conktColors.primary.blue : '#ffffff' }}
                        />
                        {sidebarOpen && (
                          <>
                            <span className="flex-1 text-left font-medium text-sm">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span
                                className="px-2 py-0.5 text-xs rounded-full font-semibold"
                                style={{
                                  backgroundColor: item.id === 'painel-usuarios' ? '#9333ea' : conktColors.primary.lime,
                                  color: item.id === 'painel-usuarios' ? '#ffffff' : '#000000'
                                }}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="p-3 border-t border-white/10">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all"
                style={{ color: '#ffffff' }}
                title="Sair"
              >
                <LogOut size={18} />
                {sidebarOpen && <span className="font-medium text-sm">Sair</span>}
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && activeMenu !== 'inicio' && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col min-h-screen">
          <header className="bg-white shadow-sm">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-6 sm:gap-8">
                {activeMenu !== 'inicio' && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden text-gray-600 hover:text-gray-900"
                  >
                    <Menu size={24} />
                  </button>
                )}
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800 truncate">
                  {menuItems.find(item => item.id === activeMenu)?.label || 'Dashboard'}
                </h1>
              </div>
            </div>
          </header>

          <div className="flex-1 p-4 sm:p-6">
            <DashboardContent
              activeMenu={activeMenu}
              onNavigateHome={() => {
                setActiveMenu('inicio');
                setSidebarOpen(true);
              }}
              homeImageUrl={appearance.logo_inicio}
            />
          </div>
        </main>
      </div>

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}

function DashboardContent({ activeMenu, onNavigateHome, homeImageUrl }: { activeMenu: PageKey; onNavigateHome: () => void; homeImageUrl: string | null }) {
  if (activeMenu === 'inicio') {
    return <HomeContent homeImageUrl={homeImageUrl} />;
  }

  if (activeMenu === 'painel-usuarios') {
    return <MasterPanel />;
  }

  if (activeMenu === 'clientes') {
    return <ClientsList onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'obras') {
    return <WorksList onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'fornecedores') {
    return <SuppliersList onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'orcamento') {
    return <BudgetsList onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'contratos') {
    return <ContractsList onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'compras') {
    return <PurchasesManager onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'financeiro') {
    return <FinanceManager />;
  }

  if (activeMenu === 'minha-empresa') {
    return <CompanyManager />;
  }

  if (activeMenu === 'apropriacao') {
    return <AppropriationManager />;
  }

  if (activeMenu === 'diario-obra') {
    return <WorkDiaryList onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'cronograma') {
    return <SchedulesManager onNavigateHome={onNavigateHome} />;
  }

  if (activeMenu === 'tarefas') {
    return <TaskBoard />;
  }

  if (activeMenu === 'dashboard') {
    return <DashboardPage />;
  }

  if (activeMenu === 'relatorios') {
    return <ReportPage />;
  }

  if (activeMenu === 'portal-cliente') {
    return <ClientPortalManager />;
  }

  if (activeMenu === 'configuracao') {
    return <SettingsPage onNavigateHome={onNavigateHome} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-8">
      <div className="text-center py-12">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ backgroundColor: conktColors.primary.blue + '20' }}
        >
          <Building2 size={32} style={{ color: conktColors.primary.blue }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Módulo em Desenvolvimento
        </h2>
        <p className="text-gray-600">
          Esta funcionalidade estará disponível em breve
        </p>
      </div>
    </div>
  );
}

function CompanyManager() {
  const [activeTab, setActiveTab] = useState('fluxo-caixa');

  const tabs = [
    { id: 'fluxo-caixa', label: 'Fluxo de Caixa' },
    { id: 'colaboradores', label: 'Colaboradores' },
    { id: 'arquivos', label: 'Arquivos da Empresa' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'fluxo-caixa' && <CompanyCashflow />}
          {activeTab === 'colaboradores' && <CompanyEmployees />}
          {activeTab === 'arquivos' && <CompanyFilesManager />}
        </div>
      </div>
    </div>
  );
}

function HomeContent({ homeImageUrl }: { homeImageUrl: string | null }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
      <div className="text-center">
        <img
          src={homeImageUrl || "/logo_conkt-removebg-preview.png"}
          alt="Logo"
          className="w-[300px] sm:w-[400px] max-w-full mx-auto mb-6 sm:mb-8 object-contain"
        />
        <p className="text-gray-600 text-base sm:text-lg">
          Bem-vindo ao Sistema de Gestão
        </p>
      </div>
    </div>
  );
}
