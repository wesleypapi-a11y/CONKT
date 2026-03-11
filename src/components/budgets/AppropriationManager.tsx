import { useState, useEffect } from 'react';
import { X, Eye, Edit2, RefreshCw } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';

interface Work {
  id: string;
  name: string;
}

interface BudgetItem {
  id: string;
  display_number: string;
  descricao: string;
  tipo: 'fase' | 'subfase' | 'item';
  etapa: string;
  quantidade: number;
  valor_unitario: number;
  total_price: number;
  parent_id: string | null;
  phase_id: string | null;
  subphase_id: string | null;
  phase: string;
  subphase: string;
}

interface PurchaseDetail {
  id: string;
  purchase_order_id: string;
  order_number: string;
  order_date: string;
  supplier_name: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  phase_display: string;
  subphase_display: string;
  phase_id: string;
  subphase_id: string;
}

interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  purchases: PurchaseDetail[];
  loading: boolean;
  onReallocation: (purchaseId: string) => void;
  onBulkReallocation: (purchaseIds: string[]) => void;
}

function PurchaseDetailModal({ isOpen, onClose, title, purchases, loading, onReallocation, onBulkReallocation }: PurchaseDetailModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const totalValue = purchases.reduce((sum, p) => sum + p.total_price, 0);
  const selectedValue = purchases
    .filter(p => selectedIds.has(p.id))
    .reduce((sum, p) => sum + p.total_price, 0);

  const toggleSelectAll = () => {
    if (selectedIds.size === purchases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(purchases.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkReallocation = () => {
    if (selectedIds.size === 0) return;
    onBulkReallocation(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ backgroundColor: conktColors.primary.blue }}>
          <div>
            <h3 className="text-xl font-bold text-white">Detalhamento de Compras</h3>
            <p className="text-sm text-white text-opacity-90 mt-1">{title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: conktColors.primary.blue }} />
              <span className="ml-3 text-gray-600">Carregando compras...</span>
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">Nenhuma compra alocada neste centro de custo</p>
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-3">
                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-green-900">Total Realizado:</span>
                    <span className="text-2xl font-bold text-green-900">
                      {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-green-700">
                    {purchases.length} {purchases.length === 1 ? 'item encontrado' : 'itens encontrados'}
                  </div>
                </div>

                {selectedIds.size > 0 && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-blue-900">
                          {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
                        </span>
                        <div className="text-xs text-blue-700 mt-1">
                          Total: {selectedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                      <button
                        onClick={handleBulkReallocation}
                        className="px-4 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                        style={{ backgroundColor: conktColors.primary.blue }}
                      >
                        <Edit2 className="w-4 h-4" />
                        Realocar Selecionados
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b-2" style={{ borderColor: conktColors.primary.blue }}>
                      <th className="px-3 py-3 text-center font-bold text-gray-700 w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === purchases.length && purchases.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          style={{ accentColor: conktColors.primary.blue }}
                        />
                      </th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Pedido</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Data</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Fornecedor</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Item</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Qtd</th>
                      <th className="px-3 py-3 text-right font-bold text-gray-700">Vl. Unit.</th>
                      <th className="px-3 py-3 text-right font-bold text-gray-700">Total</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Centro de Custo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {purchases.map((purchase, index) => (
                      <tr
                        key={purchase.id}
                        className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(purchase.id)}
                            onChange={() => toggleSelect(purchase.id)}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                            style={{ accentColor: conktColors.primary.blue }}
                          />
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900">{purchase.order_number}</td>
                        <td className="px-3 py-3 text-gray-700">
                          {purchase.order_date ? new Date(purchase.order_date).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-3 text-gray-700">{purchase.supplier_name}</td>
                        <td className="px-3 py-3 text-gray-700">{purchase.item_name}</td>
                        <td className="px-3 py-3 text-center text-gray-700">
                          {purchase.quantity} {purchase.unit}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700">
                          {purchase.unit_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900">
                          {purchase.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          <div>{purchase.phase_display}</div>
                          <div className="text-gray-500">{purchase.subphase_display}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => onReallocation(purchase.id)}
                              className="p-1.5 rounded hover:bg-blue-100 transition-colors"
                              title="Realocar centro de custo"
                              style={{ color: conktColors.primary.blue }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: conktColors.primary.blue }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseRealizedId: string;
  currentPhaseId: string;
  currentSubphaseId: string;
  workId: string;
  onSuccess: () => void;
}

function ReallocationModal({ isOpen, onClose, purchaseRealizedId, currentPhaseId, currentSubphaseId, workId, onSuccess }: ReallocationModalProps) {
  const { showAlert } = useAlert();
  const [phases, setPhases] = useState<{ id: string; display_number: string; descricao: string }[]>([]);
  const [subphases, setSubphases] = useState<{ id: string; display_number: string; descricao: string }[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState(currentPhaseId);
  const [selectedSubphaseId, setSelectedSubphaseId] = useState(currentSubphaseId);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPhases();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPhaseId) {
      setSelectedSubphaseId('');
      setSubphases([]);
      loadSubphases(selectedPhaseId);
    }
  }, [selectedPhaseId]);

  const loadPhases = async () => {
    try {
      console.log('🔍 Buscando orçamento para work_id:', workId);

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      console.log('📊 Orçamento encontrado:', budget, 'erro:', budgetError);

      if (!budget) {
        console.warn('⚠️ Nenhum orçamento encontrado para work_id:', workId);
        return;
      }

      const { data, error } = await supabase
        .from('budget_items')
        .select('id, orcamento, descricao, tipo, parent_id')
        .eq('budget_id', budget.id)
        .eq('tipo', 'macro')
        .is('parent_id', null)
        .order('ordem');

      console.log('📋 Fases carregadas:', data?.length, 'itens', 'erro:', error);
      console.log('📋 Dados das fases:', data);

      setPhases((data || []).map(item => ({
        id: item.id,
        display_number: item.orcamento || '',
        descricao: item.descricao
      })));
    } catch (error) {
      console.error('❌ Erro ao carregar fases:', error);
    }
  };

  const loadSubphases = async (phaseId: string) => {
    try {
      const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      if (!budget) return;

      const { data } = await supabase
        .from('budget_items')
        .select('id, orcamento, descricao, tipo')
        .eq('budget_id', budget.id)
        .eq('parent_id', phaseId)
        .in('tipo', ['macro', 'item'])
        .order('ordem');

      console.log('🔧 Subfases carregadas para fase:', phaseId, 'resultados:', data?.length);

      setSubphases((data || []).map(item => ({
        id: item.id,
        display_number: item.orcamento || '',
        descricao: item.descricao
      })));
    } catch (error) {
      console.error('Erro ao carregar subfases:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedPhaseId) {
      showAlert('Selecione pelo menos uma fase', 'warning');
      return;
    }

    if (selectedPhaseId === currentPhaseId && selectedSubphaseId === currentSubphaseId) {
      showAlert('Selecione um centro de custo diferente', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budget_realized')
        .update({
          phase_id: selectedPhaseId,
          subphase_id: selectedSubphaseId || null,
        })
        .eq('id', purchaseRealizedId);

      if (error) throw error;

      showAlert('Item realocado com sucesso!', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao realocar item:', error);
      showAlert('Erro ao realocar item', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: conktColors.primary.blue }}>
            Realocar Centro de Custo
          </h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Fase *
              </label>
              <select
                value={selectedPhaseId}
                onChange={(e) => {
                  setSelectedPhaseId(e.target.value);
                  setSelectedSubphaseId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: conktColors.primary.blue }}
              >
                <option value="">Selecione a fase</option>
                {phases.map(phase => (
                  <option key={phase.id} value={phase.id}>
                    {phase.display_number} - {phase.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Subfase
              </label>
              <select
                value={selectedSubphaseId || ''}
                onChange={(e) => setSelectedSubphaseId(e.target.value)}
                disabled={!selectedPhaseId || subphases.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ focusRingColor: conktColors.primary.blue }}
              >
                <option value="">
                  {!selectedPhaseId
                    ? 'Selecione uma fase primeiro'
                    : subphases.length === 0
                    ? 'Nenhuma subfase disponível'
                    : 'Selecione a subfase'}
                </option>
                {subphases.map(subphase => (
                  <option key={subphase.id} value={subphase.id}>
                    {subphase.display_number} - {subphase.descricao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedPhaseId || loading}
              className="px-4 py-2 rounded-md text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: selectedPhaseId && !loading
                  ? conktColors.primary.blue
                  : undefined
              }}
            >
              {loading ? 'Salvando...' : 'Realocar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BulkReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseRealizedIds: string[];
  workId: string;
  onSuccess: () => void;
}

function BulkReallocationModal({ isOpen, onClose, purchaseRealizedIds, workId, onSuccess }: BulkReallocationModalProps) {
  const { showAlert } = useAlert();
  const [phases, setPhases] = useState<{ id: string; display_number: string; descricao: string }[]>([]);
  const [subphases, setSubphases] = useState<{ id: string; display_number: string; descricao: string }[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [selectedSubphaseId, setSelectedSubphaseId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPhaseId('');
      setSelectedSubphaseId('');
      setPhases([]);
      setSubphases([]);
      loadPhases();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPhaseId) {
      setSelectedSubphaseId('');
      setSubphases([]);
      loadSubphases(selectedPhaseId);
    }
  }, [selectedPhaseId]);

  const loadPhases = async () => {
    try {
      const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      if (!budget) return;

      const { data } = await supabase
        .from('budget_items')
        .select('id, orcamento, descricao')
        .eq('budget_id', budget.id)
        .eq('tipo', 'macro')
        .is('parent_id', null)
        .order('ordem');

      setPhases((data || []).map(item => ({
        id: item.id,
        display_number: item.orcamento || '',
        descricao: item.descricao
      })));
    } catch (error) {
      console.error('Erro ao carregar fases:', error);
    }
  };

  const loadSubphases = async (phaseId: string) => {
    try {
      const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      if (!budget) return;

      const { data } = await supabase
        .from('budget_items')
        .select('id, orcamento, descricao')
        .eq('budget_id', budget.id)
        .eq('parent_id', phaseId)
        .in('tipo', ['macro', 'item'])
        .order('ordem');

      setSubphases((data || []).map(item => ({
        id: item.id,
        display_number: item.orcamento || '',
        descricao: item.descricao
      })));
    } catch (error) {
      console.error('Erro ao carregar subfases:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedPhaseId) {
      showAlert('Selecione pelo menos uma fase', 'warning');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('budget_realized')
        .update({
          phase_id: selectedPhaseId,
          subphase_id: selectedSubphaseId || null,
        })
        .in('id', purchaseRealizedIds);

      if (error) throw error;

      showAlert(`${purchaseRealizedIds.length} ${purchaseRealizedIds.length === 1 ? 'item realocado' : 'itens realocados'} com sucesso!`, 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao realocar itens:', error);
      showAlert('Erro ao realocar itens', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-4" style={{ color: conktColors.primary.blue }}>
            Realocar {purchaseRealizedIds.length} {purchaseRealizedIds.length === 1 ? 'Item' : 'Itens'}
          </h3>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Fase *
              </label>
              <select
                value={selectedPhaseId}
                onChange={(e) => {
                  setSelectedPhaseId(e.target.value);
                  setSelectedSubphaseId('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
                style={{ focusRingColor: conktColors.primary.blue }}
              >
                <option value="">Selecione a fase</option>
                {phases.map(phase => (
                  <option key={phase.id} value={phase.id}>
                    {phase.display_number} - {phase.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Subfase
              </label>
              <select
                value={selectedSubphaseId || ''}
                onChange={(e) => setSelectedSubphaseId(e.target.value)}
                disabled={!selectedPhaseId || subphases.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{ focusRingColor: conktColors.primary.blue }}
              >
                <option value="">
                  {!selectedPhaseId
                    ? 'Selecione uma fase primeiro'
                    : subphases.length === 0
                    ? 'Nenhuma subfase disponível'
                    : 'Selecione a subfase'}
                </option>
                {subphases.map(subphase => (
                  <option key={subphase.id} value={subphase.id}>
                    {subphase.display_number} - {subphase.descricao}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedPhaseId || loading}
              className="px-4 py-2 rounded-md text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                backgroundColor: selectedPhaseId && !loading
                  ? conktColors.primary.blue
                  : undefined
              }}
            >
              {loading ? 'Salvando...' : 'Realocar Todos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppropriationManager() {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [works, setWorks] = useState<Work[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState('');
  const [loading, setLoading] = useState(false);

  const [budgetInfo, setBudgetInfo] = useState({
    titulo: '',
    areas: [] as { nome: string; area: number }[],
  });

  const [items, setItems] = useState<BudgetItem[]>([]);
  const [realizedValues, setRealizedValues] = useState<{ [key: string]: number }>({});

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailPurchases, setDetailPurchases] = useState<PurchaseDetail[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reallocationModalOpen, setReallocationModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [selectedPhaseId, setSelectedPhaseId] = useState('');
  const [selectedSubphaseId, setSelectedSubphaseId] = useState('');

  const [bulkReallocationModalOpen, setBulkReallocationModalOpen] = useState(false);
  const [bulkReallocationIds, setBulkReallocationIds] = useState<string[]>([]);

  useEffect(() => {
    loadWorks();
  }, []);

  useEffect(() => {
    if (selectedWorkId) {
      loadBudgetData();
    }
  }, [selectedWorkId]);

  const loadWorks = async () => {
    try {
      const { data: budgets } = await supabase
        .from('budgets')
        .select('work_id');

      const workIds = [...new Set(budgets?.map(b => b.work_id) || [])];

      if (workIds.length === 0) {
        setWorks([]);
        return;
      }

      const { data, error } = await supabase
        .from('works')
        .select('id, name')
        .in('id', workIds)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
      showAlert('Erro ao carregar obras', 'error');
    }
  };

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      const { data: budget } = await supabase
        .from('budgets')
        .select('*')
        .eq('work_id', selectedWorkId)
        .maybeSingle();

      if (!budget) {
        showAlert('Esta obra não possui orçamento', 'warning');
        setLoading(false);
        return;
      }

      const areasData = Array.isArray(budget.areas) && budget.areas.length > 0
        ? budget.areas
        : [];

      setBudgetInfo({
        titulo: budget.titulo || '',
        areas: areasData,
      });

      const { data: budgetItems } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budget.id)
        .order('ordem');

      const mappedItems: BudgetItem[] = (budgetItems || []).map(item => {
        let tipo: 'fase' | 'subfase' | 'item' = 'item';

        // No banco a coluna se chama 'orcamento', não 'display_number'
        const displayNumber = item.orcamento || item.display_number || '';

        // Determinar o tipo baseado nas propriedades do item
        if (item.tipo === 'macro') {
          // Usar o número como critério adicional
          // Formato: "1" = FASE, "1.1" = SUBFASE
          const hasDecimal = displayNumber && displayNumber.includes('.');

          if (!item.parent_id && !hasDecimal) {
            // É uma FASE (sem parent_id e sem ponto no número)
            tipo = 'fase';
          } else if (item.parent_id || hasDecimal) {
            // É uma SUBFASE (tem parent_id OU tem ponto no número)
            tipo = 'subfase';
          } else {
            // Fallback para FASE
            tipo = 'fase';
          }
        } else {
          // Se não é macro, é um ITEM
          tipo = 'item';
        }

        const mappedItem = {
          id: item.id,
          display_number: displayNumber,
          descricao: item.descricao || '',
          tipo: tipo,
          etapa: item.etapa || 'CINZA',
          quantidade: item.quantidade || 0,
          valor_unitario: item.valor_unitario || 0,
          total_price: item.valor_total || 0,
          parent_id: item.parent_id,
          phase_id: item.phase_id,
          subphase_id: item.subphase_id,
          phase: item.phase || '',
          subphase: item.subphase || '',
        };

        // Debug para ver o mapeamento
        if (item.tipo === 'macro') {
          console.log('Mapeando macro:', {
            orcamento: item.orcamento,
            display_number: displayNumber,
            descricao: item.descricao,
            tipo_original: item.tipo,
            parent_id: item.parent_id,
            hasDecimal: displayNumber?.includes('.'),
            tipo_mapeado: tipo
          });
        }

        return mappedItem;
      });

      setItems(mappedItems);

      await loadRealizedValues(budget.id, mappedItems);
    } catch (error) {
      console.error('Erro ao carregar dados do orçamento:', error);
      showAlert('Erro ao carregar dados do orçamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadRealizedValues = async (budgetId: string, budgetItems: BudgetItem[]) => {
    try {
      const { data: realizedData } = await supabase
        .from('budget_realized')
        .select('phase_id, subphase_id, amount')
        .eq('budget_id', budgetId)
        .is('deleted_at', null);

      const realizedMap: { [key: string]: number } = {};

      for (const entry of realizedData || []) {
        const key = entry.subphase_id || entry.phase_id;
        if (key) {
          realizedMap[key] = (realizedMap[key] || 0) + (entry.amount || 0);
        }
      }

      setRealizedValues(realizedMap);
    } catch (error) {
      console.error('Erro ao carregar valores realizados:', error);
    }
  };

  const handleRowClick = async (item: BudgetItem) => {
    setDetailLoading(true);
    setDetailModalOpen(true);
    setDetailTitle(item.display_number + ' - ' + item.descricao);
    setDetailPurchases([]);

    try {
      const { data: budget } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', selectedWorkId)
        .maybeSingle();

      if (!budget) return;

      let realizedData;
      if (item.tipo === 'fase') {
        // REGRA: Quando clicar na FASE, buscar TODOS os lançamentos onde phase_id = faseSelecionada
        // Independente da subfase
        const { data, error } = await supabase
          .from('budget_realized')
          .select('*')
          .eq('budget_id', budget.id)
          .eq('phase_id', item.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        console.log('🔍 Buscando FASE:', {
          budget_id: budget.id,
          phase_id: item.id,
          fase_descricao: item.descricao,
          resultados: data?.length || 0,
          error
        });

        realizedData = data;
      } else if (item.tipo === 'subfase') {
        // REGRA: Quando clicar na SUBFASE, buscar onde phase_id = fase pai E subphase_id = subfaseSelecionada
        const { data, error } = await supabase
          .from('budget_realized')
          .select('*')
          .eq('budget_id', budget.id)
          .eq('phase_id', item.parent_id)
          .eq('subphase_id', item.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        console.log('🔍 Buscando SUBFASE:', {
          budget_id: budget.id,
          phase_id: item.parent_id,
          subphase_id: item.id,
          subfase_descricao: item.descricao,
          resultados: data?.length || 0,
          error
        });

        realizedData = data;
      } else if (item.tipo === 'item') {
        // REGRA: Para ITEM específico, buscar onde phase_id E subphase_id correspondem
        const { data, error } = await supabase
          .from('budget_realized')
          .select('*')
          .eq('budget_id', budget.id)
          .eq('phase_id', item.parent_id)
          .eq('subphase_id', item.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        console.log('🔍 Buscando ITEM:', {
          budget_id: budget.id,
          phase_id: item.parent_id,
          subphase_id: item.id,
          item_descricao: item.descricao,
          resultados: data?.length || 0,
          error
        });

        realizedData = data;
      }

      const purchasesWithDetails = await Promise.all(
        (realizedData || []).map(async (realized) => {
          const { data: phaseData } = await supabase
            .from('budget_items')
            .select('orcamento, descricao')
            .eq('id', realized.phase_id)
            .maybeSingle();

          const { data: subphaseData } = await supabase
            .from('budget_items')
            .select('orcamento, descricao')
            .eq('id', realized.subphase_id)
            .maybeSingle();

          const { data: order } = await supabase
            .from('purchase_orders')
            .select('order_number, created_at, supplier_id')
            .eq('id', realized.purchase_order_id)
            .maybeSingle();

          let supplier_name = 'N/A';
          if (order?.supplier_id) {
            const { data: supplier } = await supabase
              .from('suppliers')
              .select('fantasy_name, name')
              .eq('id', order.supplier_id)
              .maybeSingle();
            supplier_name = supplier?.fantasy_name || supplier?.name || 'N/A';
          }

          const { data: orderItem } = await supabase
            .from('purchase_order_items')
            .select('item_name, quantity, unit, unit_price, total_price')
            .eq('id', realized.purchase_order_item_id)
            .maybeSingle();

          return {
            id: realized.id,
            purchase_order_id: realized.purchase_order_id,
            order_number: order?.order_number || 'N/A',
            order_date: order?.created_at || '',
            supplier_name,
            item_name: orderItem?.item_name || realized.description || 'N/A',
            quantity: orderItem?.quantity || 0,
            unit: orderItem?.unit || 'UN',
            unit_price: orderItem?.unit_price || 0,
            total_price: realized.amount || 0,
            phase_display: phaseData ? `${phaseData.orcamento || ''} ${phaseData.descricao}`.trim() : 'N/A',
            subphase_display: subphaseData ? `${subphaseData.orcamento || ''} ${subphaseData.descricao}`.trim() : 'N/A',
            phase_id: realized.phase_id,
            subphase_id: realized.subphase_id,
          };
        })
      );

      setDetailPurchases(purchasesWithDetails);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      showAlert('Erro ao carregar detalhes de compras', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReallocation = (purchaseRealizedId: string) => {
    const purchase = detailPurchases.find(p => p.id === purchaseRealizedId);
    if (!purchase) return;

    setSelectedPurchaseId(purchaseRealizedId);
    setSelectedPhaseId(purchase.phase_id);
    setSelectedSubphaseId(purchase.subphase_id);
    setReallocationModalOpen(true);
  };

  const handleBulkReallocation = (purchaseRealizedIds: string[]) => {
    setBulkReallocationIds(purchaseRealizedIds);
    setBulkReallocationModalOpen(true);
  };

  const handleReallocationSuccess = async () => {
    await loadBudgetData();
    setDetailModalOpen(false);
    showAlert('Centro de custo realocado! Valores atualizados no orçamento.', 'success');
  };

  const handleBulkReallocationSuccess = async () => {
    await loadBudgetData();
    setDetailModalOpen(false);
    setBulkReallocationModalOpen(false);
    showAlert('Centros de custo realocados! Valores atualizados no orçamento.', 'success');
  };

  const calculateMacroTotal = (index: number): number => {
    const macroItem = items[index];
    if (!macroItem || macroItem.tipo !== 'fase') return 0;

    let total = 0;
    for (let i = index + 1; i < items.length; i++) {
      const currentItem = items[i];
      if (currentItem.tipo === 'fase') break;
      if (currentItem.tipo === 'item') {
        total += currentItem.total_price || 0;
      }
    }
    return total;
  };

  const calculateGrandTotal = (): number => {
    return items
      .filter(item => item.tipo === 'item')
      .reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const calculateTotalByEtapa = (etapa: string): number => {
    let total = 0;
    items.forEach((item, index) => {
      const itemEtapa = (item.etapa || '').trim().toUpperCase();
      const targetEtapa = etapa.trim().toUpperCase();

      if (itemEtapa === targetEtapa) {
        if (item.tipo === 'fase') {
          total += calculateMacroTotal(index);
        } else if (item.tipo === 'item' && !item.parent_id) {
          total += item.total_price || 0;
        }
      }
    });
    return total;
  };

  const getEtapaTotals = () => {
    const totals: { [key: string]: { total: number; realizado: number } } = {};

    items.forEach((item, index) => {
      const etapa = item.etapa;
      if (!totals[etapa]) {
        totals[etapa] = { total: 0, realizado: 0 };
      }

      if (item.tipo === 'fase') {
        totals[etapa].total += calculateMacroTotal(index);
        if (item.id) {
          totals[etapa].realizado += realizedValues[item.id] || 0;
        }
      } else if (item.tipo === 'subfase') {
        if (item.id) {
          totals[etapa].realizado += realizedValues[item.id] || 0;
        }
      } else if (item.tipo === 'item') {
        if (!item.parent_id) {
          totals[etapa].total += item.total_price || 0;
        }
        if (item.id) {
          totals[etapa].realizado += realizedValues[item.id] || 0;
        }
      }
    });

    return totals;
  };

  const calculateRealizedByEtapa = (etapa: string) => {
    const totals = getEtapaTotals();
    return totals[etapa]?.realizado || 0;
  };

  const calculateTotalRealized = () => {
    const totals = getEtapaTotals();
    return Object.values(totals).reduce((sum, item) => sum + item.realizado, 0);
  };

  const calculateTotalArea = (): number => {
    return budgetInfo.areas.reduce((sum, area) => sum + (area.area || 0), 0);
  };

  const formatCurrency = (value: number) => {
    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: conktColors.primary.blue }}>
            Apropriação - Espelho do Orçamento
          </h2>
          {selectedWorkId && (
            <button
              onClick={loadBudgetData}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione a Obra
          </label>
          <select
            value={selectedWorkId}
            onChange={(e) => setSelectedWorkId(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            style={{ focusRingColor: conktColors.primary.blue }}
          >
            <option value="">Selecione uma obra...</option>
            {works.map(work => (
              <option key={work.id} value={work.id}>
                {work.name}
              </option>
            ))}
          </select>
        </div>

        {selectedWorkId && !loading && (
          <>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
              <h3 className="text-sm font-bold text-blue-700 uppercase mb-4">Resumo do Orçamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Total CINZA</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotalByEtapa('CINZA'))}</div>
                  {calculateTotalArea() > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-xs font-semibold text-gray-500 mb-1">CUSTO POR M²</div>
                      <div className="text-lg font-bold text-gray-700">{formatCurrency(calculateTotalByEtapa('CINZA') / calculateTotalArea())}</div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-semibold text-gray-500 mb-1">REALIZADO</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(calculateRealizedByEtapa('CINZA'))}</div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-600 mb-2">Total ACABAMENTO</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(calculateTotalByEtapa('ACABAMENTO'))}</div>
                  {calculateTotalArea() > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300">
                      <div className="text-xs font-semibold text-gray-500 mb-1">CUSTO POR M²</div>
                      <div className="text-lg font-bold text-gray-700">{formatCurrency(calculateTotalByEtapa('ACABAMENTO') / calculateTotalArea())}</div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-semibold text-gray-500 mb-1">REALIZADO</div>
                    <div className="text-lg font-bold text-green-600">{formatCurrency(calculateRealizedByEtapa('ACABAMENTO'))}</div>
                  </div>
                </div>

                <div className="bg-green-500 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-900 mb-2">TOTAL DA OBRA</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(calculateGrandTotal())}</div>
                  {calculateTotalArea() > 0 && (
                    <div className="mt-3 pt-3 border-t border-white border-opacity-30">
                      <div className="text-xs font-semibold text-gray-900 text-opacity-90 mb-1">CUSTO POR M²</div>
                      <div className="text-lg font-bold text-gray-900">{formatCurrency(calculateGrandTotal() / calculateTotalArea())}</div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-white border-opacity-30">
                    <div className="text-xs font-semibold text-gray-900 text-opacity-90 mb-1">REALIZADO TOTAL</div>
                    <div className="text-lg font-bold text-gray-900">{formatCurrency(calculateTotalRealized())}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Itens do Orçamento</h3>
              <p className="text-sm text-gray-600">
                Clique no botão <Eye className="w-3 h-3 inline" /> para visualizar as compras alocadas em cada item
              </p>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-bold text-gray-700 uppercase" style={{minWidth: '400px'}}>
                      Descrição
                    </th>
                    <th className="px-2 py-3 text-right text-xs font-bold text-gray-700 uppercase" style={{width: '140px'}}>
                      Total
                    </th>
                    <th className="px-2 py-3 text-right text-xs font-bold text-gray-700 uppercase" style={{width: '140px'}}>
                      Realizado
                    </th>
                    <th className="px-2 py-3 text-right text-xs font-bold text-gray-700 uppercase" style={{width: '140px'}}>
                      Saldo
                    </th>
                    <th className="px-2 py-3 text-center text-xs font-bold text-gray-700 uppercase" style={{width: '100px'}}>
                      Compras
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => {
                    const totalValue = item.tipo === 'fase' ? calculateMacroTotal(index) : item.total_price || 0;
                    const realizedValue = realizedValues[item.id] || 0;
                    const saldoValue = totalValue - realizedValue;
                    const saldoPositive = saldoValue >= 0;

                    return (
                      <tr
                        key={item.id}
                        className={`
                          ${item.tipo === 'fase' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-l-4 border-l-yellow-500 font-bold' :
                            item.tipo === 'subfase' ? 'bg-blue-50 border-l-4 border-l-blue-400' :
                            'hover:bg-gray-50 bg-white'}
                          transition-colors
                        `}
                      >
                        <td className={`px-2 py-2 ${
                          item.tipo === 'fase'
                            ? 'font-bold text-sm text-yellow-900'
                            : item.tipo === 'subfase'
                            ? 'font-semibold text-sm text-blue-900'
                            : 'text-xs text-gray-900'
                        }`}>
                          {item.tipo === 'fase' ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-yellow-700 font-bold text-xs uppercase">FASE {item.display_number}</span>
                              <span>-</span>
                              <span>{item.descricao}</span>
                            </span>
                          ) : item.tipo === 'subfase' ? (
                            <span className="inline-flex items-center gap-2">
                              <span className="text-blue-700 font-bold text-xs uppercase">SUBFASE {item.display_number}</span>
                              <span>-</span>
                              <span>{item.descricao}</span>
                            </span>
                          ) : (
                            item.descricao
                          )}
                        </td>
                        <td className="px-2 py-2 text-sm font-semibold text-right text-gray-900">
                          {formatCurrency(totalValue)}
                        </td>
                        <td className="px-2 py-2 text-sm font-semibold text-right text-blue-700">
                          {formatCurrency(realizedValue)}
                        </td>
                        <td className={`px-2 py-2 text-sm font-bold text-right ${saldoPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(saldoValue)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowClick(item);
                            }}
                            className="p-1.5 rounded hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                            title="Ver compras alocadas"
                            style={{ color: conktColors.primary.blue }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ color: conktColors.primary.blue }} />
            <span className="ml-3 text-gray-600">Carregando dados do orçamento...</span>
          </div>
        )}

        {!selectedWorkId && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Selecione uma obra para visualizar a apropriação</p>
          </div>
        )}
      </div>

      <PurchaseDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={detailTitle}
        purchases={detailPurchases}
        loading={detailLoading}
        onReallocation={handleReallocation}
        onBulkReallocation={handleBulkReallocation}
      />

      <ReallocationModal
        isOpen={reallocationModalOpen}
        onClose={() => setReallocationModalOpen(false)}
        purchaseRealizedId={selectedPurchaseId}
        currentPhaseId={selectedPhaseId}
        currentSubphaseId={selectedSubphaseId}
        workId={selectedWorkId}
        onSuccess={handleReallocationSuccess}
      />

      <BulkReallocationModal
        isOpen={bulkReallocationModalOpen}
        onClose={() => setBulkReallocationModalOpen(false)}
        purchaseRealizedIds={bulkReallocationIds}
        workId={selectedWorkId}
        onSuccess={handleBulkReallocationSuccess}
      />
    </div>
  );
}
