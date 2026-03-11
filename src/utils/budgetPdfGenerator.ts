import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface BudgetData {
  budget: any;
  work: any;
  client: any;
  items: any[];
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const recalculateDisplayNumbers = (itemsList: any[]) => {
  let currentMacroNumber = 0;
  let lastMacroNumber = 0;
  const childCounters: { [key: number]: number } = {};

  return itemsList.map((item, index) => {
    if (item.tipo === 'macro') {
      currentMacroNumber++;
      lastMacroNumber = currentMacroNumber;
      childCounters[currentMacroNumber] = 0;
      return {
        ...item,
        display_number: String(currentMacroNumber),
        macro_number: currentMacroNumber,
        parent_id: null,
      };
    } else {
      if (lastMacroNumber > 0) {
        childCounters[lastMacroNumber] = (childCounters[lastMacroNumber] || 0) + 1;
        return {
          ...item,
          display_number: `${lastMacroNumber}.${childCounters[lastMacroNumber]}`,
          parent_id: null,
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
};

export async function fetchBudgetData(budgetId: string): Promise<BudgetData | null> {
  try {
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .maybeSingle();

    if (budgetError || !budget) {
      console.error('Erro ao buscar orçamento:', budgetError);
      return null;
    }

    const { data: work } = await supabase
      .from('works')
      .select('*')
      .eq('id', budget.work_id)
      .maybeSingle();

    let client = null;
    if (work?.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', work.client_id)
        .maybeSingle();
      client = clientData;
    }

    const { data: items } = await supabase
      .from('budget_items')
      .select('*')
      .eq('budget_id', budgetId)
      .order('ordem', { ascending: true });

    const itemsWithNumbers = recalculateDisplayNumbers(items || []);

    const { data: entriesData } = await supabase
      .from('financial_entries')
      .select('subphase_id, value')
      .eq('status', 'ativo');

    const realizedValues: { [key: string]: number } = {};
    for (const entry of entriesData || []) {
      if (entry.subphase_id) {
        realizedValues[entry.subphase_id] = (realizedValues[entry.subphase_id] || 0) + (entry.value || 0);
      }
    }

    return {
      budget: budget || {},
      work: work || {},
      client: client || {},
      items: itemsWithNumbers.map(item => ({
        ...item,
        realized: realizedValues[item.id] || 0
      })),
    };
  } catch (error) {
    console.error('Erro ao buscar dados do orçamento:', error);
    return null;
  }
}

const calculateMacroTotal = (items: any[], macroIndex: number): number => {
  const macro = items[macroIndex];
  if (!macro || macro.tipo !== 'macro') return 0;

  let total = 0;
  for (let i = macroIndex + 1; i < items.length; i++) {
    const item = items[i];
    if (item.tipo === 'macro') break;
    if (item.display_number && item.display_number.startsWith(macro.display_number + '.')) {
      total += item.valor_total || 0;
    }
  }
  return total;
};

export async function generateBudgetPDF(budgetId: string): Promise<void> {
  const data = await fetchBudgetData(budgetId);
  if (!data) {
    alert('Erro ao buscar dados do orçamento');
    return;
  }

  const { budget, work, client, items } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 10;

  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORÇAMENTO', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const tituloCompleto = budget.revisao ? `${budget.titulo || 'Sem título'} - REV. ${budget.revisao}` : (budget.titulo || 'Sem título');
  doc.text(tituloCompleto, pageWidth / 2, 25, { align: 'center' });

  if (budget.validade) {
    doc.setFontSize(9);
    doc.text(`Validade: ${new Date(budget.validade).toLocaleDateString('pt-BR')}`, pageWidth / 2, 32, { align: 'center' });
  }

  doc.setTextColor(0, 0, 0);

  y = 48;

  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(1);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);

  y += 3;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 28, 3, 3);

  let infoY = y + 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('OBRA:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const workName = work.name || '-';
  doc.text(workName, margin + 18, infoY, { maxWidth: 80 });

  const clientName = client.nome_fantasia || client.razao_social || '-';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('CLIENTE:', margin + 100, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(clientName, margin + 122, infoY, { maxWidth: 60 });

  infoY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('LOCAL:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const address = work.work_address || '-';
  doc.text(address, margin + 18, infoY, { maxWidth: pageWidth - 2 * margin - 22 });

  infoY += 6;

  if (client.cnpj_cpf) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('CNPJ/CPF:', margin + 4, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(client.cnpj_cpf, margin + 24, infoY);
  }

  y += 33;

  if (budget.areas && Array.isArray(budget.areas) && budget.areas.length > 0) {
    const hasAreas = budget.areas.some((area: any) => area.nome || area.area);

    if (hasAreas) {
      doc.setFillColor(240, 248, 255);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 3, 3, 'F');
      doc.setDrawColor(26, 115, 232);
      doc.setLineWidth(0.5);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 3, 3);

      let areaY = y + 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 115, 232);
      doc.text('ÁREAS:', margin + 4, areaY);
      doc.setTextColor(0, 0, 0);

      areaY += 5;

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      const areaTexts = budget.areas
        .filter((area: any) => area.nome || area.area)
        .map((area: any) => `${area.nome || 'Área'}: ${area.area || 0}m²`)
        .join('  |  ');

      doc.text(areaTexts, margin + 4, areaY, { maxWidth: pageWidth - 2 * margin - 8 });

      const totalArea = budget.areas.reduce((sum: number, area: any) => sum + (area.area || 0), 0);

      areaY += 5;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 115, 232);
      doc.text(`TOTAL: ${totalArea.toFixed(2)}m²`, margin + 4, areaY);
      doc.setTextColor(0, 0, 0);

      y += 23;
    }
  }

  if (budget.foto_obra_url) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 85, 3, 3, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 85, 3, 3);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('FOTO DA OBRA', margin + 4, y + 6);

    try {
      doc.addImage(budget.foto_obra_url, 'JPEG', margin + 4, y + 10, pageWidth - 2 * margin - 8, 70, undefined, 'FAST');
    } catch (error) {
      console.log('Erro ao adicionar foto ao PDF');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Foto não disponível', pageWidth / 2, y + 45, { align: 'center' });
    }

    y += 90;
  }

  const calculateTotalByEtapa = (etapa: string): number => {
    let total = 0;
    items.forEach((item, index) => {
      if (item.tipo === 'macro') {
        const macroTotal = calculateMacroTotal(items, index);
        const macroEtapa = item.etapa?.toUpperCase();
        if (macroEtapa === etapa) {
          total += macroTotal;
        }
      } else if (!item.display_number.includes('.')) {
        const itemEtapa = item.etapa?.toUpperCase();
        if (itemEtapa === etapa) {
          total += item.valor_total || 0;
        }
      }
    });
    return total;
  };

  const calculateRealizedByEtapa = (etapa: string): number => {
    let total = 0;
    items.forEach((item, index) => {
      if (item.tipo === 'macro') {
        const macroEtapa = item.etapa?.toUpperCase();
        if (macroEtapa === etapa) {
          for (let i = index + 1; i < items.length; i++) {
            const childItem = items[i];
            if (childItem.tipo === 'macro') break;
            if (childItem.display_number && childItem.display_number.startsWith(item.display_number + '.')) {
              total += childItem.realized || 0;
            }
          }
        }
      } else if (!item.display_number.includes('.')) {
        const itemEtapa = item.etapa?.toUpperCase();
        if (itemEtapa === etapa) {
          total += item.realized || 0;
        }
      }
    });
    return total;
  };

  const totalCinza = calculateTotalByEtapa('CINZA');
  const totalAcabamento = calculateTotalByEtapa('ACABAMENTO');
  const totalGeral = budget.valor_total || (totalCinza + totalAcabamento);
  const realizedCinza = calculateRealizedByEtapa('CINZA');
  const realizedAcabamento = calculateRealizedByEtapa('ACABAMENTO');
  const realizedTotal = realizedCinza + realizedAcabamento;

  const totalArea = budget.areas && Array.isArray(budget.areas)
    ? budget.areas.reduce((sum: number, area: any) => sum + (area.area || 0), 0)
    : 0;

  const hasAreaInfo = totalArea > 0;
  const boxHeight = hasAreaInfo ? 36 : 28;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 3, 3, 'F');
  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 3, 3);

  const resumoY = y + 5;
  const colW = (pageWidth - 2 * margin - 8) / 3;

  const cardHeight = hasAreaInfo ? 27 : 19;

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 4, resumoY, colW - 2, cardHeight, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 4, resumoY, colW - 2, cardHeight, 2, 2);

  doc.roundedRect(margin + 4 + colW, resumoY, colW - 2, cardHeight, 2, 2, 'F');
  doc.roundedRect(margin + 4 + colW, resumoY, colW - 2, cardHeight, 2, 2);

  doc.setFillColor(52, 168, 83);
  doc.roundedRect(margin + 4 + colW * 2, resumoY, colW - 2, cardHeight, 2, 2, 'F');
  doc.setLineWidth(0);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CINZA', margin + 4 + colW / 2, resumoY + 3, { align: 'center' });
  doc.text('ACABAMENTO', margin + 4 + colW + colW / 2, resumoY + 3, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', margin + 4 + colW * 2 + colW / 2, resumoY + 3, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 115, 232);
  doc.text(`R$ ${formatCurrency(totalCinza)}`, margin + 4 + colW / 2, resumoY + 8, { align: 'center' });
  doc.text(`R$ ${formatCurrency(totalAcabamento)}`, margin + 4 + colW + colW / 2, resumoY + 8, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`R$ ${formatCurrency(totalGeral)}`, margin + 4 + colW * 2 + colW / 2, resumoY + 8, { align: 'center' });

  if (hasAreaInfo) {
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Custo/m²', margin + 4 + colW / 2, resumoY + 12, { align: 'center' });
    doc.text('Custo/m²', margin + 4 + colW + colW / 2, resumoY + 12, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text('Custo/m²', margin + 4 + colW * 2 + colW / 2, resumoY + 12, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 115, 232);
    doc.text(`R$ ${formatCurrency(totalCinza / totalArea)}`, margin + 4 + colW / 2, resumoY + 16, { align: 'center' });
    doc.text(`R$ ${formatCurrency(totalAcabamento / totalArea)}`, margin + 4 + colW + colW / 2, resumoY + 16, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text(`R$ ${formatCurrency(totalGeral / totalArea)}`, margin + 4 + colW * 2 + colW / 2, resumoY + 16, { align: 'center' });

    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Realizado', margin + 4 + colW / 2, resumoY + 20, { align: 'center' });
    doc.text('Realizado', margin + 4 + colW + colW / 2, resumoY + 20, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text('Realizado Total', margin + 4 + colW * 2 + colW / 2, resumoY + 20, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`R$ ${formatCurrency(realizedCinza)}`, margin + 4 + colW / 2, resumoY + 24, { align: 'center' });
    doc.text(`R$ ${formatCurrency(realizedAcabamento)}`, margin + 4 + colW + colW / 2, resumoY + 24, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text(`R$ ${formatCurrency(realizedTotal)}`, margin + 4 + colW * 2 + colW / 2, resumoY + 24, { align: 'center' });
  } else {
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Realizado', margin + 4 + colW / 2, resumoY + 12, { align: 'center' });
    doc.text('Realizado', margin + 4 + colW + colW / 2, resumoY + 12, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text('Realizado Total', margin + 4 + colW * 2 + colW / 2, resumoY + 12, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`R$ ${formatCurrency(realizedCinza)}`, margin + 4 + colW / 2, resumoY + 16, { align: 'center' });
    doc.text(`R$ ${formatCurrency(realizedAcabamento)}`, margin + 4 + colW + colW / 2, resumoY + 16, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.text(`R$ ${formatCurrency(realizedTotal)}`, margin + 4 + colW * 2 + colW / 2, resumoY + 16, { align: 'center' });
  }

  y += boxHeight + 6;

  doc.setFillColor(52, 168, 83);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`ITENS DO ORÇAMENTO (${items.length})`, margin + 4, y + 5.5);
  doc.setTextColor(0, 0, 0);

  y += 12;

  const colWidths = {
    item: 10,
    etapa: 15,
    descricao: 45,
    fase: 8,
    unidade: 10,
    quantidade: 12,
    valorUnit: 18,
    total: 18,
    realizado: 18,
    orcamento: 15,
    obs: 11,
  };

  doc.setFillColor(230, 230, 230);
  let headerX = margin;
  Object.values(colWidths).forEach((width) => {
    doc.rect(headerX, y, width, 8, 'F');
    headerX += width;
  });

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  let xPos = margin + colWidths.item / 2;
  doc.text('Item', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.item / 2 + colWidths.etapa / 2;
  doc.text('Etapa', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.etapa / 2 + colWidths.descricao / 2;
  doc.text('Descrição', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.descricao / 2 + colWidths.fase / 2;
  doc.text('FASE', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.fase / 2 + colWidths.unidade / 2;
  doc.text('Unid.', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.unidade / 2 + colWidths.quantidade / 2;
  doc.text('Qtd', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.quantidade / 2 + colWidths.valorUnit / 2;
  doc.text('Valor Unit.', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.valorUnit / 2 + colWidths.total / 2;
  doc.text('Total', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.total / 2 + colWidths.realizado / 2;
  doc.text('Realizado', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.realizado / 2 + colWidths.orcamento / 2;
  doc.text('Orçamento', xPos, y + 5.5, { align: 'center' });

  xPos += colWidths.orcamento / 2 + colWidths.obs / 2;
  doc.text('Obs.', xPos, y + 5.5, { align: 'center' });

  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);

  items.forEach((item, index) => {
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;

      doc.setFillColor(230, 230, 230);
      let headerX = margin;
      Object.values(colWidths).forEach((width) => {
        doc.rect(headerX, y, width, 8, 'F');
        headerX += width;
      });

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');

      let xPos = margin + colWidths.item / 2;
      doc.text('Item', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.item / 2 + colWidths.etapa / 2;
      doc.text('Etapa', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.etapa / 2 + colWidths.descricao / 2;
      doc.text('Descrição', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.descricao / 2 + colWidths.fase / 2;
      doc.text('FASE', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.fase / 2 + colWidths.unidade / 2;
      doc.text('Unid.', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.unidade / 2 + colWidths.quantidade / 2;
      doc.text('Qtd', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.quantidade / 2 + colWidths.valorUnit / 2;
      doc.text('Val.Unit', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.valorUnit / 2 + colWidths.total / 2;
      doc.text('Total', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.total / 2 + colWidths.realizado / 2;
      doc.text('Realizado', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.realizado / 2 + colWidths.orcamento / 2;
      doc.text('Orçamento', xPos, y + 5.5, { align: 'center' });
      xPos += colWidths.orcamento / 2 + colWidths.obs / 2;
      doc.text('Obs', xPos, y + 5.5, { align: 'center' });

      y += 8;
      doc.setFont('helvetica', 'normal');
    }

    if (item.tipo === 'macro') {
      doc.setFillColor(255, 251, 230);
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
    }

    const rowHeight = 6;
    let drawX = margin;
    Object.values(colWidths).forEach((width) => {
      doc.rect(drawX, y, width, rowHeight);
      drawX += width;
    });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(5);

    const verticalCenter = y + rowHeight / 2 + 1;

    let xPos = margin + colWidths.item / 2;
    doc.text((item.display_number || String(index + 1)).substring(0, 8), xPos, verticalCenter, { align: 'center' });

    xPos += colWidths.item / 2 + colWidths.etapa / 2;
    doc.text((item.etapa || '-').substring(0, 10), xPos, verticalCenter, { align: 'center' });

    xPos += colWidths.etapa / 2 + 1;
    doc.text((item.descricao || '-').substring(0, 45), xPos, verticalCenter);

    xPos = margin + colWidths.item + colWidths.etapa + colWidths.descricao + colWidths.fase / 2;
    doc.text(item.tipo === 'macro' ? 'X' : '', xPos, verticalCenter, { align: 'center' });

    xPos += colWidths.fase / 2 + colWidths.unidade / 2;
    doc.text(item.tipo === 'macro' ? '-' : (item.unidade || '-').substring(0, 5), xPos, verticalCenter, { align: 'center' });

    xPos += colWidths.unidade / 2 + colWidths.quantidade / 2;
    doc.text(item.tipo === 'macro' ? '-' : String(item.quantidade || 0).substring(0, 8), xPos, verticalCenter, { align: 'center' });

    xPos += colWidths.quantidade / 2 + colWidths.valorUnit - 1;
    doc.text(item.tipo === 'macro' ? '-' : formatCurrency(item.valor_unitario || 0), xPos, verticalCenter, { align: 'right' });

    xPos = margin + colWidths.item + colWidths.etapa + colWidths.descricao + colWidths.fase + colWidths.unidade + colWidths.quantidade + colWidths.valorUnit + colWidths.total - 1;
    const totalValue = item.tipo === 'macro' ? calculateMacroTotal(items, index) : (item.valor_total || 0);
    doc.text(formatCurrency(totalValue), xPos, verticalCenter, { align: 'right' });

    xPos = margin + colWidths.item + colWidths.etapa + colWidths.descricao + colWidths.fase + colWidths.unidade + colWidths.quantidade + colWidths.valorUnit + colWidths.total + colWidths.realizado - 1;
    doc.text(formatCurrency(item.realized || 0), xPos, verticalCenter, { align: 'right' });

    xPos += colWidths.realizado / 2 + 1;
    doc.text((item.orcamento || '-').substring(0, 12), xPos, verticalCenter);

    xPos = margin + colWidths.item + colWidths.etapa + colWidths.descricao + colWidths.fase + colWidths.unidade + colWidths.quantidade + colWidths.valorUnit + colWidths.total + colWidths.realizado + colWidths.orcamento + 1;
    doc.text((item.obs || '-').substring(0, 10), xPos, verticalCenter);

    y += rowHeight;
  });

  if (y > pageHeight - 70) {
    doc.addPage();
    y = 20;
  }

  y += 5;

  doc.setFillColor(230, 230, 230);
  doc.rect(margin, y, pageWidth - 2 * margin - colWidths.total, 8);
  doc.rect(margin + pageWidth - 2 * margin - colWidths.total, y, colWidths.total, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Subtotal CINZA (R$)', margin + 4, y + 5.5);
  doc.text(formatCurrency(totalCinza), margin + pageWidth - 2 * margin - 2, y + 5.5, { align: 'right' });

  y += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - 2 * margin - colWidths.total, 8);
  doc.rect(margin + pageWidth - 2 * margin - colWidths.total, y, colWidths.total, 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Subtotal ACABAMENTO (R$)', margin + 4, y + 5.5);
  doc.text(formatCurrency(totalAcabamento), margin + pageWidth - 2 * margin - 2, y + 5.5, { align: 'right' });

  y += 10;

  doc.setFillColor(52, 168, 83);
  doc.rect(margin, y, pageWidth - 2 * margin - colWidths.total, 10, 'F');
  doc.rect(margin + pageWidth - 2 * margin - colWidths.total, y, colWidths.total, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL DA OBRA (R$)', margin + 4, y + 6.5);
  doc.text(formatCurrency(totalGeral), margin + pageWidth - 2 * margin - 2, y + 6.5, { align: 'right' });

  y += 15;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Criado em: ${new Date(budget.created_at).toLocaleDateString('pt-BR')}`, margin, y);
  if (budget.validade) {
    doc.text(`Validade: ${new Date(budget.validade).toLocaleDateString('pt-BR')}`, pageWidth - margin, y, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);

  const fileName = `Orcamento_${budget.titulo?.replace(/[^a-zA-Z0-9]/g, '_') || 'Sem_Titulo'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
