import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { addLogoToPdf } from './pdfLogoHelper';

interface QuotationComparisonData {
  quotations: any[];
  requestItems: any[];
  quotationItems: { [quotationId: string]: { [itemId: string]: { unit_price: number; total_price: number } } };
  selectedRequest?: any;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return new Date().toLocaleDateString('pt-BR');
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export async function generateQuotationComparisonPDF(data: QuotationComparisonData): Promise<void> {
  const { quotations, requestItems, quotationItems, selectedRequest } = data;

  // Buscar informações do cliente, obra e endereço
  let client = null;
  let work = null;
  let phase_name = '';
  let subphase_name = '';

  if (selectedRequest?.work_id) {
    const { data: workData } = await supabase
      .from('works')
      .select('*')
      .eq('id', selectedRequest.work_id)
      .maybeSingle();
    work = workData;

    if (work?.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', work.client_id)
        .maybeSingle();
      client = clientData;
    }
  }

  if (selectedRequest?.phase_id) {
    const { data: phaseData } = await supabase
      .from('budget_items')
      .select('display_number, descricao')
      .eq('id', selectedRequest.phase_id)
      .maybeSingle();
    phase_name = phaseData ? `${phaseData.display_number} - ${phaseData.descricao}` : '';
  }

  if (selectedRequest?.subphase_id) {
    const { data: subphaseData } = await supabase
      .from('budget_items')
      .select('display_number, descricao')
      .eq('id', selectedRequest.subphase_id)
      .maybeSingle();
    subphase_name = subphaseData ? `${subphaseData.display_number} - ${subphaseData.descricao}` : '';
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 10;

  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, pageWidth, 40, 'F');

  await addLogoToPdf(doc, margin, y, 50, 15);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MAPA DE COTAÇÃO', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Solicitação Nº ${selectedRequest?.request_number || '-'}`, pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Data: ${formatDate(selectedRequest?.created_at)}`, pageWidth / 2, 32, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  y = 48;

  // Linha separadora
  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(1);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);

  y += 3;

  // Informações da solicitação
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 45, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 45, 3, 3);

  let infoY = y + 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DA SOLICITAÇÃO', margin + 5, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  infoY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margin + 5, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.name || '-', margin + 25, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Obra:', margin + 5, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(work?.name || '-', margin + 25, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Fase:', margin + 5, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(phase_name || '-', margin + 25, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Subfase:', margin + 5, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(subphase_name || '-', margin + 25, infoY);

  y = infoY + 10;

  // Endereço de Entrega
  const deliveryAddress = work ? (() => {
    const parts = [];

    if (work.work_address) {
      const street = work.work_number
        ? `${work.work_address}, nº ${work.work_number}`
        : work.work_address;
      parts.push(street);
    }

    if (work.work_complement) {
      parts.push(work.work_complement);
    }

    if (work.work_neighborhood) {
      parts.push(`Bairro: ${work.work_neighborhood}`);
    }

    if (work.work_city || work.work_state) {
      const location = [work.work_city, work.work_state].filter(Boolean).join(' - ');
      parts.push(location);
    }

    if (work.work_zip_code) {
      parts.push(`CEP: ${work.work_zip_code}`);
    }

    return parts.join(' - ');
  })() : '-';

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 3, 3);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ENDEREÇO DE ENTREGA', margin + 5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const addressLines = doc.splitTextToSize(deliveryAddress, pageWidth - 2 * margin - 10);
  doc.text(addressLines, margin + 5, y + 13);

  y += 25;

  // Título da seção de cotações
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPARAÇÃO DE COTAÇÕES', margin, y);

  y += 5;

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

  const colWidths = {
    item: 75,
    qty: 18,
    unit: 18,
    perfect: 32
  };
  const supplierColWidth = (pageWidth - 2 * margin - colWidths.item - colWidths.qty - colWidths.unit - colWidths.perfect) / quotations.length;

  doc.setFillColor(26, 115, 232);
  const headerHeight = 12;
  doc.rect(margin, y, pageWidth - 2 * margin, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  let xPos = margin + 3;
  doc.text('DESCRIÇÃO DO ITEM', xPos, y + 8);
  xPos += colWidths.item;
  doc.text('QTD', xPos + 9, y + 8, { align: 'center' });
  xPos += colWidths.qty;
  doc.text('UND', xPos + 9, y + 8, { align: 'center' });
  xPos += colWidths.unit;

  doc.setFillColor(16, 185, 129);
  doc.rect(xPos, y, colWidths.perfect, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('ORÇAMENTO', xPos + colWidths.perfect / 2, y + 5, { align: 'center' });
  doc.text('PERFEITO', xPos + colWidths.perfect / 2, y + 9, { align: 'center' });
  xPos += colWidths.perfect;

  doc.setFillColor(26, 115, 232);
  doc.setFontSize(8);
  quotations.forEach(quot => {
    const supplierName = quot.supplier_name || 'Fornecedor';
    const maxWidth = supplierColWidth - 4;
    const lines = doc.splitTextToSize(supplierName.toUpperCase(), maxWidth);
    doc.text(lines[0] || supplierName.toUpperCase(), xPos + supplierColWidth / 2, y + 7, { align: 'center' });
    xPos += supplierColWidth;
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  y += headerHeight + 2;

  requestItems.forEach((item, index) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 15;
    }

    const lowestPrice = getLowestPrice(item.id);
    const rowHeight = 8;

    const rowBg: [number, number, number] = index % 2 === 0 ? [255, 255, 255] : [245, 247, 250];
    doc.setFillColor(...rowBg);
    doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F');

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.rect(margin, y, pageWidth - 2 * margin, rowHeight);

    doc.setFontSize(7);
    xPos = margin + 2;

    const itemName = item.item_name || '';
    const itemLines = doc.splitTextToSize(itemName, colWidths.item - 4);
    doc.text(itemLines[0] || '', xPos, y + 5);
    xPos += colWidths.item;

    doc.text(String(item.quantity || 0), xPos + 7, y + 5, { align: 'center' });
    xPos += colWidths.qty;

    doc.text(item.unit || '', xPos + 7, y + 5, { align: 'center' });
    xPos += colWidths.unit;

    doc.setFillColor(220, 252, 231);
    doc.rect(xPos, y, colWidths.perfect, rowHeight, 'F');
    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    const perfectPrice = lowestPrice > 0
      ? lowestPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '-';
    doc.text(perfectPrice, xPos + colWidths.perfect / 2, y + 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    xPos += colWidths.perfect;

    quotations.forEach(quot => {
      const itemData = quotationItems[quot.id]?.[item.id];
      const unitPrice = itemData?.unit_price || 0;
      const isLowest = unitPrice > 0 && unitPrice === lowestPrice;

      if (isLowest) {
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
      }

      const priceText = unitPrice > 0
        ? unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '-';
      doc.text(priceText, xPos + supplierColWidth / 2, y + 5, { align: 'center' });

      if (isLowest) {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
      }

      xPos += supplierColWidth;
    });

    y += rowHeight;
  });

  y += 3;

  // Linha separadora antes do total
  doc.setLineWidth(1);
  doc.setDrawColor(26, 115, 232);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;

  // Totais
  doc.setFillColor(26, 115, 232);
  const totalRowHeight = 12;
  doc.rect(margin, y, pageWidth - 2 * margin, totalRowHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  xPos = margin + 5;
  doc.text('VALOR TOTAL:', xPos, y + 8);

  xPos = margin + colWidths.item + colWidths.qty + colWidths.unit;

  doc.setFillColor(16, 185, 129);
  doc.rect(xPos, y, colWidths.perfect, totalRowHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  const perfectTotal = calculatePerfectBudget().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  doc.text(perfectTotal, xPos + colWidths.perfect / 2, y + 8, { align: 'center' });
  doc.setFillColor(26, 115, 232);
  doc.setTextColor(255, 255, 255);
  xPos += colWidths.perfect;

  quotations.forEach(quot => {
    const totalText = quot.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    doc.text(totalText, xPos + supplierColWidth / 2, y + 8, { align: 'center' });
    xPos += supplierColWidth;
  });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  y += totalRowHeight + 8;

  // Nota explicativa
  if (y < pageHeight - 25) {
    doc.setFillColor(254, 252, 232);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 15, 3, 3, 'F');
    doc.setDrawColor(251, 191, 36);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 15, 3, 3);

    doc.setFontSize(8);
    doc.setTextColor(120, 53, 15);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÃO:', margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Os valores destacados em verde negrito representam os menores preços unitários de cada item.',
      margin + 5,
      y + 11
    );
    doc.setTextColor(0, 0, 0);
  }

  const fileName = `Mapa_Cotacao_${selectedRequest?.request_number || 'novo'}.pdf`;
  doc.save(fileName);
}
