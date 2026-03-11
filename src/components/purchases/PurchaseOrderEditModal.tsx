import { useState, useEffect } from 'react';
import { XCircle, Plus, Trash2, Save, Edit, FileText } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { PurchaseOrder } from '../../types/purchase';
import { updateBudgetRealizedFromOrder } from '../../utils/budgetRealized';
import { generatePurchaseOrderPDF } from '../../utils/purchaseOrderPdfGenerator';
import { useAuth } from '../../contexts/AuthContext';

interface OrderItem {
  id: string;
  db_id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  phase_id?: string;
  subphase_id?: string;
}

interface ExtendedPurchaseOrder extends PurchaseOrder {
  supplier_name?: string;
  work_name?: string;
  work_id?: string;
  request_id?: string;
}

interface Work {
  id: string;
  name: string;
  client_id: string;
  work_address: string;
  work_number: string;
  work_neighborhood: string;
  work_city: string;
  work_state: string;
  work_zip_code: string;
}

interface Client {
  id: string;
  name: string;
  cpf_cnpj: string;
  phone: string;
  email: string;
}

interface Supplier {
  id: string;
  name: string;
  fantasy_name: string | null;
  document: string | null;
  phone: string | null;
}

interface BudgetItem {
  id: string;
  descricao: string;
  parent_id: string | null;
  ordem?: number;
}

interface PurchaseOrderEditModalProps {
  order: ExtendedPurchaseOrder | null;
  onClose: () => void;
  onSave: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export default function PurchaseOrderEditModal({
  order,
  onClose,
  onSave,
  onError,
  onSuccess
}: PurchaseOrderEditModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [allWorks, setAllWorks] = useState<Work[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [phases, setPhases] = useState<BudgetItem[]>([]);
  const [subphases, setSubphases] = useState<BudgetItem[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [currentWork, setCurrentWork] = useState<Work | null>(null);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    work_id: '',
    supplier_id: '',
    phase_id: '',
    subphase_id: '',
    payment_conditions: '',
    freight_value: 0,
    discount_value: 0,
    notes: ''
  });

  useEffect(() => {
    if (order) {
      loadInitialData();
    }
  }, [order]);

  useEffect(() => {
    if (formData.supplier_id && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      setCurrentSupplier(supplier || null);
    }
  }, [formData.supplier_id, suppliers]);

  const loadInitialData = async () => {
    if (!order) return;

    try {
      // Primeiro, definir o formData IMEDIATAMENTE para garantir que o select tenha o valor
      setFormData({
        work_id: order.work_id || '',
        supplier_id: order.supplier_id || '',
        phase_id: order.phase_id || '',
        subphase_id: order.subphase_id || '',
        payment_conditions: order.payment_conditions || '',
        freight_value: order.freight_value || 0,
        discount_value: order.discount_value || 0,
        notes: order.notes || ''
      });

      await Promise.all([
        loadClients(),
        loadAllWorks(),
        loadSuppliers(),
        loadBudgetItems(order.work_id, order.phase_id, order.subphase_id),
        loadWorkAndClient(order.work_id)
      ]);

      // Carregar obras do cliente se tivermos um work_id
      if (order.work_id) {
        const { data: workData } = await supabase
          .from('works')
          .select('client_id')
          .eq('id', order.work_id)
          .maybeSingle();

        if (workData?.client_id) {
          setSelectedClientId(workData.client_id);
          await loadWorksByClient(workData.client_id);
        }
      }

      const { data: orderItems, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('order_id', order.id)
        .is('deleted_at', null);

      if (itemsError) {
        console.error('Erro ao carregar itens:', itemsError);
        onError('Erro ao carregar itens do pedido');
        return;
      }

      setItems((orderItems || []).map((item: any) => ({
        id: item.id,
        db_id: item.id,
        description: item.item_name || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'UN',
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        phase_id: item.phase_id || '',
        subphase_id: item.subphase_id || ''
      })));
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    }
  };

  const loadWorkAndClient = async (workId: string | undefined) => {
    if (!workId) return;

    try {
      const { data: workData, error: workError } = await supabase
        .from('works')
        .select('id, name, client_id, work_address, work_number, work_neighborhood, work_city, work_state, work_zip_code')
        .eq('id', workId)
        .maybeSingle();

      if (workError) throw workError;

      if (workData) {
        setCurrentWork(workData);

        if (workData.client_id) {
          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, name, cpf_cnpj, phone, email')
            .eq('id', workData.client_id)
            .maybeSingle();

          if (clientError) throw clientError;
          setCurrentClient(clientData);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar obra e cliente:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadAllWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setAllWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadWorksByClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('client_id', clientId)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras do cliente:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, fantasy_name, document, phone')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadBudgetItems = async (workId: string | undefined, phaseId?: string, subphaseId?: string) => {
    if (!workId) {
      setPhases([]);
      setSubphases([]);
      return;
    }

    try {
      // Se já temos IDs de fase/subfase (vindo do contrato), carregar diretamente
      if (phaseId || subphaseId) {
        const idsToLoad = [phaseId, subphaseId].filter(Boolean) as string[];

        const { data: itemsData } = await supabase
          .from('budget_items')
          .select('*')
          .in('id', idsToLoad);

        if (itemsData && itemsData.length > 0) {
          const phaseItem = itemsData.find(item => item.id === phaseId);
          const subphaseItem = itemsData.find(item => item.id === subphaseId);

          if (phaseItem) setPhases([phaseItem]);
          if (subphaseItem) setSubphases([subphaseItem]);

          // Carregar também os outros itens do orçamento para permitir alteração
          if (phaseItem?.budget_id) {
            const { data: allBudgetItems } = await supabase
              .from('budget_items')
              .select('*')
              .eq('budget_id', phaseItem.budget_id)
              .order('ordem');

            if (allBudgetItems) {
              const allPhases = allBudgetItems.filter(item => !item.parent_id);
              const allSubphases = allBudgetItems.filter(item => item.parent_id);
              setPhases(allPhases);
              setSubphases(allSubphases);
            }
          }
          return;
        }
      }

      // Se não tem IDs específicos, buscar do orçamento aprovado da obra
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .eq('status', 'approved')
        .maybeSingle();

      if (!budgetData) {
        setPhases([]);
        setSubphases([]);
        return;
      }

      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetData.id)
        .order('ordem');

      if (error) throw error;

      const allItems = data || [];
      const phaseItems = allItems.filter(item => !item.parent_id);
      const subphaseItems = allItems.filter(item => item.parent_id);

      setPhases(phaseItems);
      setSubphases(subphaseItems);
    } catch (error) {
      console.error('Erro ao carregar itens do orçamento:', error);
      setPhases([]);
      setSubphases([]);
    }
  };

  const handleWorkChange = async (workId: string) => {
    setFormData(prev => ({ ...prev, work_id: workId, phase_id: '', subphase_id: '' }));
    await loadBudgetItems(workId);
  };

  const handlePhaseChange = (phaseId: string) => {
    setFormData(prev => ({ ...prev, phase_id: phaseId, subphase_id: '' }));
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unit: 'UN',
      unit_price: 0,
      total_price: 0,
      phase_id: '',
      subphase_id: ''
    };
    setItems([...items, newItem]);
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const updateItem = (itemId: string, field: keyof OrderItem, value: any) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id !== itemId) return item;

      const updatedItem = { ...item, [field]: value };

      if (field === 'quantity' || field === 'unit_price') {
        const quantity = field === 'quantity' ? value : updatedItem.quantity;
        const unitPrice = field === 'unit_price' ? value : updatedItem.unit_price;
        updatedItem.total_price = quantity * unitPrice;
      }

      return updatedItem;
    }));
  };

  const calculateItemsSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateTotal = () => {
    const itemsTotal = calculateItemsSubtotal();
    return itemsTotal + formData.freight_value - formData.discount_value;
  };

  const handleSave = async () => {
    if (!order) return;

    if (items.length === 0) {
      onError('Adicione pelo menos um item ao pedido');
      return;
    }

    if (items.some(item => !item.description || item.quantity <= 0 || item.unit_price <= 0)) {
      onError('Preencha todos os campos dos itens corretamente');
      return;
    }

    try {
      setSaving(true);
      console.log('[EDIT] Salvando pedido:', order.id);

      const totalValue = calculateTotal();

      const { data: existingItems } = await supabase
        .from('purchase_order_items')
        .select('id')
        .eq('order_id', order.id)
        .is('deleted_at', null);

      const existingItemIds = new Set((existingItems || []).map(i => i.id));
      const currentItemIds = new Set(items.filter(i => i.db_id).map(i => i.db_id!));

      const itemsToDelete = Array.from(existingItemIds).filter(id => !currentItemIds.has(id));
      if (itemsToDelete.length > 0) {
        await supabase
          .from('purchase_order_items')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id
          })
          .in('id', itemsToDelete);
      }

      for (const item of items) {
        if (item.db_id) {
          await supabase
            .from('purchase_order_items')
            .update({
              item_name: item.description,
              complement: '',
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              total_price: item.total_price,
              phase_id: item.phase_id || null,
              subphase_id: item.subphase_id || null
            })
            .eq('id', item.db_id);
        } else {
          await supabase
            .from('purchase_order_items')
            .insert({
              order_id: order.id,
              item_type: 'insumo',
              item_name: item.description,
              complement: '',
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              total_price: item.total_price,
              phase_id: item.phase_id || null,
              subphase_id: item.subphase_id || null
            });
        }
      }

      const { error } = await supabase
        .from('purchase_orders')
        .update({
          payment_conditions: formData.payment_conditions,
          freight_value: formData.freight_value,
          discount_value: formData.discount_value,
          notes: formData.notes,
          total_value: totalValue,
          phase_id: formData.phase_id || null,
          subphase_id: formData.subphase_id || null
        })
        .eq('id', order.id);

      if (error) throw error;

      console.log('[EDIT] Pedido salvo com sucesso');

      if (order.work_id && user?.id) {
        const { data: currentItems } = await supabase
          .from('purchase_order_items')
          .select('*')
          .eq('order_id', order.id)
          .is('deleted_at', null);

        const itemsForRealized = (currentItems || [])
          .filter((item: any) => item.phase_id)
          .map((item: any) => ({
            description: item.item_name || '',
            phase_id: item.phase_id,
            subphase_id: item.subphase_id,
            total_price: item.total_price || 0
          }));

        console.log('[EDIT] Atualizando realizado com', itemsForRealized.length, 'itens');

        const realizedResult = await updateBudgetRealizedFromOrder(
          order.id,
          order.work_id,
          itemsForRealized,
          null,
          null,
          user.id
        );

        if (!realizedResult.success) {
          console.warn('[EDIT] Aviso ao atualizar realizado:', realizedResult.error);
        } else {
          console.log('[EDIT] ✓ Realizado atualizado com sucesso');
        }
      }

      onSuccess('Pedido atualizado com sucesso!');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('[EDIT] Erro ao salvar pedido:', error);
      onError(`Erro ao salvar pedido: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPDF = async () => {
    try {
      await generatePurchaseOrderPDF(order.id);
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      onError(`Erro ao gerar PDF: ${error.message || 'Erro desconhecido'}`);
    }
  };

  if (!order) return null;

  const availableSubphases = formData.phase_id
    ? subphases.filter(s => s.parent_id === formData.phase_id)
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: conktColors.primary.blue }}>
              Editar Pedido {order.order_number}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Modifique os dados do pedido de compra
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Seção Obra - Informações (não editável) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Obra</h3>
              <p className="text-xs text-gray-600 mb-3">
                A obra vinculada foi definida no pedido original. Para alterar, edite o pedido na origem.
              </p>
              {currentWork ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input
                      type="text"
                      value={currentWork.name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                    <input
                      type="text"
                      value={currentWork.work_number}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                    <input
                      type="text"
                      value={`${currentWork.work_address || ''}, ${currentWork.work_number || ''} - ${currentWork.work_neighborhood || ''}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cidade/Estado</label>
                    <input
                      type="text"
                      value={`${currentWork.work_city || ''} - ${currentWork.work_state || ''}`}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                    <input
                      type="text"
                      value={currentWork.work_zip_code || '-'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma obra vinculada</p>
              )}
            </div>

            {/* Seção Cliente */}
            {currentClient && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Cliente</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                    <input
                      type="text"
                      value={currentClient.name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CPF/CNPJ</label>
                    <input
                      type="text"
                      value={currentClient.cpf_cnpj}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={currentClient.phone}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Seção Fornecedor (não editável) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Fornecedor</h3>
              <p className="text-xs text-gray-600 mb-3">
                O fornecedor foi definido no pedido original. Para alterar, edite o pedido na origem.
              </p>
              {currentSupplier ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nome/Razão Social</label>
                    <input
                      type="text"
                      value={currentSupplier.fantasy_name || currentSupplier.name || '-'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">CPF/CNPJ</label>
                      <input
                        type="text"
                        value={currentSupplier.document || '-'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={currentSupplier.phone || '-'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhum fornecedor vinculado</p>
              )}
            </div>

            {/* Centro de Custo - Informação apenas */}
            {(order.phase_id || order.subphase_id) && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Centro de Custo</h3>
                <p className="text-xs text-gray-600 mb-3">
                  O centro de custo foi definido automaticamente pelo contrato ou mapa de cotação.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {order.phase_id && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
                      <input
                        type="text"
                        value={phases.find(p => p.id === order.phase_id)?.descricao || '-'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                      />
                    </div>
                  )}
                  {order.subphase_id && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Subfase</label>
                      <input
                        type="text"
                        value={subphases.find(s => s.id === order.subphase_id)?.descricao || '-'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-800 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Forma de Pagamento */}
            <div className="bg-white border border-gray-300 p-4 rounded-lg">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Forma de Pagamento</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Condições de Pagamento
                </label>
                <input
                  type="text"
                  value={formData.payment_conditions}
                  onChange={(e) => setFormData({ ...formData, payment_conditions: e.target.value })}
                  placeholder="Ex: À vista, 30/60/90 dias, 3x sem juros, etc"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Descreva as condições acordadas (quantidade de parcelas, prazos, etc)
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-700">Itens do Pedido</h3>
                <button
                  onClick={addItem}
                  className="px-3 py-1 rounded-md text-white flex items-center gap-2 text-sm"
                  style={{ backgroundColor: conktColors.primary.blue }}
                  disabled={saving}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-800">
                  <strong>Centro de Custo:</strong> A alocação de fase e subfase de cada item foi definida automaticamente pela solicitação/cotação de origem e será usada para apropriação no orçamento realizado.
                </p>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-2 py-2 text-left font-medium text-gray-700">Descrição</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 w-40">Fase</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-700 w-40">Subfase</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 w-16">Qtd</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 w-16">Un</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-700 w-24">Vlr Unit</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-700 w-24">Total</th>
                      <th className="px-2 py-2 text-center font-medium text-gray-700 w-12">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.length > 0 ? (
                      items.map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                placeholder="Descrição do item"
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                disabled={saving}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.phase_id ? (phases.find(p => p.id === item.phase_id)?.descricao || '-') : '-'}
                                disabled
                                className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-gray-700 text-xs"
                                title="Definido pela solicitação/cotação"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.subphase_id ? (subphases.find(s => s.id === item.subphase_id)?.descricao || '-') : '-'}
                                disabled
                                className="w-full px-2 py-1 border border-gray-300 rounded bg-gray-50 text-gray-700 text-xs"
                                title="Definido pela solicitação/cotação"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="w-full px-1 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                disabled={saving}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={item.unit}
                                onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                                placeholder="UN"
                                className="w-full px-1 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                disabled={saving}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="0.01"
                                className="w-full px-1 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                                disabled={saving}
                              />
                            </td>
                            <td className="px-2 py-2 text-right font-semibold text-xs">
                              {item.total_price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 hover:bg-red-100 rounded text-red-600"
                                disabled={saving}
                                title="Remover item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-3 py-4 text-center text-gray-500">
                          Nenhum item adicionado. Clique em "Adicionar Item" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-end">
                <div className="w-80">
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">{calculateItemsSubtotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 text-sm">
                    <span className="text-gray-600">Desconto:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={formData.discount_value}
                        onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0,00"
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between py-2 text-lg border-t border-gray-300 mt-2 pt-2">
                    <span className="font-bold text-gray-700">Total:</span>
                    <span className="font-bold" style={{ color: conktColors.primary.blue }}>
                      {calculateTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações / Notas Internas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                placeholder="Digite as observações sobre o pedido..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            onClick={handlePrintPDF}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-black rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2 font-medium"
          >
            <FileText className="w-4 h-4" />
            Imprimir PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
