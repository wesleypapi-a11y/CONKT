import jsPDF from 'jspdf';
import { Work } from '../types/work';
import { supabase } from '../lib/supabase';

interface DateRange {
  start: string;
  end: string;
}

export async function generateDashboardPdf(
  work: Work,
  dateRange: DateRange,
  periodFilter: string
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      addHeader();
      return true;
    }
    return false;
  };

  const addHeader = () => {
    pdf.setFillColor(41, 128, 185);
    pdf.rect(0, 0, pageWidth, 40, 'F');

    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text('Dashboard de Obra', margin, 15);

    pdf.setFontSize(10);
    pdf.text(work.name || '', margin, 25);

    const periodLabel = periodFilter === 'custom'
      ? `${dateRange.start} a ${dateRange.end}`
      : `Últimos ${periodFilter} dias`;
    pdf.text(`Período: ${periodLabel}`, margin, 32);

    const now = new Date().toLocaleString('pt-BR');
    pdf.text(`Gerado em: ${now}`, pageWidth - margin - 50, 32);

    y = 50;
  };

  const addSectionTitle = (title: string) => {
    addNewPageIfNeeded(15);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, y, pageWidth - 2 * margin, 10, 'F');
    pdf.setFontSize(12);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, margin + 3, y + 7);
    pdf.setFont('helvetica', 'normal');
    y += 15;
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  addHeader();

  try {
    const { data: budgetData } = await supabase
      .from('budgets')
      .select('id')
      .eq('work_id', work.id)
      .maybeSingle();

    if (budgetData) {
      const budgetId = budgetData.id;

      const { data: itemsData } = await supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('tipo', 'macro')
        .order('ordem', { ascending: true });

      const { data: realizedData } = await supabase
        .from('budget_realized')
        .select('phase_id, amount')
        .eq('budget_id', budgetId)
        .is('deleted_at', null);

      const realizedByPhase = (realizedData || []).reduce((acc, item) => {
        acc[item.phase_id] = (acc[item.phase_id] || 0) + parseFloat(item.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      const phaseData = (itemsData || []).map(item => ({
        name: item.descricao,
        budgeted: parseFloat(item.valor_total || 0),
        realized: realizedByPhase[item.id] || 0
      }));

      const totalBudgeted = phaseData.reduce((sum, p) => sum + p.budgeted, 0);
      const totalRealized = phaseData.reduce((sum, p) => sum + p.realized, 0);
      const totalBalance = totalBudgeted - totalRealized;
      const percentage = totalBudgeted > 0 ? (totalRealized / totalBudgeted) * 100 : 0;

      addSectionTitle('1. Orçado vs Realizado por Fase');

      pdf.setFontSize(10);
      const cards = [
        { label: 'Orçado Total', value: formatCurrency(totalBudgeted) },
        { label: 'Realizado Total', value: formatCurrency(totalRealized) },
        { label: 'Saldo Total', value: formatCurrency(totalBalance) },
        { label: '% Realizado', value: `${percentage.toFixed(1)}%` }
      ];

      const cardWidth = (pageWidth - 2 * margin - 9) / 4;
      cards.forEach((card, i) => {
        const x = margin + i * (cardWidth + 3);
        pdf.setDrawColor(200, 200, 200);
        pdf.rect(x, y, cardWidth, 15);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(card.label, x + 2, y + 5);
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.text(card.value, x + 2, y + 12);
        pdf.setFont('helvetica', 'normal');
      });

      y += 20;

      if (phaseData.length > 0) {
        addNewPageIfNeeded(10 * phaseData.length + 10);
        pdf.setFontSize(9);
        phaseData.forEach(phase => {
          pdf.text(phase.name, margin, y);
          pdf.text(formatCurrency(phase.budgeted), margin + 70, y);
          pdf.text(formatCurrency(phase.realized), margin + 120, y);
          const balance = phase.budgeted - phase.realized;
          pdf.text(formatCurrency(balance), margin + 160, y);
          y += 7;
        });
      }
    }

    y += 10;
    addSectionTitle('2. Contratos: Pago vs Falta');

    const { data: contracts } = await supabase
      .from('contracts')
      .select('*')
      .eq('work_id', work.id)
      .order('contract_number', { ascending: true });

    if (contracts && contracts.length > 0) {
      pdf.setFontSize(9);
      pdf.text(`Total de contratos: ${contracts.length}`, margin, y);
      y += 7;

      for (const contract of contracts.slice(0, 5)) {
        addNewPageIfNeeded(15);

        const { data: installments } = await supabase
          .from('contract_installments')
          .select('*')
          .eq('contract_id', contract.id);

        const totalPaid = (installments || [])
          .filter(i => i.status === 'pago')
          .reduce((sum, i) => sum + (i.paid_amount || i.amount), 0);

        const pct = contract.valor_total > 0 ? (totalPaid / contract.valor_total) * 100 : 0;

        pdf.text(`${contract.contract_number || ''} - ${contract.supplier_name || 'Sem fornecedor'}`, margin, y);
        y += 5;
        pdf.text(`  Total: ${formatCurrency(contract.valor_total)} | Pago: ${formatCurrency(totalPaid)} (${pct.toFixed(1)}%)`, margin, y);
        y += 8;
      }
    } else {
      pdf.setFontSize(9);
      pdf.text('Nenhum contrato cadastrado', margin, y);
      y += 10;
    }

    y += 10;
    addSectionTitle('3. Compras por Status');
    pdf.setFontSize(9);
    pdf.text('Resumo de solicitações, cotações e pedidos no período', margin, y);
    y += 10;

    y += 10;
    addSectionTitle('4. Realizado por Fornecedor (Top 10)');
    pdf.setFontSize(9);
    pdf.text('Fornecedores com maior valor realizado no período', margin, y);
    y += 10;

    y += 10;
    addSectionTitle('5. Subfases com Estouro de Orçamento');
    pdf.setFontSize(9);
    pdf.text('Subfases que ultrapassaram o orçamento planejado', margin, y);
    y += 10;

    y += 10;
    addSectionTitle('6. Fluxo de Pagamentos');
    pdf.setFontSize(9);
    pdf.text('Pagamentos realizados e previstos (12 meses)', margin, y);
    y += 10;

    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    }

    pdf.save(`Dashboard_${work.name || 'Obra'}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating dashboard PDF:', error);
    throw error;
  }
}
