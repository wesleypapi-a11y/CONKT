import { useState, useEffect, useRef } from 'react';
import { X, Plus, Save, Trash2, Upload, Printer, Eraser, ArrowUp, ArrowDown, Dices, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { generateBudgetPDF } from '../../utils/budgetPdfGenerator';
import { syncAllPurchaseOrdersToRealized } from '../../utils/budgetRealized';
import TemplateImportModal from './TemplateImportModal';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';

interface BudgetItem {
  id?: string;
  display_number: string;
  orcamento: string;
  etapa: string;
  descricao: string;
  tipo: 'macro' | 'item';
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  obs: string;
  parent_id: string | null;
  ordem: number;
  macro_number?: number;
  isNew?: boolean;
}

interface BudgetEditorProps {
  isOpen: boolean;
  onClose: () => void;
  budgetId: string;
  readOnly?: boolean;
}

const UNIDADES = ['m²', 'm³', 'un', 'kg', 'h', 'vb', 'outro'];
const ETAPAS = ['CINZA', 'ACABAMENTO'];

export default function BudgetEditor({ isOpen, onClose, budgetId, readOnly = false }: BudgetEditorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [budgetInfo, setBudgetInfo] = useState({
    titulo: '',
    validade: '',
    revisao: '00',
    status: 'em_preenchimento',
    foto_obra_url: '',
    areas: [
      { nome: '', area: 0 },
      { nome: '', area: 0 },
      { nome: '', area: 0 },
      { nome: '', area: 0 },
    ],
  });
  const [workInfo, setWorkInfo] = useState({
    name: '',
    work_address: '',
    photo_url: '',
  });
  const [clientInfo, setClientInfo] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj_cpf: '',
  });
  const [currentWorkId, setCurrentWorkId] = useState<string>('');
  const [availableWorks, setAvailableWorks] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [realizedValues, setRealizedValues] = useState<{ [key: string]: number }>({});
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (isOpen && budgetId) {
      loadBudget();
      loadItems();
      loadRealizedValues();
      loadAvailableWorks();

      // Auto-refresh realizado a cada 10 segundos
      const interval = setInterval(() => {
        loadRealizedValues();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [isOpen, budgetId]);


  useEffect(() => {
    if (isOpen && budgetId && items.length === 0) {
      loadDefaultTemplate();
    }
  }, [items, isOpen, budgetId]);

  const loadDefaultTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_templates')
        .select('*')
        .eq('is_default', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error loading default template:', error);
        return;
      }

      if (data && data.itens && Array.isArray(data.itens) && data.itens.length > 0) {
        applyTemplateItems(data.itens);
      }
    } catch (err) {
      console.error('Error in loadDefaultTemplate:', err);
    }
  };

  const applyTemplateItems = (templateItems: any[]) => {
    const mappedItems: BudgetItem[] = templateItems.map((item, index) => ({
      display_number: '',
      orcamento: item.ORÇAMENTO || item.orcamento || '',
      etapa: item.ETAPA || item.etapa || 'CINZA',
      descricao: item.Descrição || item.descricao || item.DESCRIÇÃO || '',
      tipo: item.MACRO ? 'macro' : 'item',
      unidade: item.UNIDADE || item.unidade || 'un',
      quantidade: parseFloat(item.QUANTIDADE || item.quantidade || '0'),
      valor_unitario: parseFloat(item['VALOR UNIT'] || item['VALOR_UNIT'] || item.valor_unitario || '0'),
      valor_total: parseFloat(item.TOTAL || item.total || '0'),
      obs: item.OBS || item.obs || '',
      parent_id: null,
      ordem: index,
      isNew: true,
    }));

    setItems(recalculateDisplayNumbers(mappedItems));
  };

  const recalculateDisplayNumbers = (itemsList: BudgetItem[]) => {
    let currentPhaseNumber = 0;
    let currentSubphaseNumber = 0;
    let lastMacroIndex: number = -1;
    let lastMacroId: string | null = null;
    let lastMacroDisplayNumber: string = '';
    const childCounters: { [key: string]: number } = {};

    const updatedItems = itemsList.map((item, index) => {
      if (item.tipo === 'macro') {
        // Checar se já tem numeração (importado ou editado)
        if (item.orcamento && item.orcamento.includes('.')) {
          // É uma SUBFASE (ex: "1.1", "2.3")
          const parts = item.orcamento.split('.');
          currentPhaseNumber = parseInt(parts[0]) || currentPhaseNumber;
          currentSubphaseNumber = parseInt(parts[1]) || 0;
          const displayNum = `${currentPhaseNumber}.${currentSubphaseNumber}`;

          lastMacroIndex = index;
          lastMacroId = item.id || null;
          lastMacroDisplayNumber = displayNum;
          childCounters[displayNum] = 0;

          return {
            ...item,
            display_number: displayNum,
            orcamento: displayNum,
            parent_id: item.parent_id,
          };
        } else {
          // É uma FASE (ex: "1", "2")
          currentPhaseNumber++;
          currentSubphaseNumber = 0;
          const displayNum = String(currentPhaseNumber);

          childCounters[displayNum] = 0;
          lastMacroIndex = index;
          lastMacroId = item.id || null;
          lastMacroDisplayNumber = displayNum;

          return {
            ...item,
            display_number: displayNum,
            orcamento: displayNum,
            macro_number: currentPhaseNumber,
            parent_id: null,
          };
        }
      } else {
        if (lastMacroDisplayNumber) {
          childCounters[lastMacroDisplayNumber] = (childCounters[lastMacroDisplayNumber] || 0) + 1;

          let parentId: string | null = null;
          if (item.parent_id && !item.parent_id.startsWith('__MACRO_INDEX_')) {
            parentId = item.parent_id;
          } else if (lastMacroId) {
            parentId = lastMacroId;
          } else {
            parentId = `__MACRO_INDEX_${lastMacroIndex}__`;
          }

          return {
            ...item,
            display_number: `${lastMacroDisplayNumber}.${childCounters[lastMacroDisplayNumber]}`,
            parent_id: parentId,
          };
        } else {
          return {
            ...item,
            display_number: String(index + 1),
            parent_id: null,
          };
        }
      }
    });

    return updatedItems;
  };

  const loadBudget = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .single();

      if (error) throw error;

      if (data) {
        const areasData = Array.isArray(data.areas) && data.areas.length === 4
          ? data.areas
          : [
              { nome: '', area: 0 },
              { nome: '', area: 0 },
              { nome: '', area: 0 },
              { nome: '', area: 0 },
            ];

        setBudgetInfo({
          titulo: data.titulo || '',
          validade: data.validade || '',
          revisao: data.revisao || '00',
          status: data.status || 'em_preenchimento',
          foto_obra_url: data.foto_obra_url || '',
          areas: areasData,
        });

        setCurrentWorkId(data.work_id || '');

        if (data.work_id) {
          const { data: work } = await supabase
            .from('works')
            .select('*')
            .eq('id', data.work_id)
            .maybeSingle();

          if (work) {
            setWorkInfo({
              name: work.name || '',
              work_address: work.work_address || '',
              photo_url: work.photo_url || '',
            });

            if (!data.foto_obra_url && work.photo_url) {
              setBudgetInfo(prev => ({ ...prev, foto_obra_url: work.photo_url }));
            }

            if (work.client_id) {
              const { data: client } = await supabase
                .from('clients')
                .select('*')
                .eq('id', work.client_id)
                .maybeSingle();

              if (client) {
                setClientInfo({
                  nome_fantasia: client.name || '',
                  razao_social: client.name || '',
                  cnpj_cpf: client.cpf_cnpj || '',
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading budget:', error);
    }
  };

  const loadAvailableWorks = async () => {
    try {
      const { data, error } = await supabase
        .from('works')
        .select('id, name')
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;

      setAvailableWorks(data || []);
    } catch (error) {
      console.error('Error loading works:', error);
    }
  };

  const loadItems = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetId)
        .order('ordem', { ascending: true });

      if (error) throw error;

      const formattedItems = (data || []).map((item) => ({
        id: item.id,
        display_number: '',
        orcamento: item.orcamento || '',
        etapa: item.etapa || 'CINZA',
        descricao: item.descricao || '',
        tipo: item.tipo || 'item',
        unidade: item.unidade || 'un',
        quantidade: item.quantidade || 0,
        valor_unitario: item.valor_unitario || 0,
        valor_total: item.valor_total || 0,
        obs: item.obs || '',
        parent_id: item.parent_id,
        ordem: item.ordem,
      }));

      setItems(recalculateDisplayNumbers(formattedItems));
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const syncPurchaseOrders = async () => {
    if (!user?.id) {
      console.warn('[BudgetEditor] Usuário não autenticado, pulando sincronização');
      return;
    }

    try {
      const result = await syncAllPurchaseOrdersToRealized(user.id);

      if (!result.success) {
        console.error('[BudgetEditor] Erro na sincronização:', result.error);
      }
    } catch (error) {
      console.error('[BudgetEditor] Erro ao sincronizar pedidos:', error);
    }
  };

  const loadRealizedValues = async () => {
    try {
      await syncPurchaseOrders();

      const { data: entriesData, error } = await supabase
        .from('budget_realized')
        .select('phase_id, subphase_id, amount')
        .eq('budget_id', budgetId)
        .is('deleted_at', null);

      if (error) throw error;

      const realized: { [key: string]: number } = {};

      for (const entry of entriesData || []) {
        const key = entry.subphase_id || entry.phase_id;
        if (key) {
          realized[key] = (realized[key] || 0) + (entry.amount || 0);
        }
      }

      setRealizedValues(realized);
    } catch (error) {
      console.error('Error loading realized values:', error);
    }
  };

  const handleManualSync = async () => {
    if (!user?.id) return;

    setSyncing(true);
    try {
      await syncPurchaseOrders();
      await loadRealizedValues();
      alert('Sincronização concluída! Os valores foram atualizados.');
    } catch (error) {
      console.error('Error during manual sync:', error);
      alert('Erro ao sincronizar pedidos');
    } finally {
      setSyncing(false);
    }
  };

  const addNewLine = () => {
    const newItem: BudgetItem = {
      display_number: '',
      orcamento: '',
      etapa: 'CINZA',
      descricao: '',
      tipo: 'item',
      unidade: 'un',
      quantidade: 0,
      valor_unitario: 0,
      valor_total: 0,
      obs: '',
      parent_id: null,
      ordem: items.length,
      isNew: true,
    };
    const updatedItems = recalculateDisplayNumbers([...items, newItem]);
    setItems(updatedItems);
  };

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            alert('O arquivo Excel está vazio ou não tem dados suficientes.');
            return;
          }

          const rows = jsonData.slice(1);
          const importedItems: BudgetItem[] = [];
          let lastMacro: BudgetItem | null = null;
          let lastPhase: BudgetItem | null = null;

          rows.forEach((row) => {
            if (row.length === 0) return;

            const etapa = String(row[1] || 'CINZA').toUpperCase();
            const descricao = String(row[2] || '');
            const macroValue = String(row[3] || '').toLowerCase().trim();
            const isMacro = macroValue === 'sim' || macroValue === 's' || macroValue === 'yes' || macroValue === 'y' || macroValue === 'true' || macroValue === '1';
            const unidade = isMacro ? 'un' : String(row[4] || 'un');
            const quantidade = isMacro ? 0 : (parseFloat(String(row[5] || '0')) || 0);
            const valorUnitario = isMacro ? 0 : (parseFloat(String(row[6] || '0')) || 0);
            const orcamento = String(row[8] || '');
            const obs = String(row[9] || '');

            let parentId = null;
            if (isMacro) {
              // Se o número tem ponto, é subfase - vincula à fase
              if (orcamento.includes('.')) {
                parentId = lastPhase?.id || null;
              } else {
                // É uma fase - não tem parent
                parentId = null;
              }
            } else {
              // Item normal - vincula à última macro
              parentId = lastMacro?.id || null;
            }

            const newItem: BudgetItem = {
              display_number: '',
              orcamento,
              etapa: ETAPAS.includes(etapa) ? etapa : 'CINZA',
              descricao,
              tipo: isMacro ? 'macro' : 'item',
              unidade: UNIDADES.includes(unidade) ? unidade : 'un',
              quantidade,
              valor_unitario: valorUnitario,
              valor_total: isMacro ? 0 : (quantidade * valorUnitario),
              obs,
              parent_id: parentId,
              ordem: items.length + importedItems.length,
              isNew: true,
            };

            if (isMacro) {
              lastMacro = newItem;
              // Se não tem ponto, é uma fase
              if (!orcamento.includes('.')) {
                lastPhase = newItem;
              }
            }

            importedItems.push(newItem);
          });

          if (importedItems.length > 0) {
            const updatedItems = recalculateDisplayNumbers([...items, ...importedItems]);
            setItems(updatedItems);
            alert(`${importedItems.length} itens importados com sucesso!`);
          } else {
            alert('Nenhum item válido encontrado no arquivo.');
          }

        } catch (error) {
          console.error('Error parsing Excel:', error);
          alert('Erro ao ler o arquivo Excel. Verifique o formato.');
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Erro ao ler o arquivo.');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateItem = (index: number, field: keyof BudgetItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantidade' || field === 'valor_unitario') {
      const qtd = field === 'quantidade' ? value : newItems[index].quantidade;
      const valorUnit = field === 'valor_unitario' ? value : newItems[index].valor_unitario;
      newItems[index].valor_total = qtd * valorUnit;
    }

    if (field === 'tipo') {
      if (value === 'macro') {
        newItems[index].quantidade = 0;
        newItems[index].valor_unitario = 0;
        newItems[index].valor_total = 0;
      }
      const updatedItems = recalculateDisplayNumbers(newItems);
      setItems(updatedItems);
      return;
    }

    setItems(newItems);
  };

  const deleteItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    const renumbered = newItems.map((item, i) => ({
      ...item,
      ordem: i,
    }));
    const updatedItems = recalculateDisplayNumbers(renumbered);
    setItems(updatedItems);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    const renumbered = newItems.map((item, i) => ({
      ...item,
      ordem: i,
    }));
    const updatedItems = recalculateDisplayNumbers(renumbered);
    setItems(updatedItems);
  };

  const moveItemDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    const renumbered = newItems.map((item, i) => ({
      ...item,
      ordem: i,
    }));
    const updatedItems = recalculateDisplayNumbers(renumbered);
    setItems(updatedItems);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    const renumbered = newItems.map((item, i) => ({
      ...item,
      ordem: i,
    }));
    const updatedItems = recalculateDisplayNumbers(renumbered);
    setItems(updatedItems);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const calculateMacroTotal = (macroIndex: number): number => {
    const macro = items[macroIndex];
    if (!macro || macro.tipo !== 'macro') return 0;

    let total = 0;
    for (let i = macroIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.tipo === 'macro') break;
      if (item.parent_id === macro.id || item.display_number.startsWith(macro.display_number + '.')) {
        total += item.valor_total || 0;
      }
    }
    return total;
  };

  const calculateGrandTotal = (): number => {
    let total = 0;
    items.forEach((item, index) => {
      if (item.tipo === 'macro') {
        total += calculateMacroTotal(index);
      } else if (!item.parent_id && !item.display_number.includes('.')) {
        total += item.valor_total || 0;
      }
    });
    return total;
  };

  const calculateTotalByEtapa = (etapa: string): number => {
    let total = 0;
    items.forEach((item, index) => {
      const itemEtapa = (item.etapa || '').trim().toUpperCase();
      const targetEtapa = etapa.trim().toUpperCase();

      if (itemEtapa === targetEtapa) {
        if (item.tipo === 'macro') {
          total += calculateMacroTotal(index);
        } else if (!item.parent_id && !item.display_number.includes('.')) {
          total += item.valor_total || 0;
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

      if (item.tipo === 'macro') {
        totals[etapa].total += calculateMacroTotal(index);

        if (item.id) {
          totals[etapa].realizado += realizedValues[item.id] || 0;
        }
      } else if (item.tipo === 'item' && item.parent_id) {
        if (item.id) {
          totals[etapa].realizado += realizedValues[item.id] || 0;
        }
      } else if (!item.parent_id && !item.display_number.includes('.')) {
        totals[etapa].total += item.valor_total || 0;
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const valorTotal = calculateGrandTotal();
      const { error: updateError } = await supabase
        .from('budgets')
        .update({
          titulo: budgetInfo.titulo,
          validade: budgetInfo.validade,
          revisao: budgetInfo.revisao,
          status: budgetInfo.status,
          foto_obra_url: budgetInfo.foto_obra_url,
          areas: budgetInfo.areas,
          valor_total: valorTotal,
          work_id: currentWorkId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', budgetId);

      if (updateError) {
        console.error('Error updating budget:', updateError);
        throw updateError;
      }

      const { error: deleteError } = await supabase
        .from('budget_items')
        .delete()
        .eq('budget_id', budgetId);

      if (deleteError) {
        console.error('Error deleting items:', deleteError);
        throw deleteError;
      }

      const macroItems = items
        .map((item, index) => ({ item, originalIndex: index }))
        .filter(({ item }) => item.tipo === 'macro');

      const childItems = items
        .map((item, index) => ({ item, originalIndex: index }))
        .filter(({ item }) => item.tipo !== 'macro');

      const macroIndexToIdMap: { [key: number]: string } = {};
      const macroNumberToIdMap: { [key: string]: string } = {};

      if (macroItems.length > 0) {
        // Primeiro, inserir apenas as FASES (macros sem ponto)
        const phaseItems = macroItems.filter(({ item }) => !item.orcamento?.includes('.'));

        if (phaseItems.length > 0) {
          const phasesToInsert = phaseItems.map(({ item, originalIndex }) => ({
            budget_id: budgetId,
            orcamento: item.orcamento,
            etapa: item.etapa,
            descricao: item.descricao,
            tipo: item.tipo,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: 0,
            obs: item.obs,
            parent_id: null,
            ordem: originalIndex,
          }));

          const { data: insertedPhases, error: phaseInsertError } = await supabase
            .from('budget_items')
            .insert(phasesToInsert)
            .select('id, ordem, orcamento');

          if (phaseInsertError) {
            console.error('Error inserting phase items:', phaseInsertError);
            throw phaseInsertError;
          }

          if (insertedPhases) {
            insertedPhases.forEach((phase) => {
              macroIndexToIdMap[phase.ordem] = phase.id;
              macroNumberToIdMap[phase.orcamento] = phase.id;
            });
          }
        }

        // Agora, inserir as SUBFASES (macros com ponto) com parent_id
        const subphaseItems = macroItems.filter(({ item }) => item.orcamento?.includes('.'));

        if (subphaseItems.length > 0) {
          const subphasesToInsert = subphaseItems.map(({ item, originalIndex }) => {
            // Encontrar a fase pai (ex: "1.1" -> fase "1")
            const phaseNumber = item.orcamento?.split('.')[0];
            const parentId = macroNumberToIdMap[phaseNumber] || null;

            return {
              budget_id: budgetId,
              orcamento: item.orcamento,
              etapa: item.etapa,
              descricao: item.descricao,
              tipo: item.tipo,
              unidade: item.unidade,
              quantidade: item.quantidade,
              valor_unitario: item.valor_unitario,
              valor_total: 0,
              obs: item.obs,
              parent_id: parentId,
              ordem: originalIndex,
            };
          });

          const { data: insertedSubphases, error: subphaseInsertError } = await supabase
            .from('budget_items')
            .insert(subphasesToInsert)
            .select('id, ordem, orcamento');

          if (subphaseInsertError) {
            console.error('Error inserting subphase items:', subphaseInsertError);
            throw subphaseInsertError;
          }

          if (insertedSubphases) {
            insertedSubphases.forEach((subphase) => {
              macroIndexToIdMap[subphase.ordem] = subphase.id;
              macroNumberToIdMap[subphase.orcamento] = subphase.id;
            });
          }
        }
      }

      if (childItems.length > 0) {
        const childrenToInsert = childItems.map(({ item, originalIndex }) => {
          let parentId = null;

          if (item.parent_id && typeof item.parent_id === 'string' && item.parent_id.startsWith('__MACRO_INDEX_')) {
            const macroIndex = parseInt(item.parent_id.replace('__MACRO_INDEX_', '').replace('__', ''));
            parentId = macroIndexToIdMap[macroIndex] || null;
          } else {
            parentId = item.parent_id;
          }

          return {
            budget_id: budgetId,
            orcamento: item.orcamento,
            etapa: item.etapa,
            descricao: item.descricao,
            tipo: item.tipo,
            unidade: item.unidade,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            valor_total: item.valor_total,
            obs: item.obs,
            parent_id: parentId,
            ordem: originalIndex,
          };
        });

        const { error: childInsertError } = await supabase
          .from('budget_items')
          .insert(childrenToInsert);

        if (childInsertError) {
          console.error('Error inserting child items:', childInsertError);
          throw childInsertError;
        }
      }

      alert('Orçamento salvo com sucesso!');
      onClose();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      alert(`Erro ao salvar orçamento: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    try {
      await generateBudgetPDF(budgetId);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF do orçamento');
    }
  };

  const handleClearAllItems = () => {
    if (confirm('Deseja realmente apagar todos os itens do orçamento? Esta ação não pode ser desfeita.')) {
      setItems([]);
    }
  };

  const fillRandomValues = () => {
    if (!confirm('Preencher todos os itens com valores aleatórios? Apenas itens sem valores serão preenchidos.')) {
      return;
    }

    const updatedItems = items.map(item => {
      if (item.tipo === 'macro') {
        return item;
      }

      const hasValues = item.quantidade > 0 || item.valor_unitario > 0;
      if (hasValues) {
        return item;
      }

      const randomQuantity = Math.floor(Math.random() * 100) + 1;
      const randomUnitValue = (Math.random() * 1000) + 10;
      const total = randomQuantity * randomUnitValue;

      return {
        ...item,
        quantidade: parseFloat(randomQuantity.toFixed(2)),
        valor_unitario: parseFloat(randomUnitValue.toFixed(2)),
        valor_total: parseFloat(total.toFixed(2))
      };
    });

    setItems(updatedItems);
  };

  const formatCurrency = (value: number) => {
    return 'R$ ' + value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calculateTotalArea = () => {
    return budgetInfo.areas.reduce((sum, area) => sum + (area.area || 0), 0);
  };

  const handleWorkChange = async (newWorkId: string) => {
    setCurrentWorkId(newWorkId);

    if (newWorkId) {
      try {
        const { data: work } = await supabase
          .from('works')
          .select('*')
          .eq('id', newWorkId)
          .maybeSingle();

        if (work) {
          setWorkInfo({
            name: work.name || '',
            work_address: work.work_address || '',
            photo_url: work.photo_url || '',
          });

          if (work.client_id) {
            const { data: client } = await supabase
              .from('clients')
              .select('*')
              .eq('id', work.client_id)
              .maybeSingle();

            if (client) {
              setClientInfo({
                nome_fantasia: client.name || '',
                razao_social: client.name || '',
                cnpj_cpf: client.cpf_cnpj || '',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error loading work data:', error);
      }
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem válida');
      if (photoInputRef.current) photoInputRef.current.value = '';
      return;
    }

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${budgetId}_${Date.now()}.${fileExt}`;
      const filePath = `budget-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('client-files')
        .getPublicUrl(filePath);

      setBudgetInfo(prev => ({ ...prev, foto_obra_url: publicUrl }));

      if (photoInputRef.current) photoInputRef.current.value = '';

      alert('Foto carregada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao fazer upload da foto:', error);
      alert(`Erro ao fazer upload da foto: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-[98vw] h-[98vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Orçamento</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={budgetInfo.titulo}
                  onChange={(e) => setBudgetInfo({ ...budgetInfo, titulo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Revisão
                </label>
                <input
                  type="text"
                  value={budgetInfo.revisao}
                  onChange={(e) => setBudgetInfo({ ...budgetInfo, revisao: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Validade
                </label>
                <input
                  type="date"
                  value={budgetInfo.validade}
                  onChange={(e) => setBudgetInfo({ ...budgetInfo, validade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={budgetInfo.status}
                  onChange={(e) => setBudgetInfo({ ...budgetInfo, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="em_preenchimento">Em Preenchimento</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="enviado">Enviado</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Rejeitado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Obra Vinculada <span className="text-red-500">*</span>
                </label>
                <select
                  value={currentWorkId}
                  onChange={(e) => handleWorkChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  disabled={readOnly}
                  required
                >
                  <option value="">Selecione uma obra</option>
                  {availableWorks.map(work => (
                    <option key={work.id} value={work.id}>
                      {work.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Foto da Obra e Áreas</h3>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Foto da Obra
                  </label>
                  <div className="w-full h-40 bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                    {budgetInfo.foto_obra_url ? (
                      <img
                        src={budgetInfo.foto_obra_url}
                        alt="Foto da Obra"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Upload size={48} />
                      </div>
                    )}
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="w-full mt-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? 'Carregando...' : 'Adicionar Foto'}
                  </button>
                </div>

                <div className="lg:col-span-3 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {budgetInfo.areas && budgetInfo.areas.length > 0 ? budgetInfo.areas.map((area, index) => (
                      <div key={index} className="bg-white rounded p-2 border border-gray-300">
                        <div className="text-xs font-bold text-gray-700 mb-1.5">Área {index + 1}</div>
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={area.nome}
                            onChange={(e) => {
                              const newAreas = [...budgetInfo.areas];
                              newAreas[index].nome = e.target.value;
                              setBudgetInfo({ ...budgetInfo, areas: newAreas });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs"
                            placeholder={`Ex: ${index === 0 ? 'Térreo' : index === 1 ? 'Pavimento Superior' : index === 2 ? 'Área Externa' : 'Garagem'}`}
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={area.area || ''}
                            onChange={(e) => {
                              const newAreas = [...budgetInfo.areas];
                              newAreas[index].area = parseFloat(e.target.value) || 0;
                              setBudgetInfo({ ...budgetInfo, areas: newAreas });
                            }}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent text-gray-900 text-xs"
                            placeholder="0.00 m²"
                          />
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-center text-yellow-700 text-xs">
                        Carregando campos de áreas...
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded p-2 border-2 border-green-500">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Área Total (m²)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculateTotalArea()}
                      disabled
                      className="w-full px-2 py-1.5 border border-gray-300 rounded bg-green-50 text-green-700 font-bold text-sm text-center"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Dados da Obra e Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-semibold text-gray-600">Obra:</span>
                  <span className="ml-2 text-gray-900">{workInfo.name || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-600">Cliente:</span>
                  <span className="ml-2 text-gray-900">{clientInfo.nome_fantasia || clientInfo.razao_social || '-'}</span>
                </div>
                <div className="md:col-span-2">
                  <span className="font-semibold text-gray-600">Endereço:</span>
                  <span className="ml-2 text-gray-900">{workInfo.work_address || '-'}</span>
                </div>
                {clientInfo.cnpj_cpf && (
                  <div>
                    <span className="font-semibold text-gray-600">CNPJ/CPF:</span>
                    <span className="ml-2 text-gray-900">{clientInfo.cnpj_cpf}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-300 my-6"></div>

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

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Itens do Orçamento</h3>
            <div className="flex gap-3">
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 rounded-lg text-white font-medium transition-all"
                title="Sincronizar pedidos com realizado"
              >
                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white font-medium transition-all"
              >
                <Printer size={18} />
                Imprimir PDF
              </button>
              {!readOnly && (
                <>
                  <button
                    onClick={() => setTemplateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-all"
                    title="Aplicar template salvo"
                  >
                    <FileSpreadsheet size={18} />
                    Templates
                  </button>
                  <button
                    onClick={handleImportExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-all"
                  >
                    <Upload size={18} />
                    Importar Excel
                  </button>
                  <button
                    onClick={handleClearAllItems}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-all"
                  >
                    <Eraser size={18} />
                    Limpar Tudo
                  </button>
                  <button
                    onClick={addNewLine}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all"
                  >
                    <Plus size={18} />
                    Adicionar Linha
                  </button>
                  <button
                    onClick={fillRandomValues}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-medium transition-all"
                  >
                    <Dices size={18} />
                    Valores Aleatórios
                  </button>
                </>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div className="border border-gray-300 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '50px'}}>
                    Item
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '80px'}}>
                    Etapa
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{minWidth: '200px'}}>
                    Descrição
                  </th>
                  <th className="px-1 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '50px'}} title="Marque para definir como FASE. Desmarcado = SUBFASE ou Item">
                    FASE ✓
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '50px'}}>
                    Unid.
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '70px'}}>
                    Qtd
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '90px'}}>
                    Valor Unit.
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '90px'}}>
                    Total
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '90px'}}>
                    Realizado
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '80px'}}>
                    Orçamento
                  </th>
                  <th className="px-1 py-2 text-left text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '100px'}}>
                    Obs.
                  </th>
                  {!readOnly && (
                    <th className="px-1 py-2 text-center text-xs font-bold text-gray-700 uppercase tracking-wider" style={{width: '80px'}}>
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      ${item.tipo === 'macro' ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-l-4 border-l-yellow-500 font-bold' : 'hover:bg-gray-50 bg-white'}
                      ${draggedIndex === index ? 'opacity-40' : ''}
                      ${dragOverIndex === index ? 'border-t-4 border-blue-500' : ''}
                      cursor-move transition-all
                    `}
                  >
                    <td className={`px-1 py-1 text-xs text-center font-semibold ${item.tipo === 'macro' ? 'text-yellow-900' : 'text-gray-900'}`}>
                      {item.tipo === 'macro' ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-yellow-700 font-bold">FASE</span> {item.display_number}
                        </span>
                      ) : item.parent_id ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-blue-700 font-bold">SUBFASE</span> {item.display_number}
                        </span>
                      ) : (
                        item.display_number
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <select
                        value={item.etapa}
                        onChange={(e) => updateItem(index, 'etapa', e.target.value)}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-500"
                        disabled={readOnly}
                      >
                        {ETAPAS.map(etapa => (
                          <option key={etapa} value={etapa}>{etapa}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.descricao}
                        onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                        className={`w-full px-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 ${
                          item.tipo === 'macro'
                            ? 'font-bold text-sm text-yellow-900 bg-yellow-50'
                            : 'text-xs text-gray-900'
                        }`}
                        placeholder=""
                        disabled={readOnly}
                      />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={item.tipo === 'macro'}
                        onChange={(e) => updateItem(index, 'tipo', e.target.checked ? 'macro' : 'item')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={readOnly}
                      />
                    </td>
                    <td className="px-1 py-1">
                      {item.tipo === 'macro' ? (
                        <span className="text-xs text-gray-400 block text-center">-</span>
                      ) : (
                        <select
                          value={item.unidade}
                          onChange={(e) => updateItem(index, 'unidade', e.target.value)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-500"
                          disabled={readOnly}
                        >
                          {UNIDADES.map(un => (
                            <option key={un} value={un}>{un}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      {item.tipo === 'macro' ? (
                        <span className="text-xs text-gray-400 block text-center">-</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantidade || ''}
                          onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                          disabled={readOnly}
                        />
                      )}
                    </td>
                    <td className="px-1 py-1">
                      {item.tipo === 'macro' ? (
                        <span className="text-xs text-gray-400 block text-center">-</span>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.valor_unitario || ''}
                          onChange={(e) => updateItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                          className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-500"
                          placeholder="0.00"
                          disabled={readOnly}
                        />
                      )}
                    </td>
                    <td className="px-1 py-1 text-xs font-semibold text-gray-900">
                      {item.tipo === 'macro'
                        ? formatCurrency(calculateMacroTotal(index))
                        : formatCurrency(item.valor_total || 0)
                      }
                    </td>
                    <td className="px-1 py-1 text-xs font-semibold text-green-700">
                      {formatCurrency(realizedValues[item.id || ''] || 0)}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.orcamento}
                        onChange={(e) => updateItem(index, 'orcamento', e.target.value)}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-500"
                        placeholder=""
                        disabled={readOnly}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.obs}
                        onChange={(e) => updateItem(index, 'obs', e.target.value)}
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:ring-1 focus:ring-blue-500"
                        placeholder=""
                        disabled={readOnly}
                      />
                    </td>
                    {!readOnly && (
                      <td className="px-1 py-1">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => moveItemUp(index)}
                            disabled={index === 0}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover para cima"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            onClick={() => moveItemDown(index)}
                            disabled={index === items.length - 1}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            onClick={() => deleteItem(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          {!readOnly ? (
            <>
              <button
                onClick={onClose}
                className="btn-cancel flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar Orçamento'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white font-medium transition-all"
            >
              Fechar
            </button>
          )}
        </div>
      </div>

      <TemplateImportModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onApplyTemplate={applyTemplateItems}
      />
    </div>
  );
}
