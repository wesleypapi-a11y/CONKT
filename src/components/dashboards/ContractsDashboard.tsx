import { useState, useEffect } from 'react';
import { FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Contract } from '../../types/contract';

interface ContractInstallment {
  id: string;
  status: string;
  amount: number;
  paid_amount: number | null;
  payment_date: string | null;
}

interface Props {
  workId: string;
  contracts: Contract[];
}

export default function ContractsDashboard({ workId, contracts }: Props) {
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [installments, setInstallments] = useState<ContractInstallment[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    percentage: 0
  });

  useEffect(() => {
    if (selectedContractId) {
      loadInstallments();
    } else {
      setInstallments([]);
      setStats({ total: 0, paid: 0, pending: 0, percentage: 0 });
    }
  }, [selectedContractId]);

  const loadInstallments = async () => {
    if (!selectedContractId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contract_installments')
        .select('id, status, amount, paid_amount, paid_date')
        .eq('contract_id', selectedContractId);

      if (error) throw error;

      const installmentsData = data || [];
      setInstallments(installmentsData);

      const selectedContract = contracts.find(c => c.id === selectedContractId);
      const contractTotal = Number(selectedContract?.total_value || 0);

      console.log('Selected Contract:', selectedContract);
      console.log('Contract Total:', contractTotal);
      console.log('Installments:', installmentsData);

      const totalPaid = installmentsData
        .filter(i => i.status === 'pago')
        .reduce((sum, i) => sum + Number(i.paid_amount || i.amount || 0), 0);

      const totalPending = contractTotal - totalPaid;
      const percentage = contractTotal > 0 ? (totalPaid / contractTotal) * 100 : 0;

      console.log('Total Paid:', totalPaid);
      console.log('Total Pending:', totalPending);
      console.log('Percentage:', percentage);

      setStats({
        total: contractTotal,
        paid: totalPaid,
        pending: totalPending,
        percentage
      });
    } catch (error) {
      console.error('Error loading installments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-blue-600" />
        Contratos: Pago vs Falta
      </h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecionar Contrato
        </label>
        <select
          value={selectedContractId}
          onChange={(e) => setSelectedContractId(e.target.value)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione um contrato...</option>
          {contracts.map((contract) => (
            <option key={contract.id} value={contract.id}>
              {contract.contract_number} - {contract.supplier_name}
            </option>
          ))}
        </select>
      </div>

      {!selectedContractId ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>Selecione um contrato para visualizar os dados</p>
        </div>
      ) : loading ? (
        <div className="text-center py-8 text-gray-500">Carregando dados...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">Valor Total</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                R$ {stats.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-600 font-medium">Total Pago</p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                R$ {stats.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-600 font-medium">Total em Aberto</p>
              </div>
              <p className="text-2xl font-bold text-yellow-900">
                R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-purple-600 font-medium">% Pago</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {stats.percentage.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualização do Contrato</h3>

            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="relative w-48 h-48">
                <svg className="transform -rotate-90 w-48 h-48">
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#e5e7eb"
                    strokeWidth="24"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#10b981"
                    strokeWidth="24"
                    fill="none"
                    strokeDasharray={`${(stats.percentage / 100) * 502.4} 502.4`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-3xl font-bold text-gray-900">{stats.percentage.toFixed(1)}%</span>
                  <span className="text-sm text-gray-500">Pago</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-gray-700">
                    Pago: R$ {stats.paid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-gray-300 rounded"></div>
                  <span className="text-sm text-gray-700">
                    Em Aberto: R$ {stats.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Status das Parcelas</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {installments.filter(i => i.status === 'pago').length}
                  </p>
                  <p className="text-xs text-gray-500">Pagas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {installments.filter(i => i.status === 'pendente').length}
                  </p>
                  <p className="text-xs text-gray-500">Pendentes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {installments.length}
                  </p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
