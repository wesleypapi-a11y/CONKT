import { useState, useEffect } from 'react';
import { Package, Search, Eye, Printer, FileText, CreditCard as Edit, Trash2 } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { PurchaseOrder } from '../../types/purchase';
import { useAlert } from '../../hooks/useAlert';
import { generatePurchaseOrderPDF } from '../../utils/purchaseOrderPdfGenerator';
import { removeBudgetRealizedFromOrder } from '../../utils/budgetRealized';
import PurchaseOrderEditModal from './PurchaseOrderEditModal';
import ConfirmModal from '../common/ConfirmModal';

interface ExtendedPurchaseOrder extends PurchaseOrder {
  supplier_name?: string;
  work_name?: string;
  work_id?: string;
}

interface PurchaseOrdersManagerProps {
  onNavigateHome: () => void;
}

interface Work {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
  fantasy_name: string;
}

export default function PurchaseOrdersManager({ onNavigateHome }: PurchaseOrdersManagerProps) {
  const { showSuccess, showError, AlertComponent } = useAlert();
  const [orders, setOrders] = useState<ExtendedPurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [works, setWorks] = useState<Work[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>('');
  const [filters, setFilters] = useState({
    supplier_id: '',
    status: '',
    date_start: '',
    date_end: ''
  });
  const [editingOrder, setEditingOrder] = useState<ExtendedPurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<ExtendedPurchaseOrder | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  useEffect(() => {
    loadWorks();
    loadSuppliers();
  }, []);

  useEffect(() => {
    loadOrders();
  }, [selectedWorkId, filters]);

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, name')
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name, fantasy_name')
        .eq('active', true)
        .order('fantasy_name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    }
  };

  const loadOrders = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('purchase_orders')
        .select('*')
        .is('deleted_at', null);

      // Filtrar por obra apenas se uma obra estiver selecionada
      if (selectedWorkId) {
        query = query.eq('work_id', selectedWorkId);
      }

      if (filters.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.date_start) {
        query = query.gte('created_at', filters.date_start);
      }

      if (filters.date_end) {
        const endDate = new Date(filters.date_end);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endDate.toISOString());
      }

      query = query.order('created_at', { ascending: false });

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const supplierIds = [...new Set(ordersData.map(o => o.supplier_id).filter(Boolean))];
      const workIds = [...new Set(ordersData.map(o => o.work_id).filter(Boolean))];

      const [
        { data: suppliersData },
        { data: worksData }
      ] = await Promise.all([
        supplierIds.length > 0 ? supabase.from('suppliers').select('*').in('id', supplierIds) : { data: [] },
        workIds.length > 0 ? supabase.from('works').select('*').in('id', workIds).is('deleted_at', null) : { data: [] }
      ]);

      const suppliersMap = new Map(suppliersData?.map(s => [s.id, s]) || []);
      const worksMap = new Map(worksData?.map(w => [w.id, w]) || []);

      const ordersWithDetails = ordersData.map(order => {
        const supplier = suppliersMap.get(order.supplier_id);
        const work = worksMap.get(order.work_id);

        return {
          ...order,
          supplier_name: supplier?.fantasy_name || supplier?.name || '',
          work_name: work?.name || '',
          work_id: order.work_id || ''
        };
      });

      setOrders(ordersWithDetails);
    } catch (error: any) {
      console.error('Erro ao carregar pedidos:', error);
      showError(`Erro ao carregar pedidos: ${error.message || 'Erro desconhecido'}`);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOrder = (order: ExtendedPurchaseOrder) => {
    setEditingOrder(order);
  };

  const handlePrintOrder = async (order: ExtendedPurchaseOrder) => {
    try {
      const pdfBlob = await generatePurchaseOrderPDF(order.id);

      if (!pdfBlob) {
        throw new Error('Erro ao gerar PDF');
      }

      // Criar URL para download
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PC-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar PDF do pedido');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800';
      case 'aprovado':
        return 'bg-green-100 text-green-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Pendente';
      case 'aprovado':
        return 'Aprovado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const handleDeleteOrder = async () => {
    if (!deletingOrder) return;

    try {
      // Primeiro, remover os lançamentos de budget_realized
      const removeRealizedResult = await removeBudgetRealizedFromOrder(deletingOrder.id);

      if (!removeRealizedResult.success) {
        console.warn('Aviso ao remover realizado:', removeRealizedResult.error);
      }

      // Depois, marcar o pedido como excluído
      const { error } = await supabase
        .from('purchase_orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deletingOrder.id);

      if (error) throw error;

      showSuccess('Pedido excluído com sucesso!');
      setDeletingOrder(null);
      loadOrders();
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      showError(`Erro ao excluir pedido: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrders.size === 0) return;

    try {
      // Primeiro, remover os lançamentos de budget_realized de todos os pedidos selecionados
      const orderIds = Array.from(selectedOrders);

      for (const orderId of orderIds) {
        const removeRealizedResult = await removeBudgetRealizedFromOrder(orderId);

        if (!removeRealizedResult.success) {
          console.warn(`Aviso ao remover realizado do pedido ${orderId}:`, removeRealizedResult.error);
        }
      }

      // Depois, marcar todos os pedidos como excluídos
      const { error } = await supabase
        .from('purchase_orders')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', orderIds);

      if (error) throw error;

      showSuccess(`${selectedOrders.size} pedido(s) excluído(s) com sucesso!`);
      setSelectedOrders(new Set());
      setShowBulkDeleteConfirm(false);
      loadOrders();
    } catch (error: any) {
      console.error('Erro ao excluir pedidos:', error);
      showError(`Erro ao excluir pedidos: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length && orders.length > 0) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(order => order.id)));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <AlertComponent />

      {editingOrder && (
        <PurchaseOrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={() => {
            setEditingOrder(null);
            loadOrders();
          }}
          onError={showError}
          onSuccess={showSuccess}
        />
      )}

      {deletingOrder && (
        <ConfirmModal
          isOpen={!!deletingOrder}
          title="Excluir Pedido"
          message={`Tem certeza que deseja excluir o pedido ${deletingOrder.order_number}? Esta ação não pode ser desfeita.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleDeleteOrder}
          onCancel={() => setDeletingOrder(null)}
          type="danger"
        />
      )}

      {showBulkDeleteConfirm && (
        <ConfirmModal
          isOpen={showBulkDeleteConfirm}
          title="Excluir Pedidos Selecionados"
          message={`Tem certeza que deseja excluir ${selectedOrders.size} pedido(s) selecionado(s)? Esta ação não pode ser desfeita.`}
          confirmText="Excluir Todos"
          cancelText="Cancelar"
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteConfirm(false)}
          type="danger"
        />
      )}

      <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            {selectedOrders.size > 0 && (
              <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-sm font-medium text-blue-900">
                  {selectedOrders.size} pedido(s) selecionado(s)
                </span>
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Selecionados
                </button>
              </div>
            )}
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Obra</label>
                <select
                  value={selectedWorkId}
                  onChange={(e) => setSelectedWorkId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: arcoColors.primary.blue }}
                >
                  <option value="">Todas as obras</option>
                  {works.map(work => (
                    <option key={work.id} value={work.id}>{work.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                <select
                  value={filters.supplier_id}
                  onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.fantasy_name || supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  value={filters.date_start}
                  onChange={(e) => setFilters({ ...filters, date_start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filters.date_end}
                  onChange={(e) => setFilters({ ...filters, date_end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
                    style={{ borderColor: arcoColors.primary.blue }}
                  ></div>
                  <p className="text-gray-600">Carregando pedidos...</p>
                </div>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600">Nenhum pedido encontrado</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center w-12">
                      <input
                        type="checkbox"
                        checked={selectedOrders.size === orders.length && orders.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obra</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.order_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.work_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                        {formatCurrency(order.total_value)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditOrder(order)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrintOrder(order)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="Imprimir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingOrder(order)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
    </div>
  );
}
