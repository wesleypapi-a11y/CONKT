import { useState, useEffect } from 'react';
import { TrendingUp, ChevronRight, ChevronDown } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';

interface BudgetItem {
  id: string;
  descricao: string;
  parent_id: string | null;
  quantidade: number;
  unidade: string;
  preco_unitario: number;
  preco_total: number;
  ordem: number;
  children?: BudgetItem[];
  realized: number;
}

interface ClientBudgetViewProps {
  workId: string;
}

export default function ClientBudgetView({ workId }: ClientBudgetViewProps) {
  const [loading, setLoading] = useState(true);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalRealized, setTotalRealized] = useState(0);

  useEffect(() => {
    loadBudgetData();
  }, [workId]);

  const loadBudgetData = async () => {
    setLoading(true);
    try {
      const { data: budgetData } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .eq('status', 'aprovado')
        .maybeSingle();

      if (!budgetData) {
        setLoading(false);
        return;
      }

      const { data: itemsData } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetData.id)
        .is('deleted_at', null)
        .order('ordem');

      const { data: realizedData } = await supabase
        .from('budget_realized')
        .select('*')
        .eq('work_id', workId)
        .is('deleted_at', null);

      const realizedByPhase: Record<string, number> = {};
      const realizedBySubphase: Record<string, number> = {};

      realizedData?.forEach((item: any) => {
        if (item.phase_id) {
          realizedByPhase[item.phase_id] = (realizedByPhase[item.phase_id] || 0) + (item.total_value || 0);
        }
        if (item.subphase_id) {
          realizedBySubphase[item.subphase_id] = (realizedBySubphase[item.subphase_id] || 0) + (item.total_value || 0);
        }
      });

      const itemsWithRealized = (itemsData || []).map(item => ({
        ...item,
        realized: realizedBySubphase[item.id] || realizedByPhase[item.id] || 0
      }));

      const tree = buildTree(itemsWithRealized);
      setBudgetItems(tree);

      const total = itemsWithRealized
        .filter(item => !item.parent_id)
        .reduce((sum, item) => sum + (item.preco_total || 0), 0);
      setTotalBudget(total);

      const totalReal = Object.values(realizedByPhase).reduce((sum, val) => sum + val, 0);
      setTotalRealized(totalReal);

      const initialExpanded = new Set<string>();
      itemsWithRealized.filter(item => !item.parent_id).forEach(item => initialExpanded.add(item.id));
      setExpandedItems(initialExpanded);
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (items: BudgetItem[]): BudgetItem[] => {
    const itemMap = new Map<string, BudgetItem>();
    const roots: BudgetItem[] = [];

    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = itemMap.get(item.id)!;
      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const renderItem = (item: BudgetItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const percentage = item.preco_total > 0 ? (item.realized / item.preco_total) * 100 : 0;
    const isPhase = level === 0;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center py-3 px-4 hover:bg-gray-50 border-b ${
            isPhase ? 'bg-gray-50 font-semibold' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          <div className="flex-1 flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(item.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            )}
            {!hasChildren && <div className="w-4" />}
            <span className={`text-sm ${isPhase ? 'font-bold' : 'text-gray-700'}`}>
              {item.descricao}
            </span>
          </div>
          <div className="w-32 text-right">
            <span className="text-sm font-semibold text-gray-800">
              {item.preco_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-32 text-right">
            <span className="text-sm font-semibold text-blue-600">
              {item.realized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <div className="w-24 text-right">
            <span className={`text-sm font-semibold ${percentage > 100 ? 'text-red-600' : 'text-green-600'}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Carregando orçamento...</p>
      </div>
    );
  }

  if (budgetItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nenhum orçamento aprovado disponível para esta obra.</p>
      </div>
    );
  }

  const percentage = totalBudget > 0 ? (totalRealized / totalBudget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Valor Orçado</h3>
          <p className="text-2xl font-bold text-gray-800">
            {totalBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Valor Realizado</h3>
          <p className="text-2xl font-bold text-blue-600">
            {totalRealized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Percentual Executado</h3>
          <p className={`text-2xl font-bold ${percentage > 100 ? 'text-red-600' : 'text-green-600'}`}>
            {percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Detalhamento do Orçamento</h2>
          <p className="text-sm text-gray-600 mt-1">Comparativo entre valores orçados e realizados</p>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="flex items-center py-3 px-4 bg-gray-100 border-b font-semibold text-xs text-gray-700">
              <div className="flex-1">Descrição</div>
              <div className="w-32 text-right">Orçado</div>
              <div className="w-32 text-right">Realizado</div>
              <div className="w-24 text-right">%</div>
            </div>
            <div>
              {budgetItems.map(item => renderItem(item))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
