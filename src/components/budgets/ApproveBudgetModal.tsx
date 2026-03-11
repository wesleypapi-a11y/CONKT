import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ApproveBudgetModalProps {
  budgetId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveBudgetModal({ budgetId, onClose, onSuccess }: ApproveBudgetModalProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    supplier_id: '',
    payment_conditions: 'À vista',
    delivery_date: '',
    observations: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      alert('Por favor, selecione um fornecedor');
      return;
    }

    setLoading(true);
    try {
      // Primeiro, tenta obter a sessão atual
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();

      // Se não houver sessão válida, tenta fazer refresh
      if (!session || sessionError) {
        console.log('Sessão inválida ou expirada, tentando refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError || !refreshData.session) {
          console.error('Erro ao fazer refresh:', refreshError);
          throw new Error('Sessão expirada. Faça login novamente.');
        }

        session = refreshData.session;
        console.log('Token atualizado com sucesso');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-budget-and-create-pco`;

      console.log('Enviando requisição com token...');
      console.log('Authorization header:', session?.access_token ? 'Token presente (primeiros 20 chars): ' + session.access_token.substring(0, 20) + '...' : 'Token ausente');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          budget_id: budgetId,
          supplier_id: formData.supplier_id,
          payment_conditions: formData.payment_conditions,
          delivery_date: formData.delivery_date || null,
          observations: formData.observations,
        }),
      });

      console.log('Status da resposta:', response.status);

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `Erro HTTP ${response.status}`;
        console.error('Erro detalhado:', result);
        throw new Error(errorMsg);
      }

      alert(`Orçamento aprovado com sucesso!\nPedido ${result.order_number} criado.`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error approving budget:', error);
      alert(`Erro ao aprovar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Aprovar Orçamento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fornecedor *
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Condições de Pagamento
              </label>
              <input
                type="text"
                value={formData.payment_conditions}
                onChange={(e) => setFormData({ ...formData, payment_conditions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ex: À vista, 30/60/90 dias"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Entrega
              </label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Informações adicionais sobre o pedido..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Aprovando...' : 'Aprovar e Criar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
