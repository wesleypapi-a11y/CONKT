import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Contract } from '../../types/contract';
import { Client } from '../../types/client';
import { Work } from '../../types/work';
import { Supplier } from '../../types/supplier';
import { useAuth } from '../../contexts/AuthContext';
import SupplierModal from '../suppliers/SupplierModal';

interface ContractDadosTabProps {
  contract: Partial<Contract>;
  setContract: React.Dispatch<React.SetStateAction<Partial<Contract>>>;
  contractId?: string;
  validationErrors?: {[key: string]: boolean};
}

export default function ContractDadosTab({ contract, setContract, contractId, validationErrors = {} }: ContractDadosTabProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredWorks, setFilteredWorks] = useState<Work[]>([]);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [budgetPhases, setBudgetPhases] = useState<any[]>([]);
  const [budgetSubphases, setBudgetSubphases] = useState<any[]>([]);

  useEffect(() => {
    loadClients();
    loadWorks();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (contract.client_id) {
      const clientWorks = works.filter(w => w.client_id === contract.client_id);
      setFilteredWorks(clientWorks);
    } else {
      setFilteredWorks([]);
    }
  }, [contract.client_id, works]);

  useEffect(() => {
    if (contract.work_id) {
      loadBudgetFromWork();
    } else {
      setBudgetPhases([]);
      setBudgetSubphases([]);
      setContract(prev => ({ ...prev, budget_id: undefined }));
    }
  }, [contract.work_id]);

  useEffect(() => {
    if (contract.budget_phase_id) {
      loadBudgetSubphases();
    } else {
      setBudgetSubphases([]);
    }
  }, [contract.budget_phase_id]);

  const loadClients = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data as Client[] || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadWorks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const loadSuppliers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true});

      if (error) throw error;
      setSuppliers(data as Supplier[] || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSupplierModalSave = () => {
    loadSuppliers();
  };

  const loadBudgetFromWork = async () => {
    if (!contract.work_id) return;

    try {
      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', contract.work_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (budgetError) throw budgetError;

      if (budget) {
        setContract(prev => ({ ...prev, budget_id: budget.id }));
        await loadBudgetPhases(budget.id);
      } else {
        setContract(prev => ({ ...prev, budget_id: undefined }));
        setBudgetPhases([]);
        setBudgetSubphases([]);
      }
    } catch (error) {
      console.error('Error loading budget from work:', error);
      setBudgetPhases([]);
      setBudgetSubphases([]);
    }
  };

  const loadBudgetPhases = async (budgetId: string) => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('id, descricao, etapa')
        .eq('budget_id', budgetId)
        .eq('tipo', 'macro')
        .is('parent_id', null)
        .order('ordem', { ascending: true });

      if (error) throw error;
      setBudgetPhases(data || []);
    } catch (error) {
      console.error('Error loading budget phases:', error);
      setBudgetPhases([]);
    }
  };

  const loadBudgetSubphases = async () => {
    if (!contract.budget_phase_id) return;

    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('id, descricao')
        .eq('parent_id', contract.budget_phase_id)
        .eq('tipo', 'item')
        .order('ordem', { ascending: true });

      if (error) throw error;
      setBudgetSubphases(data || []);
    } catch (error) {
      console.error('Error loading budget subphases:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente <span className="text-red-500">*</span>
          </label>
          <select
            value={contract.client_id || ''}
            onChange={(e) => {
              setContract(prev => ({ ...prev, client_id: e.target.value, work_id: '' }));
            }}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              validationErrors.client_id ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Selecione um cliente</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Obra <span className="text-red-500">*</span>
          </label>
          <select
            value={contract.work_id || ''}
            onChange={(e) => setContract(prev => ({
              ...prev,
              work_id: e.target.value,
              budget_phase_id: undefined,
              budget_subphase_id: undefined
            }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              validationErrors.work_id ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
            }`}
            disabled={!contract.client_id}
            required
          >
            <option value="">Selecione uma obra</option>
            {filteredWorks.map(work => (
              <option key={work.id} value={work.id}>{work.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fornecedor <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <select
              value={contract.supplier_id || ''}
              onChange={(e) => setContract(prev => ({ ...prev, supplier_id: e.target.value }))}
              className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                validationErrors.supplier_id ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Selecione um fornecedor</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
            <button
              onClick={() => setSupplierModalOpen(true)}
              className="px-3 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#10B981', color: '#000000' }}
              title="Cadastrar Fornecedor"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do Contrato
          </label>
          <input
            type="date"
            value={contract.contract_date || ''}
            onChange={(e) => setContract(prev => ({ ...prev, contract_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nº do Contrato
          </label>
          <input
            type="text"
            value={contract.contract_number || ''}
            onChange={(e) => setContract(prev => ({ ...prev, contract_number: e.target.value }))}
            placeholder="Será gerado automaticamente"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
            disabled={!contractId}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Total <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={contract.total_value || ''}
            onChange={(e) => setContract(prev => ({ ...prev, total_value: parseFloat(e.target.value) || 0 }))}
            placeholder="0,00"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
              validationErrors.total_value ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
            }`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Forma de Pagamento
          </label>
          <select
            value={contract.payment_method || ''}
            onChange={(e) => setContract(prev => ({ ...prev, payment_method: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          >
            <option value="">Selecione</option>
            <option value="a_vista">À Vista</option>
            <option value="parcelado">Parcelado</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferência</option>
            <option value="pix">PIX</option>
            <option value="cheque">Cheque</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="cartao_debito">Cartão de Débito</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Parcelas
          </label>
          <input
            type="number"
            min="1"
            value={contract.installments_count || 1}
            onChange={(e) => setContract(prev => ({ ...prev, installments_count: parseInt(e.target.value) || 1 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data do 1º Vencimento
          </label>
          <input
            type="date"
            value={contract.first_due_date || ''}
            onChange={(e) => setContract(prev => ({ ...prev, first_due_date: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recorrência (dias)
          </label>
          <input
            type="number"
            min="1"
            value={contract.recurrence_days || 30}
            onChange={(e) => setContract(prev => ({ ...prev, recurrence_days: parseInt(e.target.value) || 30 }))}
            placeholder="30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Dias entre cada vencimento das parcelas (padrão: 30 dias)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={contract.status || 'ativo'}
            onChange={(e) => setContract(prev => ({ ...prev, status: e.target.value as Contract['status'] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          >
            <option value="ativo">Ativo</option>
            <option value="concluido">Concluído</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vínculo
          </label>
          <select
            value={contract.vinculo || 'sem_vinculo'}
            onChange={(e) => setContract(prev => ({ ...prev, vinculo: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          >
            <option value="sem_vinculo">Sem Vínculo</option>
            <option value="com_vinculo">Com Vínculo</option>
          </select>
        </div>
      </div>

      {contract.work_id && budgetPhases.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Apropriação do Orçamento</h3>
          <p className="text-sm text-gray-600 mb-4">
            Selecione a fase e subfase do orçamento da obra onde este contrato será apropriado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fase do Orçamento
              </label>
              <select
                value={contract.budget_phase_id || ''}
                onChange={(e) => {
                  setContract(prev => ({
                    ...prev,
                    budget_phase_id: e.target.value || undefined,
                    budget_subphase_id: undefined
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{}}
              >
                <option value="">Selecione uma fase</option>
                {budgetPhases.map(phase => (
                  <option key={phase.id} value={phase.id}>
                    {phase.etapa} - {phase.descricao}
                  </option>
                ))}
              </select>
            </div>

            {contract.budget_phase_id && budgetSubphases.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item do Orçamento
                </label>
                <select
                  value={contract.budget_subphase_id || ''}
                  onChange={(e) => {
                    setContract(prev => ({
                      ...prev,
                      budget_subphase_id: e.target.value || undefined
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
                  style={{}}
                >
                  <option value="">Selecione um item</option>
                  {budgetSubphases.map(subphase => (
                    <option key={subphase.id} value={subphase.id}>
                      {subphase.descricao}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Escopo do Contrato
        </label>
        <textarea
          value={contract.scope || ''}
          onChange={(e) => setContract(prev => ({ ...prev, scope: e.target.value }))}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
          style={{}}
          placeholder="Descreva detalhadamente o escopo completo do contrato..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Observações Internas
        </label>
        <textarea
          value={contract.internal_notes || ''}
          onChange={(e) => setContract(prev => ({ ...prev, internal_notes: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
          style={{}}
          placeholder="Observações internas (não visíveis ao cliente)..."
        />
      </div>

      {supplierModalOpen && (
        <SupplierModal
          isOpen={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          onSave={handleSupplierModalSave}
        />
      )}
    </div>
  );
}
