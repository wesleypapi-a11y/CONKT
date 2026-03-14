import { useState, useEffect } from 'react';
import { X, Save, User, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Client } from '../../types/client';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';
import { arcoColors } from '../../styles/colors';
import QuickWorkModal from '../works/QuickWorkModal';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetId?: string;
  onBudgetCreated?: (budgetId: string) => void;
}

interface BudgetTemplate {
  id: string;
  nome: string;
  itens: any[];
}

const statusOptions = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'rejeitado', label: 'Rejeitado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export default function BudgetModal({ isOpen, onClose, budgetId, onBudgetCreated }: BudgetModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showQuickClientForm, setShowQuickClientForm] = useState(false);
  const [quickClientName, setQuickClientName] = useState('');
  const [quickWorkModalOpen, setQuickWorkModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    work_id: '',
    template_id: '',
    titulo: '',
    status: 'rascunho',
    valor_total: 0,
    validade: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadTemplates();
      if (budgetId) {
        loadBudget();
      } else {
        resetForm();
      }
    }
  }, [isOpen, budgetId]);

  useEffect(() => {
    if (formData.client_id) {
      const client = clients.find(c => c.id === formData.client_id);
      setSelectedClient(client || null);
      loadClientWorks(formData.client_id);
    } else {
      setSelectedClient(null);
      setWorks([]);
      handleChange('work_id', '');
    }
  }, [formData.client_id, clients]);

  const loadClientWorks = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('*')
        .eq('client_id', clientId)
        .order('name', { ascending: true });

      if (error) throw error;

      setWorks(data || []);

      if (data && data.length === 1) {
        handleChange('work_id', data[0].id);
      }
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_templates')
        .select('id, nome, itens')
        .order('nome', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generateTitle = () => {
    const templateLabel = templates.find(t => t.id === formData.template_id)?.nome || 'Orçamento';
    const clientName = selectedClient?.name || '';
    const workName = works.find(w => w.id === formData.work_id)?.name || '';

    if (clientName && workName) {
      return `${templateLabel} - ${workName} - ${clientName}`;
    } else if (clientName) {
      return `${templateLabel} - ${clientName}`;
    }
    return '';
  };

  useEffect(() => {
    if (selectedClient || formData.work_id || formData.template_id) {
      const newTitle = generateTitle();
      if (newTitle) {
        handleChange('titulo', newTitle);
      }
    }
  }, [formData.template_id, formData.work_id, selectedClient, works]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadBudget = async () => {
    if (!budgetId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          client_id: data.client_id || '',
          work_id: data.work_id || '',
          template_id: data.template_id || '',
          titulo: data.titulo || '',
          status: data.status || 'rascunho',
          valor_total: data.valor_total || 0,
          validade: data.validade || '',
        });
      }
    } catch (error) {
      console.error('Error loading budget:', error);
      alert('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const validadeFormatted = sixMonthsFromNow.toISOString().split('T')[0];

    setFormData({
      client_id: '',
      work_id: '',
      template_id: '',
      titulo: '',
      status: 'rascunho',
      valor_total: 0,
      validade: validadeFormatted,
    });
    setSelectedClient(null);
    setWorks([]);
    setShowQuickClientForm(false);
    setQuickClientName('');
  };

  const handleQuickClientSubmit = async () => {
    if (!quickClientName.trim()) {
      alert('Por favor, preencha o nome do cliente');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: quickClientName.trim(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      await loadClients();
      handleChange('client_id', data.id);
      setShowQuickClientForm(false);
      setQuickClientName('');
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Erro ao criar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickWorkCreated = async (workId: string) => {
    setQuickWorkModalOpen(false);
    if (formData.client_id) {
      await loadClientWorks(formData.client_id);
      handleChange('work_id', workId);
    }
  };

  const copyTemplateItems = async (newBudgetId: string, templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template || !template.itens || template.itens.length === 0) {
        return;
      }

      const newItems = template.itens.map((item: any, index: number) => {
        const isMacro = item.MACRO === 'Sim' || item.MACRO === 'SIM' || item.MACRO === 'sim';

        const descricao = item.Descrição || item['Descrição'] || item.descricao || item.DESCRIÇÃO || '';
        const etapa = item.ETAPA || item.etapa || item.Etapa || '';
        const unidade = item.UNIDADE || item.unidade || 'vb';
        const obs = item.OBS || item.obs || '';

        return {
          budget_id: newBudgetId,
          descricao: descricao.toString().trim(),
          quantidade: 0,
          unidade: unidade.toString(),
          valor_unitario: 0,
          valor_total: 0,
          ordem: index,
          tipo: isMacro ? 'macro' : 'item',
          etapa: etapa.toString().trim(),
          obs: obs.toString(),
        };
      });

      const { error: insertError } = await supabase
        .from('budget_items')
        .insert(newItems);

      if (insertError) {
        console.error('Erro ao inserir itens do template:', insertError);
        throw insertError;
      }
    } catch (error) {
      console.error('Error copying template items:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação: título obrigatório
    if (!formData.titulo.trim()) {
      alert('Por favor, preencha o título do orçamento');
      return;
    }

    // Validação: obra obrigatória
    if (!formData.work_id) {
      alert('Por favor, vincule uma obra ao orçamento');
      return;
    }

    // Validação: usuário autenticado
    if (!user?.id) {
      alert('Usuário não autenticado. Por favor, faça login novamente.');
      return;
    }

    setLoading(true);
    try {
      // Preparar dados do orçamento garantindo que IDs vazios virem null
      const budgetData = {
        titulo: formData.titulo.trim(),
        client_id: formData.client_id || null,
        work_id: formData.work_id || null,
        template_id: formData.template_id || null,
        status: formData.status || 'rascunho',
        valor_total: formData.valor_total || 0,
        validade: formData.validade || null,
        updated_at: new Date().toISOString(),
      };

      if (budgetId) {
        // Atualizar orçamento existente
        const { error } = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', budgetId);

        if (error) {
          console.error('Error updating budget:', error);
          throw error;
        }

        alert('Orçamento atualizado com sucesso!');
        onClose();
      } else {
        // Criar novo orçamento
        const { data, error } = await supabase
          .from('budgets')
          .insert({
            ...budgetData,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating budget:', error);
          throw error;
        }

        if (data) {
          // Copiar itens do template se selecionado
          if (formData.template_id) {
            await copyTemplateItems(data.id, formData.template_id);
          }

          if (onBudgetCreated) {
            onBudgetCreated(data.id);
          }

          alert('Orçamento criado com sucesso!');
        }

        onClose();
      }
    } catch (error: any) {
      console.error('Error saving budget:', error);

      // Mensagens de erro específicas
      let errorMessage = 'Erro ao salvar orçamento';

      if (error?.message) {
        if (error.message.includes('foreign key') || error.message.includes('violates foreign key constraint')) {
          if (error.message.includes('client_id')) {
            errorMessage = 'Cliente selecionado não é válido. Por favor, selecione um cliente válido.';
          } else if (error.message.includes('work_id')) {
            errorMessage = 'Obra selecionada não é válida. Por favor, selecione uma obra válida.';
          } else if (error.message.includes('template_id')) {
            errorMessage = 'Template selecionado não é válido. Por favor, selecione um template válido.';
          } else {
            errorMessage = 'Um dos registros selecionados não é válido. Por favor, verifique suas seleções.';
          }
        } else if (error.message.includes('permission denied') || error.message.includes('policy')) {
          errorMessage = 'Você não tem permissão para salvar este orçamento. Verifique suas credenciais.';
        } else if (error.message.includes('duplicate key')) {
          errorMessage = 'Já existe um orçamento com estes dados. Por favor, use informações diferentes.';
        } else if (error.message.includes('not null') || error.message.includes('violates not-null constraint')) {
          if (error.message.includes('titulo')) {
            errorMessage = 'O título do orçamento é obrigatório.';
          } else if (error.message.includes('created_by')) {
            errorMessage = 'Erro de autenticação. Por favor, faça login novamente.';
          } else {
            errorMessage = 'Um campo obrigatório está faltando. Por favor, preencha todos os campos necessários.';
          }
        } else {
          errorMessage = `Erro ao salvar orçamento: ${error.message}`;
        }
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {budgetId ? 'Editar Orçamento' : 'Novo Orçamento'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Cliente
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickClientForm(!showQuickClientForm)}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Cadastro Rápido
                </button>
              </div>

              {showQuickClientForm ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickClientName}
                    onChange={(e) => setQuickClientName(e.target.value)}
                    placeholder="Nome do cliente"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={handleQuickClientSubmit}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                    style={{ backgroundColor: arcoColors.primary.blue }}
                  >
                    Criar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickClientForm(false);
                      setQuickClientName('');
                    }}
                    className="btn-cancel"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <select
                  value={formData.client_id}
                  onChange={(e) => handleChange('client_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedClient && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <User size={18} />
                  Cliente: {selectedClient.name}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {selectedClient.cpf_cnpj && (
                    <div>
                      <span className="font-medium text-blue-700">CPF/CNPJ:</span>{' '}
                      <span className="text-blue-900">{selectedClient.cpf_cnpj}</span>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div>
                      <span className="font-medium text-blue-700">Email:</span>{' '}
                      <span className="text-blue-900">{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div>
                      <span className="font-medium text-blue-700">Telefone:</span>{' '}
                      <span className="text-blue-900">{selectedClient.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.client_id && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Vincular Obra <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setQuickWorkModalOpen(true)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Cadastro Rápido
                  </button>
                </div>
                <select
                  value={formData.work_id}
                  onChange={(e) => {
                    handleChange('work_id', e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  required
                >
                  <option value="">Selecione uma obra</option>
                  {works.map(work => (
                    <option key={work.id} value={work.id}>
                      {work.name}
                    </option>
                  ))}
                </select>
                {works.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Nenhuma obra cadastrada para este cliente</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Template
                </label>
                <select
                  value={formData.template_id}
                  onChange={(e) => handleChange('template_id', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Sem template</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.nome}
                    </option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">Nenhum template disponível. Importe templates primeiro.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => handleChange('titulo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Título gerado automaticamente"
                required
              />
            </div>

          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#1e40af' }}
            >
              <Save size={20} />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>

      <QuickWorkModal
        isOpen={quickWorkModalOpen}
        onClose={() => setQuickWorkModalOpen(false)}
        onWorkCreated={handleQuickWorkCreated}
        clientId={formData.client_id}
      />
    </div>
  );
}
