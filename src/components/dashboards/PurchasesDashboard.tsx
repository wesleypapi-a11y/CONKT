import { useState, useEffect } from 'react';
import { Package, ShoppingCart, FileCheck, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PurchaseStats {
  status: string;
  label: string;
  count: number;
  totalValue: number;
  color: string;
  icon: any;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  status: string;
  total_value: number;
  created_at: string;
  supplier_name?: string;
}

interface Props {
  workId: string;
  dateRange: { start: string; end: string };
}

export default function PurchasesDashboard({ workId, dateRange }: Props) {
  const [stats, setStats] = useState<PurchaseStats[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (workId) {
      loadData();
    }
  }, [workId, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: requests, error: reqError } = await supabase
        .from('purchase_requests')
        .select('id, status, created_at')
        .eq('work_id', workId)
        .is('deleted_at', null)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`);

      if (reqError) throw reqError;

      const { data: quotations, error: quotError } = await supabase
        .from('quotations')
        .select('id, status, total_value, created_at')
        .eq('work_id', workId)
        .is('deleted_at', null)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`);

      if (quotError) throw quotError;

      const { data: ordersData, error: ordersError } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          order_number,
          status,
          total_value,
          created_at,
          supplier:suppliers(name)
        `)
        .eq('work_id', workId)
        .is('deleted_at', null)
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      const ordersWithSupplier = (ordersData || []).map(o => ({
        ...o,
        supplier_name: o.supplier?.name || 'Sem fornecedor'
      }));

      setOrders(ordersWithSupplier);

      const requestsTotal = 0;
      const quotationsTotal = (quotations || []).reduce((sum, q) => sum + (q.total_value || 0), 0);
      const ordersTotal = (ordersData || []).reduce((sum, o) => sum + Number(o.total_value), 0);
      const paidTotal = (ordersData || []).filter(o => o.status === 'pago').reduce((sum, o) => sum + Number(o.total_value), 0);

      const statsData: PurchaseStats[] = [
        {
          status: 'solicitado',
          label: 'Solicitado',
          count: (requests || []).length,
          totalValue: requestsTotal,
          color: 'bg-blue-500',
          icon: FileCheck
        },
        {
          status: 'em_cotacao',
          label: 'Em Cotação',
          count: (quotations || []).length,
          totalValue: quotationsTotal,
          color: 'bg-yellow-500',
          icon: ShoppingCart
        },
        {
          status: 'pedido_gerado',
          label: 'Pedido Gerado',
          count: (ordersData || []).length,
          totalValue: ordersTotal,
          color: 'bg-green-500',
          icon: Package
        },
        {
          status: 'pago',
          label: 'Pago',
          count: (ordersData || []).filter(o => o.status === 'pago').length,
          totalValue: paidTotal,
          color: 'bg-purple-500',
          icon: DollarSign
        }
      ];

      setStats(statsData);
      setTotalValue(requestsTotal + quotationsTotal + ordersTotal);
      setTotalCount((requests || []).length + (quotations || []).length + (orders || []).length);
    } catch (error) {
      console.error('Error loading purchases data:', error);
    } finally {
      setLoading(false);
    }
  };

  return null;
}
