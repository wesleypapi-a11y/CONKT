import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface ReportOptions {
  workId: string;
  modules: string[];
  startDate: string;
  endDate: string;
  mode: 'client' | 'internal';
}

export async function generateConsolidatedReport(options: ReportOptions) {
  const { workId, modules, startDate, endDate, mode } = options;

  const { data: work } = await supabase
    .from('works')
    .select('*')
    .eq('id', workId)
    .maybeSingle();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', work?.client_id)
    .maybeSingle();

  if (!work || !client) {
    throw new Error('Obra ou cliente não encontrado');
  }

  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;

  addCoverPage(pdf, work, client, startDate, endDate, mode, pageWidth, pageHeight);

  pdf.addPage();
  const tocPageNumbers = await addTableOfContents(pdf, modules, pageWidth);

  let currentPage = (pdf as any).internal.getCurrentPageInfo().pageNumber + 1;

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    pdf.addPage();
    currentPage = (pdf as any).internal.getCurrentPageInfo().pageNumber;
    tocPageNumbers[module] = currentPage;

    try {
      if (module === 'dashboard') {
        await addDashboardSection(pdf, workId, mode, pageWidth, pageHeight);
      } else if (module === 'budget') {
        await addBudgetSection(pdf, workId, mode, pageWidth, pageHeight);
      } else if (module === 'payments') {
        await addPaymentsSection(pdf, workId, startDate, endDate, mode, pageWidth, pageHeight);
      } else if (module === 'diary') {
        await addDiarySection(pdf, workId, startDate, endDate, mode, pageWidth, pageHeight);
      } else if (module === 'photos') {
        await addPhotosSection(pdf, workId, startDate, endDate, mode, pageWidth, pageHeight);
      } else if (module === 'schedule') {
        await addScheduleSection(pdf, workId, mode, pageWidth, pageHeight);
      } else if (module === 'cashflow') {
        await addCashflowSection(pdf, workId, startDate, endDate, mode, pageWidth, pageHeight);
      }
    } catch (error) {
      console.error(`Erro ao gerar seção ${module}:`, error);
    }
  }

  addPageNumbers(pdf);

  const fileName = `Relatorio_${mode === 'client' ? 'Cliente' : 'Interno'}_${work.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  pdf.save(fileName);
}

function addCoverPage(
  pdf: jsPDF,
  work: any,
  client: any,
  startDate: string,
  endDate: string,
  mode: string,
  pageWidth: number,
  pageHeight: number
) {
  pdf.setFillColor(41, 128, 185);
  pdf.rect(0, 0, pageWidth, pageHeight / 3, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RELATÓRIO', pageWidth / 2, 40, { align: 'center' });

  pdf.setFontSize(24);
  pdf.text(mode === 'client' ? 'EXECUTIVO' : 'GERENCIAL', pageWidth / 2, 55, { align: 'center' });

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(work.name, pageWidth / 2, pageHeight / 2 - 10, { align: 'center' });

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Cliente: ${client.name}`, pageWidth / 2, pageHeight / 2 + 5, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setTextColor(100, 100, 100);
  const periodText = `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`;
  pdf.text(periodText, pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, pageHeight - 30, { align: 'center' });

  if (mode === 'internal') {
    pdf.setFontSize(8);
    pdf.setTextColor(200, 0, 0);
    pdf.text('DOCUMENTO INTERNO - CONFIDENCIAL', pageWidth / 2, pageHeight - 20, { align: 'center' });
  }
}

async function addTableOfContents(pdf: jsPDF, modules: string[], pageWidth: number) {
  const moduleNames: Record<string, string> = {
    dashboard: 'Dashboard Geral',
    budget: 'Orçado vs Realizado',
    payments: 'Pagamentos Realizados',
    diary: 'Diário de Obras',
    photos: 'Fotos da Obra',
    schedule: 'Cronograma',
    cashflow: 'Fluxo de Caixa'
  };

  let y = 40;

  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(41, 128, 185);
  pdf.text('SUMÁRIO', pageWidth / 2, y, { align: 'center' });

  y += 20;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);

  const pageNumbers: Record<string, number> = {};

  modules.forEach((module, index) => {
    const moduleName = moduleNames[module] || module;
    pdf.text(`${index + 1}. ${moduleName}`, 30, y);
    pdf.text('...', pageWidth / 2, y, { align: 'center' });
    y += 10;
  });

  return pageNumbers;
}

function addSectionHeader(pdf: jsPDF, title: string, pageWidth: number) {
  const y = 25;
  pdf.setFillColor(41, 128, 185);
  pdf.rect(0, y - 8, pageWidth, 12, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, pageWidth / 2, y, { align: 'center' });

  pdf.setTextColor(0, 0, 0);
}

async function addDashboardSection(
  pdf: jsPDF,
  workId: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'DASHBOARD GERAL', pageWidth);

  let y = 50;

  const { data: budgetData } = await supabase
    .from('budgets')
    .select('total_value')
    .eq('work_id', workId)
    .eq('status', 'aprovado')
    .maybeSingle();

  const { data: realizedData } = await supabase
    .from('budget_realized')
    .select('total_value')
    .eq('work_id', workId)
    .is('deleted_at', null);

  const totalRealized = realizedData?.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0) || 0;
  const budgetTotal = budgetData?.total_value || 0;
  const percentage = budgetTotal > 0 ? (totalRealized / budgetTotal) * 100 : 0;
  const saldo = budgetTotal - totalRealized;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(41, 128, 185);
  pdf.text('Resumo Financeiro', 20, y);
  y += 12;

  const boxHeight = 20;
  const boxWidth = (pageWidth - 50) / 3;
  const startX = 20;

  pdf.setFillColor(240, 240, 240);
  pdf.roundedRect(startX, y, boxWidth, boxHeight, 3, 3, 'F');
  pdf.roundedRect(startX + boxWidth + 5, y, boxWidth, boxHeight, 3, 3, 'F');
  pdf.roundedRect(startX + (boxWidth + 5) * 2, y, boxWidth, boxHeight, 3, 3, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Valor Orçado', startX + boxWidth / 2, y + 8, { align: 'center' });
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`R$ ${budgetTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + boxWidth / 2, y + 16, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Valor Realizado', startX + boxWidth + 5 + boxWidth / 2, y + 8, { align: 'center' });
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(230, 126, 34);
  pdf.text(`R$ ${totalRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + boxWidth + 5 + boxWidth / 2, y + 16, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Saldo Disponível', startX + (boxWidth + 5) * 2 + boxWidth / 2, y + 8, { align: 'center' });
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(saldo >= 0 ? 39 : 231, saldo >= 0 ? 174 : 76, saldo >= 0 ? 96 : 60);
  pdf.text(`R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + (boxWidth + 5) * 2 + boxWidth / 2, y + 16, { align: 'center' });

  y += 35;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(41, 128, 185);
  pdf.text('Progresso Geral', 20, y);
  y += 12;

  const barWidth = pageWidth - 40;
  const barHeight = 25;
  pdf.setFillColor(230, 230, 230);
  pdf.roundedRect(20, y, barWidth, barHeight, 3, 3, 'F');

  const fillWidth = (barWidth * percentage) / 100;
  const barColor = percentage < 50 ? [39, 174, 96] : percentage < 80 ? [243, 156, 18] : [231, 76, 60];
  pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
  if (fillWidth > 0) {
    pdf.roundedRect(20, y, fillWidth, barHeight, 3, 3, 'F');
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text(`${percentage.toFixed(1)}%`, 20 + barWidth / 2, y + 16, { align: 'center' });

  y += 40;

  if (mode === 'internal') {
    const { data: ordersData } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('work_id', workId)
      .is('deleted_at', null);

    const { data: diariesData } = await supabase
      .from('work_diaries')
      .select('id')
      .eq('work_id', workId)
      .is('deleted_at', null);

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text('Indicadores Operacionais', 20, y);
    y += 12;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`• Pedidos de Compra: ${ordersData?.length || 0}`, 20, y);
    y += 8;
    pdf.text(`• Registros de Diário: ${diariesData?.length || 0}`, 20, y);
    y += 8;
  }
}

async function addBudgetSection(
  pdf: jsPDF,
  workId: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'ORÇADO VS REALIZADO', pageWidth);

  let y = 50;

  const { data: budgetData } = await supabase
    .from('budgets')
    .select('id, total_value')
    .eq('work_id', workId)
    .eq('status', 'aprovado')
    .maybeSingle();

  if (!budgetData) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhum orçamento aprovado encontrado.', pageWidth / 2, y, { align: 'center' });
    return;
  }

  const { data: itemsData } = await supabase
    .from('budget_items')
    .select('*')
    .eq('budget_id', budgetData.id)
    .is('parent_id', null)
    .is('deleted_at', null)
    .order('ordem');

  const { data: realizedData } = await supabase
    .from('budget_realized')
    .select('*')
    .eq('work_id', workId)
    .is('deleted_at', null);

  const realizedByPhase: Record<string, number> = {};
  realizedData?.forEach((item: any) => {
    if (item.phase_id) {
      realizedByPhase[item.phase_id] = (realizedByPhase[item.phase_id] || 0) + (item.total_value || 0);
    }
  });

  pdf.setFillColor(245, 245, 245);
  pdf.rect(15, y - 2, pageWidth - 30, 8, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Fase/Etapa', 20, y + 4);
  pdf.text('Orçado', pageWidth - 120, y + 4);
  pdf.text('Realizado', pageWidth - 75, y + 4);
  pdf.text('%', pageWidth - 35, y + 4);

  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  for (const item of itemsData || []) {
    if (y > pageHeight - 30) {
      pdf.addPage();
      addSectionHeader(pdf, 'ORÇADO VS REALIZADO (continuação)', pageWidth);
      y = 50;
    }

    const realized = realizedByPhase[item.id] || 0;
    const itemPercentage = item.preco_total > 0 ? (realized / item.preco_total) * 100 : 0;

    const descricao = item.descricao.length > 45 ? item.descricao.substring(0, 42) + '...' : item.descricao;
    pdf.text(descricao, 20, y);
    pdf.text(`R$ ${(item.preco_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 120, y);
    pdf.text(`R$ ${realized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 75, y);

    pdf.setTextColor(itemPercentage < 50 ? 39 : itemPercentage < 80 ? 243 : 231, itemPercentage < 50 ? 174 : itemPercentage < 80 ? 156 : 76, itemPercentage < 50 ? 96 : itemPercentage < 80 ? 18 : 60);
    pdf.text(`${itemPercentage.toFixed(1)}%`, pageWidth - 35, y);
    pdf.setTextColor(0, 0, 0);

    y += 7;
  }

  y += 5;
  pdf.setLineWidth(0.5);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  const totalRealized = Object.values(realizedByPhase).reduce((sum, val) => sum + val, 0);
  const totalPercentage = budgetData.total_value > 0 ? (totalRealized / budgetData.total_value) * 100 : 0;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('TOTAL', 20, y);
  pdf.text(`R$ ${budgetData.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 120, y);
  pdf.text(`R$ ${totalRealized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 75, y);
  pdf.setTextColor(totalPercentage < 50 ? 39 : totalPercentage < 80 ? 243 : 231, totalPercentage < 50 ? 174 : totalPercentage < 80 ? 156 : 76, totalPercentage < 50 ? 96 : totalPercentage < 80 ? 18 : 60);
  pdf.text(`${totalPercentage.toFixed(1)}%`, pageWidth - 35, y);
  pdf.setTextColor(0, 0, 0);
}

async function addPaymentsSection(
  pdf: jsPDF,
  workId: string,
  startDate: string,
  endDate: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'PAGAMENTOS REALIZADOS', pageWidth);

  let y = 50;

  const { data: installments } = await supabase
    .from('contract_installments')
    .select(`
      *,
      contracts!inner(work_id, contract_number)
    `)
    .eq('contracts.work_id', workId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .is('deleted_at', null)
    .order('due_date');

  if (!installments || installments.length === 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhum pagamento encontrado no período.', pageWidth / 2, y, { align: 'center' });
    return;
  }

  pdf.setFillColor(245, 245, 245);
  pdf.rect(15, y - 2, pageWidth - 30, 8, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Data', 20, y + 4);
  pdf.text('Descrição', 50, y + 4);
  pdf.text('Valor', pageWidth - 70, y + 4);
  pdf.text('Status', pageWidth - 35, y + 4);

  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  let totalPago = 0;
  let totalPendente = 0;

  for (const inst of installments) {
    if (y > pageHeight - 30) {
      pdf.addPage();
      addSectionHeader(pdf, 'PAGAMENTOS REALIZADOS (continuação)', pageWidth);
      y = 50;
    }

    const dueDate = new Date(inst.due_date).toLocaleDateString('pt-BR');
    pdf.text(dueDate, 20, y);
    pdf.text(`Parcela ${inst.installment_number}`, 50, y);
    pdf.text(`R$ ${inst.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageWidth - 70, y);

    if (inst.status === 'pago') {
      pdf.setTextColor(39, 174, 96);
      pdf.text('Pago', pageWidth - 35, y);
      totalPago += inst.value;
    } else {
      pdf.setTextColor(231, 76, 60);
      pdf.text('Pendente', pageWidth - 35, y);
      totalPendente += inst.value;
    }
    pdf.setTextColor(0, 0, 0);

    y += 7;
  }

  y += 5;
  pdf.setLineWidth(0.5);
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('RESUMO', 20, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(39, 174, 96);
  pdf.text(`Total Pago: R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, y);
  y += 6;

  pdf.setTextColor(231, 76, 60);
  pdf.text(`Total Pendente: R$ ${totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, y);
  y += 6;

  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Total Geral: R$ ${(totalPago + totalPendente).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, y);
}

async function addDiarySection(
  pdf: jsPDF,
  workId: string,
  startDate: string,
  endDate: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'DIÁRIO DE OBRAS', pageWidth);

  let y = 50;

  const { data: diaries } = await supabase
    .from('work_diaries')
    .select('*')
    .eq('work_id', workId)
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)
    .order('date', { ascending: false });

  if (!diaries || diaries.length === 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhum registro encontrado no período.', pageWidth / 2, y, { align: 'center' });
    return;
  }

  for (const diary of diaries) {
    if (y > pageHeight - 50) {
      pdf.addPage();
      addSectionHeader(pdf, 'DIÁRIO DE OBRAS (continuação)', pageWidth);
      y = 50;
    }

    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(15, y - 5, pageWidth - 30, 10, 2, 2, 'F');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(`Data: ${new Date(diary.date).toLocaleDateString('pt-BR')}`, 20, y);

    if (mode === 'internal' && diary.weather) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Clima: ${diary.weather}`, pageWidth - 80, y);
    }

    y += 10;

    if (diary.labor_count && mode === 'internal') {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Funcionários no local: ${diary.labor_count}`, 20, y);
      y += 7;
    }

    if (diary.activities_description) {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Atividades Realizadas:', 20, y);
      y += 6;

      pdf.setFont('helvetica', 'normal');
      const activities = pdf.splitTextToSize(diary.activities_description, pageWidth - 40);

      for (const line of activities) {
        if (y > pageHeight - 30) {
          pdf.addPage();
          addSectionHeader(pdf, 'DIÁRIO DE OBRAS (continuação)', pageWidth);
          y = 50;
        }
        pdf.text(line, 20, y);
        y += 5;
      }
    }

    y += 10;
    pdf.setLineWidth(0.3);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, y, pageWidth - 15, y);
    y += 8;
  }
}

async function addPhotosSection(
  pdf: jsPDF,
  workId: string,
  startDate: string,
  endDate: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'FOTOS DA OBRA', pageWidth);

  let y = 50;

  const { data: diaries } = await supabase
    .from('work_diaries')
    .select('date, photos_urls')
    .eq('work_id', workId)
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)
    .order('date', { ascending: false });

  const photoDiaries = diaries?.filter(d => d.photos_urls && d.photos_urls.length > 0) || [];

  if (photoDiaries.length === 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhuma foto encontrada no período.', pageWidth / 2, y, { align: 'center' });
    return;
  }

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Total de registros com fotos: ${photoDiaries.length}`, 20, y);
  y += 10;

  let photoCount = 0;
  for (const diary of photoDiaries) {
    photoCount += diary.photos_urls.length;
  }

  pdf.text(`Total de fotos: ${photoCount}`, 20, y);
  y += 15;

  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Nota: As fotos estão armazenadas digitalmente e disponíveis no sistema.', 20, y);
}

async function addScheduleSection(
  pdf: jsPDF,
  workId: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'CRONOGRAMA', pageWidth);

  let y = 50;

  const { data: schedule } = await supabase
    .from('schedules')
    .select('id')
    .eq('work_id', workId)
    .maybeSingle();

  if (!schedule) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhum cronograma encontrado.', pageWidth / 2, y, { align: 'center' });
    return;
  }

  const { data: tasks } = await supabase
    .from('schedule_tasks')
    .select('*')
    .eq('schedule_id', schedule.id)
    .order('start_date');

  if (!tasks || tasks.length === 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(150, 150, 150);
    pdf.text('Nenhuma atividade cadastrada.', pageWidth / 2, y, { align: 'center' });
    return;
  }

  pdf.setFillColor(245, 245, 245);
  pdf.rect(15, y - 2, pageWidth - 30, 8, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Atividade', 20, y + 4);
  pdf.text('Início', pageWidth - 100, y + 4);
  pdf.text('Término', pageWidth - 60, y + 4);
  pdf.text('%', pageWidth - 25, y + 4);

  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  for (const task of tasks) {
    if (y > pageHeight - 30) {
      pdf.addPage();
      addSectionHeader(pdf, 'CRONOGRAMA (continuação)', pageWidth);
      y = 50;
    }

    const name = task.name.length > 35 ? task.name.substring(0, 32) + '...' : task.name;
    pdf.text(name, 20, y);
    pdf.text(new Date(task.start_date).toLocaleDateString('pt-BR'), pageWidth - 100, y);
    pdf.text(new Date(task.end_date).toLocaleDateString('pt-BR'), pageWidth - 60, y);

    const progress = task.progress || 0;
    pdf.setTextColor(progress < 50 ? 231 : progress < 100 ? 243 : 39, progress < 50 ? 76 : progress < 100 ? 156 : 174, progress < 50 ? 60 : progress < 100 ? 18 : 96);
    pdf.text(`${progress}%`, pageWidth - 25, y);
    pdf.setTextColor(0, 0, 0);

    y += 7;
  }
}

async function addCashflowSection(
  pdf: jsPDF,
  workId: string,
  startDate: string,
  endDate: string,
  mode: string,
  pageWidth: number
) {
  addSectionHeader(pdf, 'FLUXO DE CAIXA', pageWidth);

  let y = 50;

  const { data: installments } = await supabase
    .from('contract_installments')
    .select(`
      *,
      contracts!inner(work_id)
    `)
    .eq('contracts.work_id', workId)
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .is('deleted_at', null);

  const { data: orders } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('work_id', workId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .is('deleted_at', null);

  const totalReceitas = installments?.reduce((sum: number, item: any) => sum + (item.value || 0), 0) || 0;
  const receitasRecebidas = installments?.filter((i: any) => i.status === 'pago').reduce((sum: number, item: any) => sum + (item.value || 0), 0) || 0;
  const totalDespesas = orders?.reduce((sum: number, item: any) => sum + (item.total_value || 0), 0) || 0;
  const saldo = receitasRecebidas - totalDespesas;

  const boxHeight = 22;
  const boxWidth = (pageWidth - 50) / 3;
  const startX = 20;

  pdf.setFillColor(46, 204, 113);
  pdf.roundedRect(startX, y, boxWidth, boxHeight, 3, 3, 'F');

  pdf.setFillColor(231, 76, 60);
  pdf.roundedRect(startX + boxWidth + 5, y, boxWidth, boxHeight, 3, 3, 'F');

  pdf.setFillColor(saldo >= 0 ? 52 : 192, saldo >= 0 ? 152 : 57, saldo >= 0 ? 219 : 43);
  pdf.roundedRect(startX + (boxWidth + 5) * 2, y, boxWidth, boxHeight, 3, 3, 'F');

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('Receitas', startX + boxWidth / 2, y + 9, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`R$ ${receitasRecebidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + boxWidth / 2, y + 17, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text('Despesas', startX + boxWidth + 5 + boxWidth / 2, y + 9, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + boxWidth + 5 + boxWidth / 2, y + 17, { align: 'center' });

  pdf.setFontSize(10);
  pdf.text('Saldo', startX + (boxWidth + 5) * 2 + boxWidth / 2, y + 9, { align: 'center' });
  pdf.setFontSize(11);
  pdf.text(`R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, startX + (boxWidth + 5) * 2 + boxWidth / 2, y + 17, { align: 'center' });

  y += 35;

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Resumo do Período', 20, y);
  y += 10;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`• Total de Receitas Previstas: R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, y);
  y += 7;

  pdf.text(`• Total de Receitas Recebidas: R$ ${receitasRecebidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, y);
  y += 7;

  pdf.text(`• Total de Despesas: R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 20, y);
  y += 7;

  pdf.text(`• Quantidade de Pedidos: ${orders?.length || 0}`, 20, y);
  y += 7;

  pdf.text(`• Quantidade de Parcelas: ${installments?.length || 0}`, 20, y);
}

function addPageNumbers(pdf: jsPDF) {
  const totalPages = pdf.internal.pages.length - 1;

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);

    if (i > 1) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Página ${i} de ${totalPages}`,
        pdf.internal.pageSize.width / 2,
        pdf.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
  }
}
