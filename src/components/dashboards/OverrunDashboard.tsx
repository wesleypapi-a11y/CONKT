import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface OverrunData {
  subphase_id: string;
  phase_name: string;
  subphase_name: string;
  budgeted: number;
  realized: number;
  balance: number;
  percentage: number;
}

interface Props {
  workId: string;
}

export default function OverrunDashboard({ workId }: Props) {
  const [data, setData] = useState<OverrunData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (workId) {
      loadData();
    }
  }, [workId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('id')
        .eq('work_id', workId)
        .maybeSingle();

      if (budgetError) throw budgetError;
      if (!budgetData) {
        setData([]);
        return;
      }

      const budgetId = budgetData.id;

      const { data: phases, error: phasesError } = await supabase
        .from('budget_items')
        .select('id, descricao')
        .eq('budget_id', budgetId)
        .eq('tipo', 'macro')
        .is('parent_id', null)
        .order('ordem', { ascending: true });

      if (phasesError) throw phasesError;

      const phaseMap = (phases || []).reduce((acc, phase) => {
        acc[phase.id] = phase.descricao;
        return acc;
      }, {} as Record<string, string>);

      const { data: subphases, error: subphasesError } = await supabase
        .from('budget_items')
        .select('id, parent_id, descricao, valor_total')
        .eq('budget_id', budgetId)
        .eq('tipo', 'subfase')
        .order('ordem', { ascending: true });

      if (subphasesError) throw subphasesError;

      const { data: realizedData, error: realizedError } = await supabase
        .from('budget_realized')
        .select('subphase_id, amount')
        .eq('budget_id', budgetId)
        .is('deleted_at', null);

      if (realizedError) throw realizedError;

      const realizedBySubphase = (realizedData || []).reduce((acc, item) => {
        if (item.subphase_id) {
          acc[item.subphase_id] = (acc[item.subphase_id] || 0) + Number(item.amount || 0);
        }
        return acc;
      }, {} as Record<string, number>);

      const overrunData: OverrunData[] = [];

      (subphases || []).forEach(subphase => {
        const budgeted = Number(subphase.valor_total || 0);
        const realized = realizedBySubphase[subphase.id] || 0;
        const balance = budgeted - realized;

        if (balance < 0) {
          const percentage = budgeted > 0 ? ((realized - budgeted) / budgeted) * 100 : 0;
          overrunData.push({
            subphase_id: subphase.id,
            phase_name: phaseMap[subphase.parent_id] || 'N/A',
            subphase_name: subphase.descricao,
            budgeted,
            realized,
            balance,
            percentage
          });
        }
      });

      overrunData.sort((a, b) => a.balance - b.balance);

      setData(overrunData);
    } catch (error) {
      console.error('Error loading overrun data:', error);
    } finally {
      setLoading(false);
    }
  };

  return null;
}
