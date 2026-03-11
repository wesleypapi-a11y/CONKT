import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, FileText, Calendar, Printer, Zap, FileSpreadsheet, Users, CheckCircle, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Budget } from '../../types/budget';
import { useAuth } from '../../contexts/AuthContext';
import BudgetModal from './BudgetModal';
import BudgetEditor from './BudgetEditor';
import { generateBudgetPDF } from '../../utils/budgetPdfGenerator';
import QuickWorkModal from '../works/QuickWorkModal';
import TemplateImportModal from './TemplateImportModal';
import ProspectionsList from './ProspectionsList';
import ApproveBudgetModal from './ApproveBudgetModal';

interface BudgetsListProps {
  onNavigateHome: () => void;
}

export default function BudgetsList({ onNavigateHome }: BudgetsListProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'budgets' | 'prospections'>('budgets');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorReadOnly, setEditorReadOnly] = useState(false);
  const [quickWorkModalOpen, setQuickWorkModalOpen] = useState(false);
  const [templateImportModalOpen, setTemplateImportModalOpen] = useState(false);
  const [approveBudgetModalOpen, setApproveBudgetModalOpen] = useState(false);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>();

  useEffect(() => {
    loadBudgets();
  }, []);

  useEffect(() => {
    filterBudgets();
  }, [searchTerm, budgets]);

  const loadBudgets = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          clients(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBudgets = () => {
    if (!searchTerm.trim()) {
      setFilteredBudgets(budgets);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = budgets.filter(budget =>
      budget.titulo.toLowerCase().includes(term) ||
      budget.numero?.toLowerCase().includes(term) ||
      budget.status.toLowerCase().includes(term)
    );
    setFilteredBudgets(filtered);
  };

  const handleAddBudget = () => {
    setSelectedBudgetId(undefined);
    setModalOpen(true);
  };

  const handleViewBudget = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setEditorReadOnly(true);
    setEditorOpen(true);
  };

  const handleEditBudget = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setEditorReadOnly(false);
    setEditorOpen(true);
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Deseja realmente excluir este orçamento?')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId);

      if (error) throw error;
      await loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Erro: Não foi possível excluir o orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBudget = async (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setApproveBudgetModalOpen(true);
  };

  const handlePrintBudget = async (budgetId: string) => {
    try {
      await generateBudgetPDF(budgetId);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert('Erro: Não foi possível gerar o PDF do orçamento');
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedBudgetId(undefined);
    loadBudgets();
  };

  const handleBudgetCreated = (budgetId: string) => {
    setSelectedBudgetId(budgetId);
    setEditorOpen(true);
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    setSelectedBudgetId(undefined);
    loadBudgets();
  };

  const handleQuickWorkCreated = (workId: string) => {
    setQuickWorkModalOpen(false);
    alert('Obra cadastrada com sucesso! Você pode agora criar um orçamento vinculado a ela.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'bg-gray-100 text-gray-700';
      case 'enviado':
        return 'bg-blue-100 text-blue-700';
      case 'aprovado':
        return 'bg-green-100 text-green-700';
      case 'rejeitado':
        return 'bg-red-100 text-red-700';
      case 'cancelado':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'rascunho':
        return 'Rascunho';
      case 'enviado':
        return 'Enviado';
      case 'aprovado':
        return 'Aprovado';
      case 'rejeitado':
        return 'Rejeitado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 shadow-md"
          style={{ backgroundColor: '#1e40af' }}
        >
          Voltar
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Orçamentos e Prospecção</h2>
        {activeTab === 'budgets' && (
          <div className="relative max-w-md w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar orçamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        )}
        {activeTab === 'prospections' && <div className="w-96"></div>}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('budgets')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'budgets'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={20} />
              Orçamentos
            </div>
          </button>
          <button
            onClick={() => setActiveTab('prospections')}
            className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
              activeTab === 'prospections'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={20} />
              Prospecção
            </div>
          </button>
        </div>
      </div>

      {activeTab === 'budgets' && (
        <>
          <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleAddBudget}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 shadow-md bg-green-500"
        >
          <Plus size={20} />
          Criar Orçamento
        </button>
        <button
          onClick={() => setQuickWorkModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:opacity-90 shadow-md bg-blue-600"
        >
          <Zap size={20} />
          Cadastro de Obra
        </button>
        <button
          onClick={() => setTemplateImportModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90 shadow-md"
          style={{ backgroundColor: '#FCD34D', color: '#1F2937' }}
        >
          <FileSpreadsheet size={20} />
          Importar Template XLS
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-500">Carregando orçamentos...</div>
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={48} className="mx-auto text-gray-900 mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map((budget: any) => (
            <div
              key={budget.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{budget.titulo}</h3>
                  {budget.numero && (
                    <p className="text-sm text-gray-500">Nº {budget.numero}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(budget.status)}`}>
                  {getStatusLabel(budget.status)}
                </span>
              </div>

              {budget.clients?.name && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <FileText size={16} />
                  <span>{budget.clients.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <span className="font-semibold text-base">Valor Total: {formatCurrency(budget.valor_total)}</span>
              </div>

              {budget.validade && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Calendar size={16} />
                  <span>Válido até: {formatDate(budget.validade)}</span>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                {budget.status === 'rascunho' && (
                  <button
                    onClick={() => handleApproveBudget(budget.id)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 transition-colors"
                    title="Aprovar Orçamento"
                  >
                    <CheckCircle size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleViewBudget(budget.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-600 border border-gray-600 hover:bg-gray-50 transition-colors"
                  title="Visualizar"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleEditBudget(budget.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors"
                  title="Editar"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handlePrintBudget(budget.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-yellow-600 border border-yellow-600 hover:bg-yellow-50 transition-colors"
                >
                  <Printer size={16} />
                </button>
                <button
                  onClick={() => handleDeleteBudget(budget.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-red-600 border border-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BudgetModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        budgetId={selectedBudgetId}
        onBudgetCreated={handleBudgetCreated}
      />

      {selectedBudgetId && (
        <BudgetEditor
          isOpen={editorOpen}
          onClose={handleEditorClose}
          budgetId={selectedBudgetId}
          readOnly={editorReadOnly}
        />
      )}

      <QuickWorkModal
        isOpen={quickWorkModalOpen}
        onClose={() => setQuickWorkModalOpen(false)}
        onWorkCreated={handleQuickWorkCreated}
      />

      <TemplateImportModal
        isOpen={templateImportModalOpen}
        onClose={() => setTemplateImportModalOpen(false)}
      />
        </>
      )}

      {activeTab === 'prospections' && (
        <ProspectionsList />
      )}

      {approveBudgetModalOpen && selectedBudgetId && (
        <ApproveBudgetModal
          budgetId={selectedBudgetId}
          onClose={() => {
            setApproveBudgetModalOpen(false);
            setSelectedBudgetId(undefined);
          }}
          onSuccess={loadBudgets}
        />
      )}
    </div>
  );
}
