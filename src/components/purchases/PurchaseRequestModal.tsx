import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, FileText, Send } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { PurchaseRequest, PurchaseRequestItem } from '../../types/purchase';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';
import { generatePurchaseRequestPDF } from '../../utils/purchaseRequestPdfGenerator';
import { useAlert } from '../../hooks/useAlert';

interface BudgetItem {
  id: string;
  budget_id: string;
  tipo: 'macro' | 'item';
  parent_id: string | null;
  descricao: string;
  valor_total: number;
  ordem: number;
  display_number?: string;
}

interface PurchaseRequestModalProps {
  request: PurchaseRequest | null;
  onClose: () => void;
}

interface Client {
  id: string;
  name: string;
}

const recalculateDisplayNumbers = (itemsList: BudgetItem[]): BudgetItem[] => {
  let currentMacroNumber = 0;
  const childCounters: { [key: number]: number } = {};

  return itemsList.map((item) => {
    if (item.tipo === 'macro') {
      currentMacroNumber++;
      childCounters[currentMacroNumber] = 0;
      return {
        ...item,
        display_number: String(currentMacroNumber),
      };
    } else {
      if (currentMacroNumber > 0) {
        childCounters[currentMacroNumber] = (childCounters[currentMacroNumber] || 0) + 1;
        return {
          ...item,
          display_number: `${currentMacroNumber}.${childCounters[currentMacroNumber]}`,
        };
      } else {
        return {
          ...item,
          display_number: '',
        };
      }
    }
  });
};

export default function PurchaseRequestModal({ request, onClose }: PurchaseRequestModalProps) {
  const { user } = useAuth();
  const { showSuccess, showError, showConfirm, AlertComponent } = useAlert();
  const [activeTab, setActiveTab] = useState('dados');
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [phases, setPhases] = useState<BudgetItem[]>([]);
  const [services, setServices] = useState<BudgetItem[]>([]);

  const [formData, setFormData] = useState({
    work_id: request?.work_id || null,
    phase_id: request?.phase_id || null,
    subphase_id: request?.subphase_id || null,
    status: request?.status || 'solicitado',
    need_date: request?.need_date || '',
    description: request?.description || '',
    contact_name: request?.contact_name || '',
    contact_whatsapp: request?.contact_whatsapp || ''
  });

  const [items, setItems] = useState<PurchaseRequestItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<PurchaseRequestItem | null>(null);
  const [newItem, setNewItem] = useState({
    item_type: 'item_livre' as 'item_livre' | 'insumo' | 'servico',
    phase_id: null as string | null,
    subphase_id: null as string | null,
    item_name: '',
    complement: '',
    quantity: 0,
    unit: ''
  });

  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClients();
    if (request) {
      setFormData({
        work_id: request.work_id || null,
        phase_id: request.phase_id || null,
        subphase_id: request.subphase_id || null,
        status: request.status || 'solicitado',
        need_date: request.need_date || '',
        description: request.description || '',
        contact_name: request.contact_name || '',
        contact_whatsapp: request.contact_whatsapp || ''
      });
      loadItems();
      loadAttachments();
      if (request.work_id) {
        loadClientFromWork(request.work_id);
        loadPhases(request.work_id);
        if (request.phase_id) {
          loadServices(request.phase_id);
        }
      }
    }
  }, [request]);

  const loadClientFromWork = async (workId: string) => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('client_id')
        .eq('id', workId)
        .maybeSingle();

      if (error) throw error;
      if (data?.client_id) {
        setSelectedClientId(data.client_id);
        loadWorks(data.client_id);
      }
    } catch (error) {
      console.error('Erro ao carregar cliente da obra:', error);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadWorks = async (clientId?: string | null) => {
    if (!clientId) {
      setWorks([]);
      return;
    }

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
      console.error('Erro ao carregar obras:', error);
    }
  };

  const loadPhases = async (workId: string | null) => {
    if (!workId) {
      setPhases([]);
      setServices([]);
      setFormData(prev => ({ ...prev, phase_id: null, subphase_id: null }));
      setNewItem(prev => ({ ...prev, phase_id: null, subphase_id: null }));
      return;
    }

    console.log('[PurchaseRequestModal] Carregando fases para obra:', workId);

    try {
      const { data: approvedBudgets, error: budgetError } = await supabase
        .from('budgets')
        .select(`
          id,
          status,
          created_at
        `)
        .eq('work_id', workId)
        .eq('status', 'aprovado')
        .order('created_at', { ascending: false });

      if (budgetError) {
        console.error('[PurchaseRequestModal] Erro ao buscar orçamento:', budgetError);
        throw budgetError;
      }

      console.log('[PurchaseRequestModal] Orçamentos aprovados encontrados:', approvedBudgets?.length);

      if (!approvedBudgets || approvedBudgets.length === 0) {
        console.warn('[PurchaseRequestModal] Nenhum orçamento APROVADO encontrado para esta obra');
        setPhases([]);
        setServices([]);
        setFormData(prev => ({ ...prev, phase_id: null, subphase_id: null }));
        return;
      }

      let selectedBudget = null;
      let macroItems: BudgetItem[] = [];

      for (const budget of approvedBudgets) {
        const { data: allItems, error: itemsError } = await supabase
          .from('budget_items')
          .select('*')
          .eq('budget_id', budget.id)
          .order('ordem', { ascending: true });

        if (itemsError) {
          console.error('[PurchaseRequestModal] Erro ao buscar itens do orçamento:', itemsError);
          continue;
        }

        const itemsWithNumbers = recalculateDisplayNumbers(allItems || []);
        const foundMacros = itemsWithNumbers.filter(item => item.tipo === 'macro');

        console.log(`[PurchaseRequestModal] Orçamento ${budget.id}: ${allItems?.length || 0} itens, ${foundMacros.length} fases`);

        if (foundMacros.length > 0) {
          selectedBudget = budget;
          macroItems = foundMacros;
          break;
        }
      }

      if (!selectedBudget || macroItems.length === 0) {
        console.warn('[PurchaseRequestModal] Nenhum orçamento aprovado COM FASES encontrado para esta obra');
        setPhases([]);
        setServices([]);
        setFormData(prev => ({ ...prev, phase_id: null, subphase_id: null }));
        return;
      }

      console.log('[PurchaseRequestModal] Usando orçamento:', selectedBudget.id, 'com', macroItems.length, 'fases');
      setPhases(macroItems);
      setServices([]);
      setFormData(prev => ({ ...prev, phase_id: null, subphase_id: null }));
      setNewItem(prev => ({ ...prev, phase_id: null, subphase_id: null }));
    } catch (error) {
      console.error('[PurchaseRequestModal] Erro ao carregar fases:', error);
      setPhases([]);
      setServices([]);
      setFormData(prev => ({ ...prev, phase_id: null, subphase_id: null }));
    }
  };

  const loadServices = async (phaseId: string | null) => {
    if (!phaseId) {
      setServices([]);
      setFormData(prev => ({ ...prev, subphase_id: null }));
      setNewItem(prev => ({ ...prev, subphase_id: null }));
      return;
    }

    try {
      const { data: phaseData, error: phaseError } = await supabase
        .from('budget_items')
        .select('budget_id')
        .eq('id', phaseId)
        .maybeSingle();

      if (phaseError) {
        console.error('Erro ao carregar fase:', phaseError);
        setServices([]);
        setFormData(prev => ({ ...prev, subphase_id: null }));
        return;
      }

      if (!phaseData) {
        console.log('Fase não encontrada:', phaseId);
        setServices([]);
        setFormData(prev => ({ ...prev, subphase_id: null }));
        return;
      }

      const { data: allItems, error: itemsError } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', phaseData.budget_id)
        .order('ordem', { ascending: true });

      if (itemsError) {
        console.error('Erro ao carregar itens da fase:', itemsError);
        setServices([]);
        setFormData(prev => ({ ...prev, subphase_id: null }));
        return;
      }

      const itemsWithNumbers = recalculateDisplayNumbers(allItems || []);
      const subfases = itemsWithNumbers.filter(item => item.parent_id === phaseId);

      console.log('Subfases encontradas para fase', phaseId, ':', subfases);
      setServices(subfases);

      if (subfases.length === 1) {
        setFormData(prev => ({ ...prev, subphase_id: subfases[0].id }));
        console.log('Subfase selecionada automaticamente:', subfases[0].id);
      } else {
        setFormData(prev => ({ ...prev, subphase_id: null }));
      }

      setNewItem(prev => ({ ...prev, subphase_id: null }));
    } catch (error) {
      console.error('Erro ao carregar subfases:', error);
      setServices([]);
      setFormData(prev => ({ ...prev, subphase_id: null }));
    }
  };

  const loadItems = async () => {
    if (!request) return;

    try {
      const { data, error } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('request_id', request.id)
        .is('deleted_at', null)
        .order('created_at');

      if (error) throw error;

      const items = data || [];

      if (items.length > 0) {
        const phaseIds = [...new Set(items.map(item => item.phase_id).filter(Boolean))];
        const subphaseIds = [...new Set(items.map(item => item.subphase_id).filter(Boolean))];

        const [phasesData, subphasesData] = await Promise.all([
          phaseIds.length > 0 ? supabase.from('budget_items').select('id, descricao').in('id', phaseIds) : { data: [] },
          subphaseIds.length > 0 ? supabase.from('budget_items').select('id, descricao').in('id', subphaseIds) : { data: [] }
        ]);

        const phasesMap = new Map((phasesData.data || []).map(p => [p.id, p.descricao]));
        const subphasesMap = new Map((subphasesData.data || []).map(s => [s.id, s.descricao]));

        const itemsWithNames = items.map(item => ({
          ...item,
          phase_name: item.phase_id ? phasesMap.get(item.phase_id) : null,
          subphase_name: item.subphase_id ? subphasesMap.get(item.subphase_id) : null
        }));

        setItems(itemsWithNames);
      } else {
        setItems(items);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const loadAttachments = async () => {
    if (!request) return;

    try {
      const { data, error } = await supabase.storage
        .from('purchase-request-attachments')
        .list(`${request.id}/`);

      if (error) {
        console.log('Erro ao listar anexos (pode ser normal se não houver anexos):', error);
        setAttachments([]);
        return;
      }

      const attachmentsList = await Promise.all(
        (data || []).map(async (file) => {
          try {
            const { data: urlData } = await supabase.storage
              .from('purchase-request-attachments')
              .createSignedUrl(`${request.id}/${file.name}`, 3600);

            return {
              name: file.name,
              url: urlData?.signedUrl || ''
            };
          } catch (fileError) {
            console.error('Erro ao criar URL assinada para arquivo:', file.name, fileError);
            return {
              name: file.name,
              url: ''
            };
          }
        })
      );

      setAttachments(attachmentsList.filter(att => att.url !== ''));
    } catch (error) {
      console.error('Erro ao carregar anexos:', error);
      setAttachments([]);
    }
  };

  const handleSave = async () => {
    if (!formData.work_id || !formData.need_date) {
      alert('Preencha os campos obrigatórios: Obra e Data de Necessidade');
      return;
    }

    const hasGlobalPhaseSubphase = formData.phase_id && formData.subphase_id;

    if (!hasGlobalPhaseSubphase) {
      const itemsWithoutPhaseSubphase = items.filter(item => !item.phase_id || !item.subphase_id);
      if (itemsWithoutPhaseSubphase.length > 0) {
        alert('Você deve preencher Fase e Subfase no topo (para todos os itens) OU preencher Fase e Subfase para cada item individualmente');
        return;
      }
    }

    if (items.length === 0) {
      alert('Adicione pelo menos um item');
      return;
    }

    setLoading(true);

    try {
      // Buscar budget_id da obra selecionada (orçamento aprovado)
      let budgetId = null;
      if (formData.work_id) {
        const { data: approvedBudget } = await supabase
          .from('budgets')
          .select('id')
          .eq('work_id', formData.work_id)
          .eq('status', 'aprovado')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        budgetId = approvedBudget?.id || null;
      }

      const cleanedFormData = {
        work_id: formData.work_id || null,
        budget_id: budgetId,
        phase_id: formData.phase_id || null,
        subphase_id: formData.subphase_id || null,
        status: formData.status,
        need_date: formData.need_date || null,
        description: formData.description || null,
        contact_name: formData.contact_name || null,
        contact_whatsapp: formData.contact_whatsapp || null
      };

      if (request) {
        const { error } = await supabase
          .from('purchase_requests')
          .update({
            ...cleanedFormData,
            updated_at: new Date().toISOString()
          })
          .eq('id', request.id);

        if (error) throw error;

        await supabase
          .from('purchase_request_items')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: user?.id || null,
            deletion_reason: 'Atualização de solicitação'
          })
          .eq('request_id', request.id)
          .is('deleted_at', null);

        const hasGlobalPhaseSubphase = formData.phase_id && formData.subphase_id;

        for (const item of items) {
          await supabase
            .from('purchase_request_items')
            .insert([{
              request_id: request.id,
              item_type: item.item_type,
              phase_id: hasGlobalPhaseSubphase ? formData.phase_id : (item.phase_id || null),
              subphase_id: hasGlobalPhaseSubphase ? formData.subphase_id : (item.subphase_id || null),
              item_name: item.item_name,
              complement: item.complement || '',
              quantity: item.quantity,
              unit: item.unit
            }]);
        }
      } else {
        const { data: newRequest, error } = await supabase
          .from('purchase_requests')
          .insert([{
            ...cleanedFormData,
            requester_id: user?.id,
            request_number: ''
          }])
          .select()
          .single();

        if (error) throw error;

        const hasGlobalPhaseSubphase = formData.phase_id && formData.subphase_id;

        for (const item of items) {
          await supabase
            .from('purchase_request_items')
            .insert([{
              request_id: newRequest.id,
              item_type: item.item_type,
              phase_id: hasGlobalPhaseSubphase ? formData.phase_id : (item.phase_id || null),
              subphase_id: hasGlobalPhaseSubphase ? formData.subphase_id : (item.subphase_id || null),
              item_name: item.item_name,
              complement: item.complement || '',
              quantity: item.quantity,
              unit: item.unit
            }]);
        }
      }

      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar solicitação:', error);
      const errorMessage = error?.message || 'Não foi possível salvar a solicitação';
      alert(`Erro: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!request) {
      alert('Salve a solicitação antes de enviar');
      return;
    }

    if (!formData.contact_whatsapp) {
      alert('Informe o número do WhatsApp do contato');
      return;
    }

    setLoading(true);

    try {
      const pdfBlob = await generatePurchaseRequestPDF(request.id);

      if (!pdfBlob) {
        alert('Erro: Não foi possível gerar o PDF da solicitação');
        return;
      }

      const whatsappNumber = formData.contact_whatsapp.replace(/\D/g, '');
      const message = `Olá! Segue a solicitação de compra nº ${request.request_number || 'Novo'} da obra ${formData.work_id ? works.find(w => w.id === formData.work_id)?.name : ''}.`;

      const whatsappUrl = `https://api.whatsapp.com/send?phone=55${whatsappNumber}&text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, '_blank');

      alert('WhatsApp aberto! Envie o PDF manualmente após fazer o download.');

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `solicitacao_${request.request_number || 'novo'}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Erro ao enviar por WhatsApp:', error);
      alert('Erro: Não foi possível enviar por WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToQuotation = async () => {
    if (!request) {
      alert('Salve a solicitação primeiro');
      return;
    }

    if (items.length === 0) {
      showError('Adicione itens antes de converter para mapa de cotação');
      return;
    }

    showConfirm(
      'Deseja converter esta solicitação em mapa de cotação?',
      async () => {
        setLoading(true);
        await executeConvertToQuotation();
      },
      {
        type: 'info',
        confirmText: 'Sim, converter',
        cancelText: 'Cancelar'
      }
    );
  };

  const executeConvertToQuotation = async () => {

    try {
      await supabase
        .from('purchase_requests')
        .update({ status: 'mapa' })
        .eq('id', request.id);

      const { data: newQuotation, error: quotationError } = await supabase
        .from('quotations')
        .insert([{
          request_id: request.id,
          work_id: request.work_id,
          status: 'nova_cotacao',
          responsible_id: user?.id,
          description: request.description || '',
          delivery_address: ''
        }])
        .select()
        .single();

      if (quotationError) throw quotationError;

      showSuccess('Mapa de cotação criado com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Erro ao converter para mapa de cotação:', error);
      showError('Não foi possível converter para mapa de cotação');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.item_name || newItem.quantity <= 0) {
      alert('Preencha o nome do item e quantidade');
      return;
    }

    const hasGlobalPhaseSubphase = formData.phase_id && formData.subphase_id;

    if (!hasGlobalPhaseSubphase && (!newItem.phase_id || !newItem.subphase_id)) {
      alert('Preencha Fase e Subfase para o item (ou preencha Fase e Subfase no topo para aplicar a todos os itens)');
      return;
    }

    if (request) {
      try {
        const { data, error } = await supabase
          .from('purchase_request_items')
          .insert([{
            request_id: request.id,
            ...newItem
          }])
          .select()
          .single();

        if (error) throw error;

        const phaseName = newItem.phase_id ? phases.find(p => p.id === newItem.phase_id)?.descricao : null;
        const subphaseName = newItem.subphase_id ? services.find(s => s.id === newItem.subphase_id)?.descricao : null;

        const itemWithNames = {
          ...data,
          phase_name: phaseName,
          subphase_name: subphaseName
        };

        setItems([...items, itemWithNames]);
        setNewItem({
          item_type: 'item_livre',
          phase_id: null,
          subphase_id: null,
          item_name: '',
          complement: '',
          quantity: 0,
          unit: ''
        });
      } catch (error: any) {
        console.error('Erro ao adicionar item:', error);
        alert('Erro: Não foi possível adicionar o item');
      }
    } else {
      const tempItem: PurchaseRequestItem = {
        id: `temp-${Date.now()}`,
        request_id: '',
        ...newItem,
        created_at: new Date().toISOString()
      };
      setItems([...items, tempItem]);
      setNewItem({
        item_type: 'item_livre',
        phase_id: null,
        subphase_id: null,
        item_name: '',
        complement: '',
        quantity: 0,
        unit: ''
      });
    }
  };

  const handleDeleteAllItems = () => {
    showConfirm(
      'Tem certeza que deseja excluir TODOS os itens? Esta ação não pode ser desfeita.',
      async () => {
        if (request) {
          const itemsToDelete = items.filter(item => !item.id.startsWith('temp-'));
          if (itemsToDelete.length > 0) {
            try {
              const { error } = await supabase
                .from('purchase_request_items')
                .delete()
                .eq('request_id', request.id);

              if (error) throw error;
              showSuccess('Todos os itens foram excluídos!');
            } catch (error: any) {
              console.error('Erro ao excluir itens:', error);
              showError('Não foi possível excluir os itens');
              return;
            }
          }
        }

        setItems([]);
      },
      {
        type: 'danger',
        confirmText: 'Sim, excluir todos',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleDeleteItem = (itemId: string) => {
    showConfirm(
      'Tem certeza que deseja excluir este item?',
      async () => {
        if (request && !itemId.startsWith('temp-')) {
          try {
            const { error } = await supabase
              .from('purchase_request_items')
              .delete()
              .eq('id', itemId);

            if (error) throw error;
            showSuccess('Item excluído com sucesso!');
          } catch (error: any) {
            console.error('Erro ao excluir item:', error);
            showError('Não foi possível excluir o item');
            return;
          }
        }

        setItems(items.filter(item => item.id !== itemId));
      },
      {
        type: 'danger',
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleEditItem = (item: PurchaseRequestItem) => {
    setEditingItemId(item.id);
    setEditingItem({ ...item });
    if (item.phase_id) {
      loadServices(item.phase_id);
    }
  };

  const handleSaveEditItem = () => {
    if (!editingItem || !editingItemId) return;

    const phaseName = editingItem.phase_id ? phases.find(p => p.id === editingItem.phase_id)?.descricao : null;
    const subphaseName = editingItem.subphase_id ? services.find(s => s.id === editingItem.subphase_id)?.descricao : null;

    const itemWithNames = {
      ...editingItem,
      phase_name: phaseName,
      subphase_name: subphaseName
    };

    const updatedItems = items.map(item =>
      item.id === editingItemId ? itemWithNames : item
    );
    setItems(updatedItems);
    setEditingItemId(null);
    setEditingItem(null);
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItem(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!request || !e.target.files?.length) return;

    const file = e.target.files[0];

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'image/svg+xml'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Tipo de arquivo não permitido. Por favor, envie apenas PDF ou imagens (JPG, PNG, GIF, BMP, WEBP, SVG).');
      e.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Arquivo muito grande. O tamanho máximo permitido é 10MB.');
      e.target.value = '';
      return;
    }

    const filePath = `${request.id}/${file.name}`;

    try {
      const { error } = await supabase.storage
        .from('purchase-request-attachments')
        .upload(filePath, file);

      if (error) throw error;
      loadAttachments();
      e.target.value = '';
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro: Não foi possível fazer upload do arquivo');
    }
  };

  const handleDeleteAttachment = (fileName: string) => {
    if (!request) return;

    showConfirm(
      'Tem certeza que deseja excluir este anexo?',
      async () => {
        try {
          const { error } = await supabase.storage
            .from('purchase-request-attachments')
            .remove([`${request.id}/${fileName}`]);

          if (error) throw error;
          loadAttachments();
          showSuccess('Anexo excluído com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir anexo:', error);
          showError('Não foi possível excluir o anexo');
        }
      },
      {
        type: 'danger',
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {request ? `Solicitação ${request.request_number}` : 'Nova Solicitação'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('dados')}
            className={`px-6 py-3 font-medium transition-colors rounded-t-lg ${
              activeTab === 'dados'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'dados' ? { backgroundColor: conktColors.primary.blue } : {}}
          >
            Dados
          </button>
          <button
            onClick={() => setActiveTab('anexos')}
            className={`px-6 py-3 font-medium transition-colors rounded-t-lg ${
              activeTab === 'anexos'
                ? 'text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'anexos' ? { backgroundColor: conktColors.primary.blue } : {}}
            disabled={!request}
          >
            Anexos
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'dados' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Necessidade *
                </label>
                <input
                  type="date"
                  value={formData.need_date}
                  onChange={(e) => setFormData({ ...formData, need_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ color: '#000000' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={selectedClientId || ''}
                    onChange={(e) => {
                      const clientId = e.target.value || null;
                      setSelectedClientId(clientId);
                      setFormData({ ...formData, work_id: null, phase_id: null, subphase_id: null });
                      loadWorks(clientId);
                      setPhases([]);
                      setServices([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                  {clients.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">Nenhum cliente cadastrado no sistema</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Obra *
                  </label>
                  <select
                    value={formData.work_id || ''}
                    onChange={(e) => {
                      const workId = e.target.value || null;
                      setFormData({ ...formData, work_id: workId, phase_id: null, subphase_id: null });
                      loadPhases(workId);
                      setServices([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                    disabled={!selectedClientId}
                  >
                    <option value="">Selecione a obra...</option>
                    {works.map(work => (
                      <option key={work.id} value={work.id}>{work.name}</option>
                    ))}
                  </select>
                  {!selectedClientId && (
                    <p className="text-xs text-gray-500 mt-1">Selecione um cliente primeiro</p>
                  )}
                  {selectedClientId && works.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">Nenhuma obra cadastrada para este cliente</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fase
                  </label>
                  <select
                    value={formData.phase_id || ''}
                    onChange={(e) => {
                      const phaseId = e.target.value || null;
                      setFormData({ ...formData, phase_id: phaseId, subphase_id: null });
                      if (phaseId) {
                        loadServices(phaseId);
                      } else {
                        setServices([]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                    disabled={!formData.work_id}
                  >
                    <option value="">Selecione a Fase...</option>
                    {phases.map(phase => (
                      <option key={phase.id} value={phase.id}>
                        FASE: {phase.descricao}
                      </option>
                    ))}
                  </select>
                  {!formData.work_id && (
                    <p className="text-xs text-gray-500 mt-1">Selecione uma obra primeiro</p>
                  )}
                  {formData.work_id && phases.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">Nenhuma fase cadastrada para esta obra</p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">Se preenchido, será aplicado a todos os itens</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subfase
                  </label>
                  <select
                    value={formData.subphase_id || ''}
                    onChange={(e) => setFormData({ ...formData, subphase_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                    disabled={!formData.phase_id}
                  >
                    <option value="">Selecione a Subfase...</option>
                    {services.map(service => (
                      <option key={service.id} value={service.id}>
                        SUBFASE: {service.descricao}
                      </option>
                    ))}
                  </select>
                  {!formData.phase_id && (
                    <p className="text-xs text-gray-500 mt-1">Selecione uma fase primeiro</p>
                  )}
                  {formData.phase_id && services.length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">Nenhuma subfase cadastrada para esta fase</p>
                  )}
                  {formData.phase_id && services.length === 1 && (
                    <p className="text-xs text-green-600 mt-1">Subfase selecionada automaticamente</p>
                  )}
                  <p className="text-xs text-blue-600 mt-1">Se preenchido, será aplicado a todos os itens</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                    placeholder="Nome do contato para cotação"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_whatsapp}
                    onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ color: '#000000' }}
                  placeholder="Descrição geral da solicitação"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Item</h3>

                {formData.phase_id && formData.subphase_id && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Fase/Subfase global definida:</strong> Todos os itens usarão automaticamente a fase e subfase selecionadas no topo
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo *
                    </label>
                    <select
                      value={newItem.item_type}
                      onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#000000' }}
                    >
                      <option value="item_livre">Item Livre</option>
                      <option value="insumo">Insumo</option>
                      <option value="servico">Serviço</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fase <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newItem.phase_id || ''}
                      onChange={(e) => {
                        const phaseId = e.target.value || null;
                        setNewItem(prev => ({ ...prev, phase_id: phaseId, subphase_id: null }));
                        if (phaseId) {
                          loadServices(phaseId);
                        } else {
                          setServices([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#000000' }}
                      disabled={phases.length === 0 || (formData.phase_id && formData.subphase_id)}
                    >
                      <option value="">Selecione uma fase...</option>
                      {phases.map(phase => (
                        <option key={phase.id} value={phase.id}>
                          FASE: {phase.descricao}
                        </option>
                      ))}
                    </select>
                    {(formData.phase_id && formData.subphase_id) && (
                      <p className="text-xs text-blue-600 mt-1">Usando fase/subfase global</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subfase <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newItem.subphase_id || ''}
                      onChange={(e) => setNewItem(prev => ({ ...prev, subphase_id: e.target.value || null }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#000000' }}
                      disabled={services.length === 0 || (formData.phase_id && formData.subphase_id)}
                    >
                      <option value="">Selecione uma subfase...</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          SUBFASE: {service.descricao}
                        </option>
                      ))}
                    </select>
                    {newItem.phase_id && services.length === 0 && !(formData.phase_id && formData.subphase_id) && (
                      <p className="text-xs text-orange-600 mt-1">Nenhuma subfase cadastrada para esta fase</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item *
                    </label>
                    <input
                      type="text"
                      value={newItem.item_name}
                      onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#000000' }}
                      placeholder="Nome do item"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#000000' }}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade *
                    </label>
                    <select
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ color: '#000000' }}
                    >
                      <option value="">Selecione...</option>
                      <option value="vb">vb</option>
                      <option value="unid">unid</option>
                      <option value="m²">m²</option>
                      <option value="m³">m³</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={newItem.complement}
                    onChange={(e) => setNewItem({ ...newItem, complement: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ color: '#000000' }}
                    placeholder="Informações adicionais"
                  />
                </div>

                <button
                  onClick={handleAddItem}
                  className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#10B981', color: '#000000' }}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Item
                </button>
              </div>

              {items.length > 0 && (
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: '#000000' }}>Itens Adicionados</h3>
                    <button
                      onClick={handleDeleteAllItems}
                      className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
                      title="Deletar todos os itens"
                    >
                      <Trash2 className="w-4 h-4" />
                      Deletar Todos
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium uppercase" style={{ color: '#000000' }}>Item</th>
                          <th className="px-2 py-2 text-left text-xs font-medium uppercase" style={{ color: '#000000' }}>Fase</th>
                          <th className="px-2 py-2 text-left text-xs font-medium uppercase" style={{ color: '#000000' }}>Subfase</th>
                          <th className="px-2 py-2 text-center text-xs font-medium uppercase" style={{ color: '#000000' }}>Qtd</th>
                          <th className="px-2 py-2 text-center text-xs font-medium uppercase" style={{ color: '#000000' }}>Und</th>
                          <th className="px-2 py-2 text-center text-xs font-medium uppercase" style={{ color: '#000000' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.id}>
                            {editingItemId === item.id && editingItem ? (
                              <>
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={editingItem.item_name}
                                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    style={{ color: '#000000' }}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    value={editingItem.phase_id || ''}
                                    onChange={(e) => {
                                      const phaseId = e.target.value || null;
                                      setEditingItem({ ...editingItem, phase_id: phaseId, subphase_id: null });
                                      if (phaseId) {
                                        loadServices(phaseId);
                                      } else {
                                        setServices([]);
                                      }
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    style={{ color: '#000000' }}
                                  >
                                    <option value="">-</option>
                                    {phases.map(phase => (
                                      <option key={phase.id} value={phase.id}>
                                        FASE: {phase.descricao}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    value={editingItem.subphase_id || ''}
                                    onChange={(e) => setEditingItem({ ...editingItem, subphase_id: e.target.value || null })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                    style={{ color: '#000000' }}
                                  >
                                    <option value="">-</option>
                                    {services.map(service => (
                                      <option key={service.id} value={service.id}>
                                        SUBFASE: {service.descricao}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="number"
                                    value={editingItem.quantity}
                                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center"
                                    style={{ color: '#000000' }}
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <select
                                    value={editingItem.unit}
                                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-center"
                                    style={{ color: '#000000' }}
                                  >
                                    <option value="">-</option>
                                    <option value="vb">vb</option>
                                    <option value="unid">unid</option>
                                    <option value="m²">m²</option>
                                    <option value="m³">m³</option>
                                    <option value="m">m</option>
                                  </select>
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={handleSaveEditItem}
                                      className="text-green-600 hover:text-green-900 p-1"
                                      title="Salvar"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={handleCancelEditItem}
                                      className="text-gray-600 hover:text-gray-900 p-1"
                                      title="Cancelar"
                                    >
                                      ✗
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-2 py-2">
                                  <div className="font-medium" style={{ color: '#000000' }}>{item.item_name}</div>
                                  {item.complement && (
                                    <div className="text-xs" style={{ color: '#000000' }}>{item.complement}</div>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-xs" style={{ color: '#000000' }}>
                                  {formData.phase_id && formData.subphase_id
                                    ? phases.find(p => p.id === formData.phase_id)?.descricao || '-'
                                    : (item as any).phase_name || '-'}
                                </td>
                                <td className="px-2 py-2 text-xs" style={{ color: '#000000' }}>
                                  {formData.phase_id && formData.subphase_id
                                    ? services.find(s => s.id === formData.subphase_id)?.descricao || '-'
                                    : (item as any).subphase_name || '-'}
                                </td>
                                <td className="px-2 py-2 text-center" style={{ color: '#000000' }}>{item.quantity}</td>
                                <td className="px-2 py-2 text-center" style={{ color: '#000000' }}>{item.unit}</td>
                                <td className="px-2 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => handleEditItem(item)}
                                      className="text-blue-600 hover:text-blue-900 p-1"
                                      title="Editar"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="text-red-600 hover:text-red-900 p-1"
                                      title="Excluir"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'anexos' && request && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adicionar Anexo (PDF ou Imagem)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Tipos aceitos: PDF, JPG, JPEG, PNG, GIF, BMP, WEBP, SVG
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Anexos</h3>
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {attachment.name}
                          </a>
                        </div>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200">
          <div>
            {request && (
              <button
                onClick={handleSendWhatsApp}
                disabled={loading}
                className="px-4 py-2 rounded-md text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: '#25D366' }}
                title="Enviar PDF por WhatsApp"
              >
                <Send className="w-4 h-4" />
                Enviar por WhatsApp
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-cancel"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 rounded-md text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
      <AlertComponent />
    </div>
  );
}
