import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, CheckCircle, XCircle, FileText, DollarSign, Trash2, Building2, Eye, CreditCard as Edit, Printer } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { PurchaseRequest, Quotation, PurchaseRequestItem } from '../../types/purchase';
import { useAuth } from '../../contexts/AuthContext';
import { useAlert } from '../../hooks/useAlert';
import { generateQuotationPDF } from '../../utils/quotationPdfGenerator';
import { generateQuotationComparisonPDF } from '../../utils/quotationComparisonPdfGenerator';

interface Supplier {
  id: string;
  name: string;
  fantasy_name: string;
}

interface QuotationsManagerProps {
  onNavigateHome: () => void;
  onNavigateToOrders?: () => void;
}

interface QuotationComparisonProps {
  quotations: (Quotation & { supplier_name?: string })[];
  requestItems: PurchaseRequestItem[];
  handleApproveQuotation: (id: string) => void;
  handleRejectQuotation: (id: string) => void;
  processing: boolean;
  selectedRequest: PurchaseRequest | null;
}

function QuotationComparison({ quotations, requestItems, handleApproveQuotation, handleRejectQuotation, processing, selectedRequest }: QuotationComparisonProps) {
  const [quotationItems, setQuotationItems] = useState<{ [quotationId: string]: { [itemId: string]: { unit_price: number; total_price: number } } }>({});
  const [loading, setLoading] = useState(true);

  console.log('🗺️ [MAPA] QuotationComparison renderizado');
  console.log('🗺️ [MAPA] Props recebidas - quotations:', quotations.length, 'cotações');
  console.log('🗺️ [MAPA] Props - cotações com approved:', quotations.map(q => ({ id: q.id, approved: q.approved, status: q.status })));
  console.log('🗺️ [MAPA] Props - processing:', processing);

  useEffect(() => {
    console.log('🗺️ [MAPA] useEffect disparado, quotations mudou');
    console.log('🗺️ [MAPA] useEffect - quotations.length:', quotations.length);
    loadQuotationItems();
  }, [quotations]);

  const loadQuotationItems = async () => {
    setLoading(true);
    try {
      const itemsMap: { [quotationId: string]: { [itemId: string]: { unit_price: number; total_price: number } } } = {};

      for (const quotation of quotations) {
        const { data } = await supabase
          .from('quotation_items')
          .select('request_item_id, unit_price, total_price')
          .eq('quotation_id', quotation.id);

        if (data) {
          itemsMap[quotation.id] = {};
          data.forEach(item => {
            itemsMap[quotation.id][item.request_item_id] = {
              unit_price: item.unit_price,
              total_price: item.total_price
            };
          });
        }
      }

      setQuotationItems(itemsMap);
    } catch (error) {
      console.error('Erro ao carregar itens das cotações:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLowestPrice = (itemId: string) => {
    const prices = quotations
      .map(q => quotationItems[q.id]?.[itemId]?.unit_price || 0)
      .filter(p => p > 0);

    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  const calculatePerfectBudget = () => {
    let total = 0;
    requestItems.forEach(item => {
      const lowestPrice = getLowestPrice(item.id);
      total += lowestPrice * item.quantity;
    });
    return total;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6 flex items-center justify-center">
        <p className="text-gray-500">Carregando comparação...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold" style={{ color: arcoColors.primary.blue }}>
          Mapa de Cotação - Comparação Detalhada
        </h3>
        <button
          onClick={() => {
            generateQuotationComparisonPDF({
              quotations,
              requestItems,
              quotationItems,
              selectedRequest: selectedRequest || undefined
            });
          }}
          className="px-4 py-2 rounded-md text-white flex items-center gap-2 hover:opacity-90"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          <Printer className="w-4 h-4" />
          Imprimir PDF
        </button>
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left border" style={{ color: '#000000', minWidth: '200px' }}>
                Item
              </th>
              <th className="px-3 py-2 text-center border" style={{ color: '#000000', width: '60px' }}>
                Qtd
              </th>
              <th className="px-3 py-2 text-center border" style={{ color: '#000000', width: '50px' }}>
                Und
              </th>
              <th className="px-3 py-2 text-center border bg-green-50" style={{ color: '#10B981', minWidth: '140px' }}>
                <div className="font-bold">Orçamento Perfeito</div>
                <div className="text-xs font-normal text-gray-600 mt-1">Menor Valor Unit.</div>
              </th>
              {quotations.map(quot => (
                <th key={quot.id} className="px-3 py-2 text-center border" style={{ color: '#000000', minWidth: '140px' }}>
                  <div className="font-semibold">{quot.supplier_name}</div>
                  <div className="text-xs font-normal text-gray-600 mt-1">Valor Unit.</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requestItems.map((item, index) => {
              const lowestPrice = getLowestPrice(item.id);

              return (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 border" style={{ color: '#000000' }}>
                    {item.item_name}
                  </td>
                  <td className="px-3 py-2 text-center border" style={{ color: '#000000' }}>
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-center border" style={{ color: '#000000' }}>
                    {item.unit}
                  </td>
                  <td className="px-3 py-2 text-center border bg-green-50" style={{ color: '#10B981', fontWeight: 'bold' }}>
                    {lowestPrice > 0
                      ? lowestPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '-'
                    }
                  </td>
                  {quotations.map(quot => {
                    const itemData = quotationItems[quot.id]?.[item.id];
                    const unitPrice = itemData?.unit_price || 0;
                    const isLowest = unitPrice > 0 && unitPrice === lowestPrice;

                    return (
                      <td
                        key={quot.id}
                        className="px-3 py-2 text-center border"
                        style={{
                          color: isLowest ? '#10B981' : '#000000',
                          fontWeight: isLowest ? 'bold' : 'normal'
                        }}
                      >
                        {unitPrice > 0
                          ? unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : '-'
                        }
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="bg-blue-50 font-bold">
              <td colSpan={3} className="px-3 py-3 text-right border" style={{ color: '#000000' }}>
                Valor Total:
              </td>
              <td className="px-3 py-3 text-center border bg-green-100" style={{ color: '#10B981', fontWeight: 'bold' }}>
                {calculatePerfectBudget().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              {quotations.map(quot => (
                <td key={quot.id} className="px-3 py-3 text-center border" style={{ color: arcoColors.primary.blue }}>
                  {quot.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-100">
              <td colSpan={3} className="px-3 py-2 text-right border" style={{ color: '#000000' }}>
                Prazo de Entrega:
              </td>
              <td className="px-3 py-2 text-center border text-sm" style={{ color: '#000000' }}>-</td>
              {quotations.map(quot => (
                <td key={quot.id} className="px-3 py-2 text-center border text-sm" style={{ color: '#000000' }}>
                  {quot.delivery_time || '-'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-100">
              <td colSpan={3} className="px-3 py-2 text-right border" style={{ color: '#000000' }}>
                Condições de Pagamento:
              </td>
              <td className="px-3 py-2 text-center border text-sm" style={{ color: '#000000' }}>-</td>
              {quotations.map(quot => (
                <td key={quot.id} className="px-3 py-2 text-center border text-sm" style={{ color: '#000000' }}>
                  {quot.payment_conditions || '-'}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50">
              <td colSpan={3} className="px-3 py-3 text-right border font-semibold" style={{ color: '#000000' }}>
                Ações:
              </td>
              <td className="px-3 py-3 text-center border" style={{ color: '#000000' }}>-</td>
              {quotations.map(quot => {
                console.log('🎨 [RENDER] Renderizando botão para cotação ID:', quot.id, 'approved:', quot.approved, 'status:', quot.status);
                return (
                  <td key={quot.id} className="px-3 py-3 text-center border">
                    {!quot.approved && (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            console.log('🔘 [BOTÃO] onClick disparado no botão Aprovar');
                            e.stopPropagation();
                            e.preventDefault();
                            console.log('🔘 [BOTÃO] Chamando handleApproveQuotation com ID:', quot.id);
                            handleApproveQuotation(quot.id);
                            console.log('🔘 [BOTÃO] handleApproveQuotation chamado');
                          }}
                          disabled={processing}
                          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          title="Aprovar e Gerar PC"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleRejectQuotation(quot.id)}
                          disabled={processing}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Rejeitar"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {quot.approved && (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                        Aprovada
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">
          <strong>Legenda:</strong> Os valores em <strong style={{ color: '#10B981' }}>verde negrito</strong> representam os menores preços unitários de cada item.
        </p>
      </div>
    </div>
  );
}

export default function QuotationsManager({ onNavigateHome, onNavigateToOrders }: QuotationsManagerProps) {
  const { user, session, prepareAuthHeader } = useAuth();
  const { showSuccess, showError, showConfirm, AlertComponent } = useAlert();
  const [requests, setRequests] = useState<(PurchaseRequest & { work_name?: string })[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [requestItems, setRequestItems] = useState<PurchaseRequestItem[]>([]);
  const [quotations, setQuotations] = useState<(Quotation & { supplier_name?: string })[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showAddQuotation, setShowAddQuotation] = useState(false);
  const [showEditQuotation, setShowEditQuotation] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonKey, setComparisonKey] = useState(0);
  const [filters, setFilters] = useState({
    work_id: '',
    supplier_id: '',
    date_start: '',
    date_end: ''
  });
  const [works, setWorks] = useState<any[]>([]);

  const [newQuotation, setNewQuotation] = useState({
    supplier_id: '',
    delivery_time: '',
    payment_conditions: '',
    observations: ''
  });

  const [quotationPrices, setQuotationPrices] = useState<{ [itemId: string]: number }>({});

  useEffect(() => {
    loadRequests();
    loadSuppliers();
    loadWorks();
  }, [filters]);

  useEffect(() => {
    if (selectedRequest) {
      loadRequestItems(selectedRequest.id);
      loadQuotations(selectedRequest.id);
    }
  }, [selectedRequest]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('purchase_requests')
        .select(`
          *,
          works (name)
        `)
        .eq('status', 'cotando')
        .is('deleted_at', null);

      if (filters.work_id) {
        query = query.eq('work_id', filters.work_id);
      }

      if (filters.date_start) {
        query = query.gte('created_at', filters.date_start);
      }

      if (filters.date_end) {
        query = query.lte('created_at', filters.date_end + 'T23:59:59');
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const requestsWithWork = (data || []).map(req => ({
        ...req,
        work_name: req.works?.name
      }));

      setRequests(requestsWithWork);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestItems = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_request_items')
        .select('*')
        .eq('request_id', requestId)
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

        setRequestItems(itemsWithNames as any);
      } else {
        setRequestItems(items);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    }
  };

  const loadQuotations = async (requestId: string) => {
    console.log('📥 [loadQuotations] INICIANDO para requestId:', requestId);
    try {
      console.log('📥 [loadQuotations] Fazendo query no Supabase...');
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          suppliers (name, fantasy_name)
        `)
        .eq('request_id', requestId)
        .is('deleted_at', null)
        .neq('status', 'aprovada')
        .order('created_at', { ascending: false });

      console.log('📥 [loadQuotations] Query concluída');
      console.log('📥 [loadQuotations] Error:', error);
      console.log('📥 [loadQuotations] Data recebida:', data);

      if (error) throw error;

      const quotationsWithSupplier = (data || []).map(quot => ({
        ...quot,
        supplier_name: quot.suppliers?.fantasy_name || quot.suppliers?.name
      }));

      console.log('📥 [loadQuotations] Cotações processadas:', quotationsWithSupplier.length, 'encontradas');
      console.log('📥 [loadQuotations] IDs das cotações:', quotationsWithSupplier.map(q => q.id));
      console.log('📥 [loadQuotations] Status das cotações:', quotationsWithSupplier.map(q => ({ id: q.id, approved: q.approved, status: q.status })));
      console.log('📥 [loadQuotations] Chamando setQuotations...');
      setQuotations(quotationsWithSupplier);
      console.log('📥 [loadQuotations] setQuotations chamado');
    } catch (error) {
      console.error('📥 [loadQuotations] ❌ Erro ao carregar cotações:', error);
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

  const loadWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setWorks(data || []);
    } catch (error) {
      console.error('Erro ao carregar obras:', error);
    }
  };

  const handleAddQuotation = () => {
    setShowAddQuotation(true);
    setNewQuotation({
      supplier_id: '',
      delivery_time: '',
      payment_conditions: '',
      observations: ''
    });
    setQuotationPrices({});
  };

  const handleSaveQuotation = async () => {
    if (!selectedRequest || !newQuotation.supplier_id) {
      showError('Selecione um fornecedor');
      return;
    }

    const allItemsPriced = requestItems.every(item => quotationPrices[item.id] > 0);
    if (!allItemsPriced) {
      showError('Preencha o preço de todos os itens');
      return;
    }

    setSaving(true);

    try {
      const totalValue = requestItems.reduce((sum, item) => {
        const unitPrice = quotationPrices[item.id] || 0;
        return sum + (unitPrice * item.quantity);
      }, 0);

      const { data: quotation, error: quotError } = await supabase
        .from('quotations')
        .insert([{
          request_id: selectedRequest.id,
          supplier_id: newQuotation.supplier_id,
          total_value: totalValue,
          delivery_time: newQuotation.delivery_time,
          payment_conditions: newQuotation.payment_conditions,
          observations: newQuotation.observations,
          status: 'pendente',
          phase_id: selectedRequest.phase_id,
          subphase_id: selectedRequest.subphase_id
        }])
        .select()
        .single();

      if (quotError) throw quotError;

      for (const item of requestItems) {
        const unitPrice = quotationPrices[item.id] || 0;
        await supabase
          .from('quotation_items')
          .insert([{
            quotation_id: quotation.id,
            request_item_id: item.id,
            unit_price: unitPrice,
            total_price: unitPrice * item.quantity,
            phase_id: item.phase_id,
            subphase_id: item.subphase_id
          }]);
      }

      // Buscar base_number e atualizar para C-XXXX
      const { data: requestData } = await supabase
        .from('purchase_requests')
        .select('base_number')
        .eq('id', selectedRequest.id)
        .single();

      if (requestData?.base_number) {
        await supabase
          .from('purchase_requests')
          .update({
            status: 'cotando',
            request_number: `C-${requestData.base_number}`
          })
          .eq('id', selectedRequest.id);
      } else {
        await supabase
          .from('purchase_requests')
          .update({ status: 'cotando' })
          .eq('id', selectedRequest.id);
      }

      setShowAddQuotation(false);
      setNewQuotation({
        supplier_id: '',
        delivery_time: '',
        payment_conditions: '',
        observations: ''
      });
      setQuotationPrices({});
      loadQuotations(selectedRequest.id);
      loadRequests();
      showSuccess('Cotação adicionada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar cotação:', error);
      showError('Não foi possível salvar a cotação');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveQuotation = (quotationId: string) => {
    console.log('🚀 [HANDLER] handleApproveQuotation INICIADO com quotationId:', quotationId);
    console.log('🚀 [HANDLER] processing atual:', processing);
    console.log('🚀 [HANDLER] selectedRequest:', selectedRequest);

    if (processing) {
      console.log('⚠️ [HANDLER] BLOQUEADO: já está processando');
      showError('Já está processando outra operação. Aguarde.');
      return;
    }

    if (!selectedRequest) {
      console.log('⚠️ [HANDLER] BLOQUEADO: nenhuma solicitação selecionada');
      showError('Nenhuma solicitação selecionada');
      return;
    }

    console.log('🔔 [HANDLER] Mostrando modal de confirmação...');
    showConfirm(
      'Você deseja aprovar esse orçamento?',
      async () => {
        console.log('✅ [CONFIRM] Callback do modal INICIADO');
        console.log('✅ [CONFIRM] processing antes de verificar:', processing);

        if (processing) {
          console.log('⚠️ [CONFIRM] ABORTADO: processing=true');
          return;
        }

        console.log('🔒 [CONFIRM] Setando processing=true');
        setProcessing(true);

        try {
          if (!selectedRequest) {
            throw new Error('Nenhuma solicitação selecionada');
          }

          if (!user?.id) {
            throw new Error('Usuário não autenticado');
          }

          console.log('📡 [EDGE] Iniciando chamada Edge Function...');
          console.log('[Frontend] Chamando Edge Function para aprovar cotação...', {
            quotation_id: quotationId,
            request_id: selectedRequest.id,
            work_id: selectedRequest.work_id,
            user_id: user.id
          });

          console.log('[Frontend] Preparando Authorization header com token válido...');
          const authHeader = await prepareAuthHeader();

          if (!authHeader) {
            throw new Error('Não foi possível obter token válido. Por favor, faça login novamente.');
          }

          console.log('[Frontend] ✅ Authorization header preparado');
          console.log('[Frontend] 🔑 Authorization header (primeiros 50 chars):', authHeader.substring(0, 50));
          console.log('[Frontend] 🔑 Enviando para:', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-quotation-and-create-order`);
          console.log('[Frontend] 🏢 Projeto Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
          console.log('[Frontend] 📋 Headers que serão enviados:', {
            'Content-Type': 'application/json',
            'Authorization': `${authHeader.substring(0, 50)}...`,
            'apikey': `${import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 30)}...`
          });

          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-quotation-and-create-order`;

          console.log('📡 [EDGE] Fazendo fetch...');
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              quotation_id: quotationId,
              request_id: selectedRequest.id,
              work_id: selectedRequest.work_id,
              user_id: user.id
            })
          });
          console.log('📡 [EDGE] Fetch concluído, lendo resposta...');

          let result;
          const responseText = await response.text();

          console.log('[Frontend] Response Status:', response.status);
          console.log('[Frontend] Response Body:', responseText);

          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error('[Frontend] ❌ Erro ao parsear resposta JSON:', parseError);
            throw new Error(`Edge Function retornou resposta inválida (HTTP ${response.status}):\n\n${responseText.substring(0, 500)}`);
          }

          if (!response.ok || !result.success) {
            console.error('[Frontend] ❌ Edge Function falhou:', {
              status: response.status,
              statusText: response.statusText,
              body: result
            });

            let errorMessage = `[HTTP ${response.status}] `;

            if (result.error) {
              errorMessage += result.error;
            } else if (result.message) {
              errorMessage += result.message;
            } else {
              errorMessage += 'Erro desconhecido';
            }

            if (result.details) {
              if (typeof result.details === 'string') {
                errorMessage += `\n\nDetalhes: ${result.details}`;
              } else {
                errorMessage += `\n\nDetalhes: ${JSON.stringify(result.details, null, 2)}`;
              }
            }

            if (result.stack) {
              errorMessage += `\n\nStack: ${result.stack}`;
            }

            throw new Error(errorMessage);
          }

          console.log('[Frontend] ✅ Edge Function executada com sucesso:', result);

          console.log('⏳ [PROPAGAÇÃO] Aguardando 500ms para propagação...');
          await new Promise(resolve => setTimeout(resolve, 500));
          console.log('⏳ [PROPAGAÇÃO] Delay concluído');

          console.log('🔄 [RELOAD] Iniciando reload de dados...');
          console.log('🔄 [RELOAD] Antes de loadQuotations, selectedRequest.id:', selectedRequest.id);
          const loadPromise1 = loadQuotations(selectedRequest.id);
          console.log('🔄 [RELOAD] loadQuotations disparado');
          const loadPromise2 = loadRequests();
          console.log('🔄 [RELOAD] loadRequests disparado');

          await Promise.all([loadPromise1, loadPromise2]);
          console.log('🔄 [RELOAD] ✅ Dados recarregados com sucesso');

          console.log('🔄 [RELOAD] Estado das cotações APÓS reload:', quotations.length, 'cotações');
          console.log('🔄 [RELOAD] Estado das solicitações APÓS reload:', requests.length, 'solicitações');

          console.log('🏠 [NAV] Executando navegação Voltar (fecha mapa + volta para lista)...');
          console.log('🏠 [NAV] Antes: showComparison=', showComparison, ', selectedRequest=', selectedRequest);
          setShowComparison(false);
          console.log('🏠 [NAV] setShowComparison(false) chamado');
          setSelectedRequest(null);
          console.log('🏠 [NAV] setSelectedRequest(null) chamado');
          setComparisonKey(prev => prev + 1);
          console.log('🏠 [NAV] setComparisonKey incrementado');

          showSuccess(`${result.message || 'Pedido de Compra gerado com sucesso!'}\n\nO pedido foi criado com todos os dados (obra, fornecedor, centro de custo, itens e forma de pagamento) e os valores foram lançados automaticamente no Orçamento → Realizado por Centro de Custo.`);

          if (onNavigateToOrders) {
            console.log('🏠 [NAV] onNavigateToOrders disponível, executando em 1.5s...');
            setTimeout(() => {
              console.log('🏠 [NAV] Executando onNavigateToOrders agora');
              onNavigateToOrders();
            }, 1500);
          } else {
            console.log('🏠 [NAV] onNavigateToOrders NÃO disponível');
          }
        } catch (error: any) {
          console.error('[Frontend] ❌ Erro ao aprovar cotação:', error);
          const errorMessage = error.message || 'Não foi possível aprovar a cotação';
          showError(`Erro ao aprovar: ${errorMessage}`);
        } finally {
          console.log('🔓 [FINALLY] Setando processing=false');
          setProcessing(false);
          console.log('🔓 [FINALLY] processing agora é false');
        }
      },
      {
        type: 'info',
        confirmText: 'Sim, aprovar',
        cancelText: 'Cancelar'
      }
    );
    console.log('🔔 [HANDLER] showConfirm executado, aguardando resposta do usuário');
  };

  const handleRejectQuotation = (quotationId: string) => {
    if (processing) return;

    showConfirm(
      'Deseja rejeitar esta cotação?',
      async () => {
        if (processing) return;
        setProcessing(true);

        try {
          await supabase
            .from('quotations')
            .update({ status: 'rejeitada' })
            .eq('id', quotationId);

          loadQuotations(selectedRequest!.id);
          showSuccess('Cotação rejeitada com sucesso!');
        } catch (error: any) {
          console.error('Erro ao rejeitar cotação:', error);
          showError('Não foi possível rejeitar a cotação');
        } finally {
          setProcessing(false);
        }
      },
      {
        type: 'danger',
        confirmText: 'Sim, rejeitar',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleToggleRequestFrozen = async (requestId: string, currentFrozen: boolean) => {
    if (processing) return;

    const action = currentFrozen ? 'descongelar' : 'congelar';

    showConfirm(
      `Deseja ${action} esta solicitação?`,
      async () => {
        if (processing) return;
        setProcessing(true);

        try {
          await supabase
            .from('purchase_requests')
            .update({ frozen: !currentFrozen })
            .eq('id', requestId);

          showSuccess(`Solicitação ${currentFrozen ? 'descongelada' : 'congelada'} com sucesso!`);
          loadRequests();
        } catch (error: any) {
          console.error('Erro ao alterar status de congelamento:', error);
          showError('Não foi possível alterar o status da solicitação');
        } finally {
          setProcessing(false);
        }
      },
      {
        type: 'info',
        confirmText: `Sim, ${action}`,
        cancelText: 'Cancelar'
      }
    );
  };

  const handleToggleFrozen = async (quotationId: string, currentFrozen: boolean) => {
    if (processing) return;

    const action = currentFrozen ? 'descongelar' : 'congelar';

    showConfirm(
      `Deseja ${action} esta cotação?`,
      async () => {
        if (processing) return;
        setProcessing(true);

        try {
          await supabase
            .from('quotations')
            .update({ frozen: !currentFrozen })
            .eq('id', quotationId);

          showSuccess(`Cotação ${currentFrozen ? 'descongelada' : 'congelada'} com sucesso!`);
          loadQuotations(selectedRequest!.id);
        } catch (error: any) {
          console.error('Erro ao alterar status de congelamento:', error);
          showError('Não foi possível alterar o status da cotação');
        } finally {
          setProcessing(false);
        }
      },
      {
        type: 'info',
        confirmText: `Sim, ${action}`,
        cancelText: 'Cancelar'
      }
    );
  };

  const handleEditQuotation = async (quotation: Quotation & { supplier_name?: string }) => {
    setEditingQuotation(quotation);

    const { data: items } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', quotation.id)
      .is('deleted_at', null);

    if (items) {
      const prices: { [key: string]: number } = {};
      items.forEach(item => {
        prices[item.request_item_id] = item.unit_price;
      });
      setQuotationPrices(prices);
    }

    setNewQuotation({
      supplier_id: quotation.supplier_id,
      delivery_time: quotation.delivery_time || '',
      payment_conditions: quotation.payment_conditions || '',
      observations: quotation.observations || ''
    });

    setShowEditQuotation(true);
  };

  const handleUpdateQuotation = async () => {
    if (!editingQuotation) return;

    if (!newQuotation.supplier_id) {
      showError('Selecione um fornecedor');
      return;
    }

    const allItemsPriced = requestItems.every(item => quotationPrices[item.id] > 0);
    if (!allItemsPriced) {
      showError('Preencha o preço de todos os itens');
      return;
    }

    setSaving(true);

    try {
      const totalValue = requestItems.reduce((sum, item) => {
        const unitPrice = quotationPrices[item.id] || 0;
        return sum + (unitPrice * item.quantity);
      }, 0);

      const { error: quotError } = await supabase
        .from('quotations')
        .update({
          supplier_id: newQuotation.supplier_id,
          total_value: totalValue,
          delivery_time: newQuotation.delivery_time,
          payment_conditions: newQuotation.payment_conditions,
          observations: newQuotation.observations,
        })
        .eq('id', editingQuotation.id);

      if (quotError) throw quotError;

      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', editingQuotation.id);

      for (const item of requestItems) {
        const unitPrice = quotationPrices[item.id] || 0;
        await supabase
          .from('quotation_items')
          .insert([{
            quotation_id: editingQuotation.id,
            request_item_id: item.id,
            unit_price: unitPrice,
            total_price: unitPrice * item.quantity
          }]);
      }

      setShowEditQuotation(false);
      setEditingQuotation(null);
      setNewQuotation({
        supplier_id: '',
        delivery_time: '',
        payment_conditions: '',
        observations: ''
      });
      setQuotationPrices({});
      loadQuotations(selectedRequest!.id);
      showSuccess('Cotação atualizada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar cotação:', error);
      showError('Não foi possível atualizar a cotação');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintQuotation = async (quotationId: string) => {
    try {
      const blob = await generateQuotationPDF(quotationId);
      if (!blob) {
        showError('Erro ao gerar PDF da cotação');
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cotacao_${quotationId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showSuccess('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError('Erro ao gerar PDF da cotação');
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    try {
      const { data: orders, error: orderError } = await supabase
        .from('purchase_orders')
        .select('id, order_number')
        .eq('quotation_id', quotationId)
        .is('deleted_at', null);

      if (orderError) {
        console.error('Erro ao verificar vínculos:', orderError);
        showError(`Erro ao verificar vínculos: ${orderError.message}`);
        return;
      }

      if (orders && orders.length > 0) {
        const orderNumbers = orders.map(o => o.order_number).join(', ');
        showConfirm(
          `Esta cotação tem ${orders.length} pedido(s) vinculado(s): ${orderNumbers}.\n\nDeseja excluir tudo (Pedido + Cotação)?\n\nISTO TAMBÉM REMOVERÁ OS VALORES DO REALIZADO!`,
          async () => {
            try {
              const deletedAt = new Date().toISOString();

              for (const order of orders) {
                await supabase
                  .from('budget_realized')
                  .update({
                    deleted_at: deletedAt,
                    deleted_by: user?.id || null,
                    deletion_reason: 'Exclusão em cascata do pedido'
                  })
                  .eq('purchase_order_id', order.id)
                  .is('deleted_at', null);

                await supabase
                  .from('purchase_orders')
                  .update({
                    deleted_at: deletedAt,
                    deleted_by: user?.id || null,
                    deletion_reason: 'Exclusão em cascata da cotação'
                  })
                  .eq('id', order.id);
              }

              await supabase
                .from('quotation_items')
                .update({
                  deleted_at: deletedAt,
                  deleted_by: user?.id || null,
                  deletion_reason: 'Exclusão em cascata da cotação'
                })
                .eq('quotation_id', quotationId)
                .is('deleted_at', null);

              const { error } = await supabase
                .from('quotations')
                .update({
                  deleted_at: deletedAt,
                  deleted_by: user?.id || null,
                  deletion_reason: 'Excluído pelo usuário (com pedidos)'
                })
                .eq('id', quotationId);

              if (error) throw error;

              await loadQuotations(selectedRequest!.id);
              showSuccess('Cotação, pedidos e valores realizados excluídos com sucesso!');
            } catch (error: any) {
              console.error('Erro ao excluir em cascata:', error);
              showError(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
            }
          },
          {
            type: 'danger',
            confirmText: 'Sim, excluir tudo',
            cancelText: 'Cancelar'
          }
        );
        return;
      }
    } catch (error: any) {
      console.error('Erro ao verificar vínculos:', error);
      showError(`Erro ao verificar vínculos: ${error.message || 'Erro desconhecido'}`);
      return;
    }

    showConfirm(
      'Tem certeza que deseja excluir esta cotação?',
      async () => {
        try {
          const deletedAt = new Date().toISOString();

          await supabase
            .from('quotation_items')
            .update({
              deleted_at: deletedAt,
              deleted_by: user?.id || null,
              deletion_reason: 'Exclusão em cascata da cotação'
            })
            .eq('quotation_id', quotationId)
            .is('deleted_at', null);

          const { error } = await supabase
            .from('quotations')
            .update({
              deleted_at: deletedAt,
              deleted_by: user?.id || null,
              deletion_reason: 'Excluído pelo usuário'
            })
            .eq('id', quotationId);

          if (error) {
            console.error('Erro ao excluir cotação:', error);
            throw error;
          }

          await loadQuotations(selectedRequest!.id);
          showSuccess('Cotação excluída com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir cotação:', error);
          showError(`Não foi possível excluir a cotação: ${error.message || 'Erro desconhecido'}`);
        }
      },
      {
        type: 'danger',
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      const { data: quotations, error: quotError } = await supabase
        .from('quotations')
        .select('id')
        .eq('request_id', requestId)
        .is('deleted_at', null);

      if (quotError) {
        console.error('Erro ao verificar cotações:', quotError);
        showError(`Erro ao verificar vínculos: ${quotError.message}`);
        return;
      }

      if (quotations && quotations.length > 0) {
        showConfirm(
          `Esta requisição tem ${quotations.length} cotação(ões) vinculada(s).\n\nDeseja excluir tudo (Requisição + Cotações + Pedidos)?\n\nISTO TAMBÉM REMOVERÁ OS VALORES DO REALIZADO!`,
          async () => {
            try {
              const deletedAt = new Date().toISOString();

              for (const quot of quotations) {
                const { data: orders } = await supabase
                  .from('purchase_orders')
                  .select('id')
                  .eq('quotation_id', quot.id)
                  .is('deleted_at', null);

                if (orders && orders.length > 0) {
                  for (const order of orders) {
                    await supabase
                      .from('budget_realized')
                      .update({
                        deleted_at: deletedAt,
                        deleted_by: user?.id || null,
                        deletion_reason: 'Exclusão em cascata da requisição'
                      })
                      .eq('purchase_order_id', order.id)
                      .is('deleted_at', null);

                    await supabase
                      .from('purchase_orders')
                      .update({
                        deleted_at: deletedAt,
                        deleted_by: user?.id || null,
                        deletion_reason: 'Exclusão em cascata da requisição'
                      })
                      .eq('id', order.id);
                  }
                }

                await supabase
                  .from('quotation_items')
                  .update({
                    deleted_at: deletedAt,
                    deleted_by: user?.id || null,
                    deletion_reason: 'Exclusão em cascata da requisição'
                  })
                  .eq('quotation_id', quot.id)
                  .is('deleted_at', null);

                await supabase
                  .from('quotations')
                  .update({
                    deleted_at: deletedAt,
                    deleted_by: user?.id || null,
                    deletion_reason: 'Exclusão em cascata da requisição'
                  })
                  .eq('id', quot.id);
              }

              await supabase
                .from('purchase_request_items')
                .update({
                  deleted_at: deletedAt,
                  deleted_by: user?.id || null,
                  deletion_reason: 'Exclusão em cascata da requisição'
                })
                .eq('request_id', requestId)
                .is('deleted_at', null);

              const { error } = await supabase
                .from('purchase_requests')
                .update({
                  deleted_at: deletedAt,
                  deleted_by: user?.id || null,
                  deletion_reason: 'Excluído pelo usuário (com cotações)'
                })
                .eq('id', requestId);

              if (error) throw error;

              await loadRequests();
              showSuccess('Requisição, cotações, pedidos e valores realizados excluídos com sucesso!');
            } catch (error: any) {
              console.error('Erro ao excluir em cascata:', error);
              showError(`Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
            }
          },
          {
            type: 'danger',
            confirmText: 'Sim, excluir tudo',
            cancelText: 'Cancelar'
          }
        );
        return;
      }
    } catch (error: any) {
      console.error('Erro ao verificar vínculos:', error);
      showError(`Erro ao verificar vínculos: ${error.message || 'Erro desconhecido'}`);
      return;
    }

    showConfirm(
      'Tem certeza que deseja excluir esta requisição?',
      async () => {
        try {
          const deletedAt = new Date().toISOString();

          await supabase
            .from('purchase_request_items')
            .update({
              deleted_at: deletedAt,
              deleted_by: user?.id || null,
              deletion_reason: 'Exclusão em cascata da requisição'
            })
            .eq('request_id', requestId)
            .is('deleted_at', null);

          const { error } = await supabase
            .from('purchase_requests')
            .update({
              deleted_at: deletedAt,
              deleted_by: user?.id || null,
              deletion_reason: 'Excluído pelo usuário'
            })
            .eq('id', requestId);

          if (error) {
            console.error('Erro ao excluir requisição:', error);
            throw error;
          }

          await loadRequests();
          showSuccess('Requisição excluída com sucesso!');
        } catch (error: any) {
          console.error('Erro ao excluir requisição:', error);
          showError(`Não foi possível excluir a requisição: ${error.message || 'Erro desconhecido'}`);
        }
      },
      {
        type: 'danger',
        confirmText: 'Sim, excluir',
        cancelText: 'Cancelar'
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedRequest(null)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: arcoColors.primary.blue }} />
            </button>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: arcoColors.primary.blue }}>
                {selectedRequest.request_number}
              </h2>
              <p className="text-sm text-gray-600">{selectedRequest.work_name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!showComparison && (
              <button
                onClick={handleAddQuotation}
                className="px-4 py-2 rounded-md text-white flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: '#10B981' }}
              >
                <Plus className="w-4 h-4" />
                Nova Cotação
              </button>
            )}
            {quotations.length >= 2 && !showComparison && (
              <button
                onClick={() => {
                  setComparisonKey(prev => prev + 1);
                  setShowComparison(true);
                }}
                className="px-4 py-2 rounded-md text-white flex items-center gap-2 hover:opacity-90"
                style={{ backgroundColor: arcoColors.primary.orange }}
              >
                <FileText className="w-4 h-4" />
                Mapa de cotação
              </button>
            )}
            {showComparison && (
              <button
                onClick={() => setShowComparison(false)}
                className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Voltar para Lista
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {showAddQuotation || showEditQuotation ? (
            <div className="max-w-4xl mx-auto bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.primary.blue }}>
                {showEditQuotation ? 'Editar Cotação' : 'Nova Cotação'}
              </h3>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornecedor *
                  </label>
                  <select
                    value={newQuotation.supplier_id}
                    onChange={(e) => setNewQuotation({ ...newQuotation, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ color: '#000000' }}
                  >
                    <option value="">Selecione...</option>
                    {suppliers.map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.fantasy_name || sup.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prazo de Entrega
                    </label>
                    <input
                      type="text"
                      value={newQuotation.delivery_time}
                      onChange={(e) => setNewQuotation({ ...newQuotation, delivery_time: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      style={{ color: '#000000' }}
                      placeholder="Ex: 15 dias"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condições de Pagamento
                    </label>
                    <input
                      type="text"
                      value={newQuotation.payment_conditions}
                      onChange={(e) => setNewQuotation({ ...newQuotation, payment_conditions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      style={{ color: '#000000' }}
                      placeholder="Ex: 30/60 dias"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    value={newQuotation.observations}
                    onChange={(e) => setNewQuotation({ ...newQuotation, observations: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    style={{ color: '#000000' }}
                    rows={3}
                  />
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-md font-semibold mb-3" style={{ color: '#000000' }}>Preços dos Itens</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left" style={{ color: '#000000' }}>Item</th>
                        <th className="px-4 py-2 text-left" style={{ color: '#000000' }}>Fase</th>
                        <th className="px-4 py-2 text-left" style={{ color: '#000000' }}>Subfase</th>
                        <th className="px-4 py-2 text-center" style={{ color: '#000000' }}>Qtd</th>
                        <th className="px-4 py-2 text-center" style={{ color: '#000000' }}>Und</th>
                        <th className="px-4 py-2 text-right" style={{ color: '#000000' }}>Preço Unit.</th>
                        <th className="px-4 py-2 text-right" style={{ color: '#000000' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {requestItems.map(item => {
                        const unitPrice = quotationPrices[item.id] || 0;
                        const total = unitPrice * item.quantity;
                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-2" style={{ color: '#000000' }}>{item.item_name}</td>
                            <td className="px-4 py-2 text-xs" style={{ color: '#666' }}>{(item as any).phase_name || '-'}</td>
                            <td className="px-4 py-2 text-xs" style={{ color: '#666' }}>{(item as any).subphase_name || '-'}</td>
                            <td className="px-4 py-2 text-center" style={{ color: '#000000' }}>{item.quantity}</td>
                            <td className="px-4 py-2 text-center" style={{ color: '#000000' }}>{item.unit}</td>
                            <td className="px-4 py-2">
                              <div className="flex items-center">
                                <span className="mr-1" style={{ color: '#000000' }}>R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={quotationPrices[item.id] || ''}
                                  onChange={(e) => setQuotationPrices({
                                    ...quotationPrices,
                                    [item.id]: parseFloat(e.target.value) || 0
                                  })}
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-right"
                                  style={{ color: '#000000' }}
                                  placeholder="0,00"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right font-medium" style={{ color: '#000000' }}>
                              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 font-semibold">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right" style={{ color: '#000000' }}>Total Geral:</td>
                        <td className="px-4 py-2 text-right" style={{ color: '#000000' }}>
                          {requestItems.reduce((sum, item) => {
                            const unitPrice = quotationPrices[item.id] || 0;
                            return sum + (unitPrice * item.quantity);
                          }, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    if (showEditQuotation) {
                      setShowEditQuotation(false);
                      setEditingQuotation(null);
                    } else {
                      setShowAddQuotation(false);
                    }
                    setNewQuotation({
                      supplier_id: '',
                      delivery_time: '',
                      payment_conditions: '',
                      observations: ''
                    });
                    setQuotationPrices({});
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={showEditQuotation ? handleUpdateQuotation : handleSaveQuotation}
                  disabled={saving}
                  className="px-4 py-2 rounded-md text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#10B981' }}
                >
                  {saving ? 'Salvando...' : (showEditQuotation ? 'Atualizar Cotação' : 'Salvar Cotação')}
                </button>
              </div>
            </div>
          ) : showComparison ? (
            <QuotationComparison
              key={comparisonKey}
              quotations={quotations.filter(q => q.status !== 'rejeitada')}
              requestItems={requestItems}
              handleApproveQuotation={handleApproveQuotation}
              handleRejectQuotation={handleRejectQuotation}
              processing={processing}
              selectedRequest={selectedRequest}
            />
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.primary.blue }}>
                Cotações Recebidas
              </h3>
              {quotations.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma cotação cadastrada ainda</p>
                  <p className="text-sm mt-1">Clique em "Nova Cotação" para começar</p>
                </div>
              ) : (
                <>
                  <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="min-w-[230px]">
                          <span className="text-sm font-semibold" style={{ color: '#000000' }}>Fornecedor</span>
                        </div>
                        <div className="min-w-[120px]">
                          <span className="text-sm font-semibold" style={{ color: '#000000' }}>Código</span>
                        </div>
                        <div className="min-w-[110px]">
                          <span className="text-sm font-semibold" style={{ color: '#000000' }}>Data</span>
                        </div>
                        <div className="min-w-[140px]">
                          <span className="text-sm font-semibold" style={{ color: '#000000' }}>Valor Total</span>
                        </div>
                      </div>
                      <div className="min-w-[200px] text-center">
                        <span className="text-sm font-semibold" style={{ color: '#000000' }}>Ações</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(() => {
                      const minValue = Math.min(...quotations.map(q => q.total_value));

                      return quotations.map(quot => {
                        const createdDate = new Date(quot.created_at);
                        const isCheapest = quot.total_value === minValue;
                        const isFrozen = quot.frozen || false;

                        return (
                          <div key={quot.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between gap-6">
                              <div className="flex items-center gap-6 flex-1">
                                <div className="flex items-center gap-2 min-w-[230px]">
                                  <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="font-semibold text-base" style={{ color: '#000000' }}>
                                    {quot.supplier_name}
                                  </span>
                                </div>

                                <div className="min-w-[120px]">
                                  <div className="flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm" style={{ color: '#000000' }}>
                                      {selectedRequest?.request_number}
                                    </span>
                                  </div>
                                </div>

                                <div className="min-w-[110px]">
                                  <span className="text-sm" style={{ color: '#000000' }}>
                                    {createdDate.toLocaleDateString('pt-BR')}
                                  </span>
                                </div>

                                <div className="min-w-[140px]">
                                  <span
                                    className="text-base font-semibold"
                                    style={{ color: isCheapest ? '#10B981' : '#000000' }}
                                  >
                                    {quot.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 min-w-[280px] justify-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrintQuotation(quot.id);
                                  }}
                                  className="p-2 hover:bg-blue-50 rounded transition-colors"
                                  style={{ color: arcoColors.primary.blue }}
                                  title="Visualizar PDF"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditQuotation(quot);
                                  }}
                                  disabled={isFrozen}
                                  className="p-2 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  style={{ color: arcoColors.primary.blue }}
                                  title={isFrozen ? 'Cotação congelada' : 'Editar'}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteQuotation(quot.id);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b p-3">
        <button
          onClick={onNavigateHome}
          className="mb-3 px-4 py-2 rounded-md font-medium text-white flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{
            backgroundColor: arcoColors.primary.blue
          }}
          title="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </button>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-shrink-0" style={{ width: '180px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Obra</label>
            <select
              value={filters.work_id}
              onChange={(e) => setFilters({ ...filters, work_id: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            >
              <option value="">Todas as Obras</option>
              {works.map(work => (
                <option key={work.id} value={work.id}>{work.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-shrink-0" style={{ width: '180px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
            <select
              value={filters.supplier_id}
              onChange={(e) => setFilters({ ...filters, supplier_id: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            >
              <option value="">Todos os Fornecedores</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.fantasy_name || supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-shrink-0" style={{ width: '150px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Inicial</label>
            <input
              type="date"
              value={filters.date_start}
              onChange={(e) => setFilters({ ...filters, date_start: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            />
          </div>

          <div className="flex-shrink-0" style={{ width: '150px' }}>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Final</label>
            <input
              type="date"
              value={filters.date_end}
              onChange={(e) => setFilters({ ...filters, date_end: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ color: '#000000' }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {requests.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma solicitação pronta para cotação</p>
            <p className="text-sm">As solicitações aparecem aqui quando estão no status "Cotando"</p>
          </div>
        ) : (
          <>
            <div className="mb-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-6 flex-1">
                  <div className="min-w-[120px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Cotações</span>
                  </div>
                  <div className="min-w-[100px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Status</span>
                  </div>
                  <div className="min-w-[180px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Obra</span>
                  </div>
                  <div className="min-w-[140px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Necessidade</span>
                  </div>
                  <div className="min-w-[100px]">
                    <span className="text-sm font-semibold" style={{ color: '#000000' }}>Data</span>
                  </div>
                </div>
                <div className="min-w-[180px] text-center">
                  <span className="text-sm font-semibold" style={{ color: '#000000' }}>Ações</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {requests.map(req => {
              const createdDate = new Date(req.created_at);
              const needDate = req.need_date ? new Date(req.need_date) : null;
              const isOverdue = needDate && needDate < new Date();

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-gray-200 px-4 py-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-semibold text-base" style={{ color: '#000000' }}>
                          {req.request_number}
                        </span>
                      </div>

                      <div className="min-w-[100px]">
                        <span
                          className="px-3 py-1.5 rounded-full text-xs font-medium inline-block"
                          style={{
                            backgroundColor: '#f59e0b',
                            color: '#FFFFFF'
                          }}
                        >
                          Cotando
                        </span>
                      </div>

                      <div className="min-w-[180px]">
                        {req.work_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm truncate" style={{ color: '#000000' }}>
                              {req.work_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>

                      <div className="min-w-[140px]">
                        {needDate ? (
                          <span className={`text-sm font-medium`} style={{ color: isOverdue ? '#DC2626' : '#000000' }}>
                            {needDate.toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>

                      <div className="min-w-[100px]">
                        <span className="text-sm" style={{ color: '#000000' }}>
                          {createdDate.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 min-w-[180px] justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRequest(req);
                        }}
                        className="p-2 hover:bg-blue-50 rounded transition-colors"
                        style={{ color: arcoColors.primary.blue }}
                        title="Ver Cotações"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(req.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </>
        )}
      </div>
      <AlertComponent />
    </div>
  );
}
