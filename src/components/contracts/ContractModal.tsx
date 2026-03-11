import { useState, useEffect } from 'react';
import { X, Printer } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Contract } from '../../types/contract';
import { useAuth } from '../../contexts/AuthContext';
import ContractDadosTab from './ContractDadosTab';
import ContractPagamentoTab from './ContractPagamentoTab';
import ContractParcelasTab from './ContractParcelasTab';
import ContractAnexosTab from './ContractAnexosTab';
import { generateContractPdf } from '../../utils/contractPdfGenerator';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId?: string;
  onSave: () => void;
}

type TabType = 'dados' | 'pagamento' | 'parcelas' | 'anexos';

export default function ContractModal({ isOpen, onClose, contractId, onSave }: ContractModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dados');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  const [installmentsRefreshKey, setInstallmentsRefreshKey] = useState(0);
  const [contract, setContract] = useState<Partial<Contract>>({
    status: 'ativo',
    total_value: 0,
    installments_count: 1,
    recurrence_days: 30,
    scope: '',
    internal_notes: '',
    payment_method: '',
    contract_date: new Date().toISOString().split('T')[0],
    vinculo: 'sem_vinculo'
  });

  useEffect(() => {
    if (isOpen && contractId) {
      loadContract();
    } else if (isOpen && !contractId) {
      resetForm();
    }
  }, [isOpen, contractId]);

  const resetForm = () => {
    setContract({
      status: 'ativo',
      total_value: 0,
      installments_count: 1,
      recurrence_days: 30,
      scope: '',
      internal_notes: '',
      payment_method: '',
      contract_date: new Date().toISOString().split('T')[0],
      vinculo: 'sem_vinculo'
    });
    setActiveTab('dados');
    setValidationErrors({});
  };

  const loadContract = async () => {
    if (!contractId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .maybeSingle();

      if (error) throw error;
      if (data) setContract(data);
    } catch (error) {
      console.error('Error loading contract:', error);
      alert('Erro ao carregar contrato');
    } finally {
      setLoading(false);
    }
  };

  const generateContractNumber = async (): Promise<string> => {
    if (!user) return 'CT-001';

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('contract_number')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].contract_number.split('-')[1]) || 0;
        return `CT-${String(lastNumber + 1).padStart(3, '0')}`;
      }

      return 'CT-001';
    } catch (error) {
      console.error('Error generating contract number:', error);
      return 'CT-001';
    }
  };

  const handleSave = async () => {
    const missingFields: string[] = [];
    const errors: {[key: string]: boolean} = {};

    if (!contract.client_id) {
      missingFields.push('Cliente');
      errors.client_id = true;
    }

    if (!contract.work_id) {
      missingFields.push('Obra');
      errors.work_id = true;
    }

    if (!contract.supplier_id) {
      missingFields.push('Fornecedor');
      errors.supplier_id = true;
    }

    if (!contract.total_value || contract.total_value <= 0) {
      missingFields.push('Valor Total do Contrato (deve ser maior que zero)');
      errors.total_value = true;
    }

    setValidationErrors(errors);

    if (missingFields.length > 0) {
      if (missingFields.some(f => f === 'Cliente' || f === 'Obra' || f === 'Fornecedor')) {
        setActiveTab('dados');
      } else if (missingFields.some(f => f.includes('Valor Total'))) {
        setActiveTab('pagamento');
      }
      alert(`Por favor, preencha os seguintes campos obrigatórios:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }

    setValidationErrors({});

    if (!user) {
      alert('Usuário não autenticado. Por favor, faça login novamente.');
      return;
    }

    setSaving(true);
    try {
      let contractNumber = contract.contract_number;

      if (!contractId && !contractNumber) {
        contractNumber = await generateContractNumber();
      }

      const contractData = {
        ...contract,
        contract_number: contractNumber,
        user_id: user.id
      };

      if (contractId) {
        const { error } = await supabase
          .from('contracts')
          .update({
            ...contractData,
            updated_at: new Date().toISOString()
          })
          .eq('id', contractId);

        if (error) {
          console.error('Error updating contract:', error);
          throw error;
        }
        alert('Contrato atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('contracts')
          .insert(contractData)
          .select()
          .single();

        if (error) {
          console.error('Error creating contract:', error);
          throw error;
        }
        if (data) {
          setContract(data);
          alert('Contrato criado com sucesso!');
        }
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving contract:', error);

      let errorMessage = 'Erro ao salvar contrato';

      if (error?.message) {
        if (error.message.includes('duplicate key')) {
          errorMessage = 'Já existe um contrato com este número. Por favor, use um número diferente.';
        } else if (error.message.includes('foreign key')) {
          errorMessage = 'Um dos registros selecionados (Cliente, Obra ou Fornecedor) não é válido. Por favor, verifique suas seleções.';
        } else if (error.message.includes('permission denied') || error.message.includes('policy')) {
          errorMessage = 'Você não tem permissão para salvar este contrato. Verifique suas credenciais.';
        } else {
          errorMessage = `Erro ao salvar contrato: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePrintContract = async () => {
    if (!contractId) {
      alert('Salve o contrato antes de imprimir');
      return;
    }

    try {
      const { data: contractData, error: contractError } = await supabase
        .from('contracts')
        .select(`
          *,
          client:clients(
            nome,
            razao_social,
            nome_fantasia,
            cpf_cnpj,
            cnpj_cpf,
            telefone,
            email,
            endereco,
            numero,
            bairro,
            cidade,
            estado,
            cep
          ),
          supplier:suppliers(
            name,
            fantasy_name,
            cnpj_cpf,
            phone,
            email
          ),
          work:works(
            codigo,
            work_code,
            nome,
            name,
            work_address,
            work_number,
            work_neighborhood,
            work_city,
            work_state,
            work_zip_code
          )
        `)
        .eq('id', contractId)
        .maybeSingle();

      if (contractError) throw contractError;
      if (!contractData) {
        alert('Contrato não encontrado');
        return;
      }

      const { data: installmentsData } = await supabase
        .from('contract_installments')
        .select('*')
        .eq('contract_id', contractId)
        .order('installment_number', { ascending: true });

      const { data: attachmentsData } = await supabase
        .from('contract_attachments')
        .select('*')
        .eq('contract_id', contractId);

      await generateContractPdf(contractData, installmentsData || [], attachmentsData || []);
    } catch (error) {
      console.error('Error printing contract:', error);
      alert('Erro ao gerar PDF do contrato');
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'dados', label: 'Dados do Contrato' },
    { id: 'pagamento', label: 'Pagamento' },
    { id: 'parcelas', label: 'Parcelas' },
    { id: 'anexos', label: 'Anexos' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {contractId ? 'Editar Contrato' : 'Novo Contrato'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-6 py-3 font-medium whitespace-nowrap transition-colors rounded-t-lg ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? conktColors.primary.blue : 'transparent'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Carregando...</div>
            </div>
          ) : (
            <>
              {activeTab === 'dados' && (
                <ContractDadosTab
                  contract={contract}
                  setContract={setContract}
                  contractId={contractId}
                  validationErrors={validationErrors}
                />
              )}
              {activeTab === 'pagamento' && (
                <ContractPagamentoTab
                  contract={contract}
                  setContract={setContract}
                  contractId={contractId}
                  validationErrors={validationErrors}
                  onInstallmentUpdate={() => setInstallmentsRefreshKey(prev => prev + 1)}
                />
              )}
              {activeTab === 'parcelas' && (
                <ContractParcelasTab
                  contractId={contractId || null}
                  refreshKey={installmentsRefreshKey}
                />
              )}
              {activeTab === 'anexos' && (
                <ContractAnexosTab contractId={contractId || null} />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-cancel"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-3">
            {contractId && (
              <button
                onClick={handlePrintContract}
                className="flex items-center gap-2 px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#FCD34D', color: '#000000' }}
              >
                <Printer size={18} />
                Imprimir Contrato
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#10B981', color: '#000000' }}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
