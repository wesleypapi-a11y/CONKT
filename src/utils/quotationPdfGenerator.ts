import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';
import { addLogoToPdf } from './pdfLogoHelper';

interface QuotationData {
  quotation: any;
  supplier: any;
  request: any;
  work: any;
  items: any[];
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
};

export async function fetchQuotationData(quotationId: string): Promise<QuotationData | null> {
  try {
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('*')
      .eq('id', quotationId)
      .maybeSingle();

    if (quotationError || !quotation) {
      console.error('Erro ao buscar cotação:', quotationError);
      return null;
    }

    const { data: supplier } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', quotation.supplier_id)
      .maybeSingle();

    const { data: request } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', quotation.request_id)
      .maybeSingle();

    let work = null;
    if (request?.work_id) {
      const { data: workData } = await supabase
        .from('works')
        .select('*')
        .eq('id', request.work_id)
        .maybeSingle();
      work = workData;
    }

    const { data: quotationItems } = await supabase
      .from('quotation_items')
      .select(`
        *,
        purchase_request_items (*)
      `)
      .eq('quotation_id', quotationId)
      .is('deleted_at', null)
      .order('created_at');

    return {
      quotation: quotation || {},
      supplier: supplier || {},
      request: request || {},
      work: work || {},
      items: quotationItems || [],
    };
  } catch (error) {
    console.error('Erro ao buscar dados da cotação:', error);
    return null;
  }
}

export async function generateQuotationPDF(quotationId: string): Promise<Blob | null> {
  const data = await fetchQuotationData(quotationId);
  if (!data) {
    return null;
  }

  const { quotation, supplier, request, work, items } = data;

  const doc = new jsPDF();
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
  doc.text('COTAÇÃO DE PREÇOS', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Solicitação: ${request.request_number || '-'}`, pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Data: ${formatDate(quotation.created_at)}`, pageWidth / 2, 32, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  y = 48;

  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(1);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);

  y += 3;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3);

  let infoY = y + 6;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('FORNECEDOR:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const supplierName = supplier?.fantasy_name || supplier?.name || '-';
  doc.text(supplierName, margin + 32, infoY);

  infoY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('OBRA:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const workName = work?.name || '-';
  doc.text(workName, margin + 18, infoY);

  infoY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('PRAZO ENTREGA:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(quotation.delivery_time || '-', margin + 35, infoY);

  infoY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('CONDIÇÕES PAGTO:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const paymentText = quotation.payment_conditions || '-';
  const paymentLines = doc.splitTextToSize(paymentText, pageWidth - 2 * margin - 45);
  doc.text(paymentLines, margin + 40, infoY);

  infoY += 6;

  if (quotation.observations) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('OBSERVAÇÕES:', margin + 4, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const obsLines = doc.splitTextToSize(quotation.observations, pageWidth - 2 * margin - 35);
    doc.text(obsLines, margin + 32, infoY);
    infoY += obsLines.length * 5;
  }

  y = infoY + 10;

  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 115, 232);
  doc.text('ITENS COTADOS', margin, y);

  y += 8;

  const headerY = y;
  doc.setFillColor(26, 115, 232);
  doc.rect(margin, headerY, pageWidth - 2 * margin, 8, 'F');

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');

  const colX = {
    item: margin + 2,
    complemento: margin + 70,
    qtd: margin + 120,
    unid: margin + 138,
    valorUnit: margin + 155,
    valorTotal: margin + 178
  };

  doc.text('ITEM', colX.item, headerY + 5);
  doc.text('COMPLEMENTO', colX.complemento, headerY + 5);
  doc.text('QTD', colX.qtd, headerY + 5);
  doc.text('UN', colX.unid, headerY + 5);
  doc.text('V.UNIT', colX.valorUnit, headerY + 5);
  doc.text('V.TOTAL', colX.valorTotal, headerY + 5);

  y = headerY + 8;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  let totalValue = 0;

  items.forEach((item, index) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    }

    const requestItem = item.purchase_request_items || {};
    const itemText = doc.splitTextToSize(requestItem.item_name || '', 65);
    doc.text(itemText[0] || '', colX.item, y + 4);

    const complementText = requestItem.complement ? doc.splitTextToSize(requestItem.complement, 48) : [];
    doc.text(complementText[0] || '', colX.complemento, y + 4);

    doc.text(String(requestItem.quantity || 0), colX.qtd, y + 4);
    doc.text(requestItem.unit || '', colX.unid, y + 4);
    doc.text(formatCurrency(item.unit_price || 0), colX.valorUnit, y + 4);
    doc.text(formatCurrency(item.total_price || 0), colX.valorTotal, y + 4);

    totalValue += item.total_price || 0;

    y += 6;
  });

  y += 2;
  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', pageWidth - margin - 60, y);
  doc.setFontSize(12);
  doc.text(formatCurrency(totalValue), pageWidth - margin - 2, y, { align: 'right' });

  y += 15;

  if (y > pageHeight - 30) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Total de itens: ${items.length}`, margin, y);

  doc.setFontSize(7);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, pageHeight - 10);

  return doc.output('blob');
}
