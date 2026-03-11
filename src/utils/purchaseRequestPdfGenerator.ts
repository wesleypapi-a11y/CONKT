import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface PurchaseRequestData {
  request: any;
  work: any;
  items: any[];
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export async function fetchPurchaseRequestData(requestId: string): Promise<PurchaseRequestData | null> {
  try {
    const { data: request, error: requestError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError || !request) {
      console.error('Erro ao buscar solicitação:', requestError);
      return null;
    }

    let work = null;
    if (request.work_id) {
      const { data: workData } = await supabase
        .from('works')
        .select('*')
        .eq('id', request.work_id)
        .maybeSingle();
      work = workData;
    }

    const { data: items } = await supabase
      .from('purchase_request_items')
      .select('*')
      .eq('request_id', requestId)
      .is('deleted_at', null)
      .order('created_at');

    return {
      request: request || {},
      work: work || {},
      items: items || [],
    };
  } catch (error) {
    console.error('Erro ao buscar dados da solicitação:', error);
    return null;
  }
}

export async function generatePurchaseRequestPDF(requestId: string): Promise<Blob | null> {
  const data = await fetchPurchaseRequestData(requestId);
  if (!data) {
    return null;
  }

  const { request, work, items } = data;

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
  doc.text('SOLICITAÇÃO DE COMPRA', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${request.request_number || 'Novo'}`, pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.text(`Data: ${formatDate(request.created_at)}`, pageWidth / 2, 32, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  y = 48;

  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(1);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);

  y += 3;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 35, 3, 3);

  let infoY = y + 6;

  doc.setFontSize(8);
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
  doc.text('SITUAÇÃO:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const statusMap: any = {
    'aberta': 'Aberta',
    'cotando': 'Cotando',
    'aprovada': 'Aprovada',
    'cancelada': 'Cancelada'
  };
  doc.text(statusMap[request.status] || request.status, margin + 26, infoY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('DATA NECESSIDADE:', margin + 100, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(formatDate(request.need_date), margin + 142, infoY);

  infoY += 6;

  if (request.contact_name) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('CONTATO:', margin + 4, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(request.contact_name, margin + 24, infoY);
  }

  if (request.contact_whatsapp) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('WHATSAPP:', margin + 100, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(request.contact_whatsapp, margin + 128, infoY);
  }

  infoY += 6;

  if (request.description) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('DESCRIÇÃO:', margin + 4, infoY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const descLines = doc.splitTextToSize(request.description, pageWidth - 2 * margin - 30);
    doc.text(descLines, margin + 30, infoY);
  }

  y = infoY + 10;

  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 115, 232);
  doc.text('ITENS DA SOLICITAÇÃO', margin, y);

  y += 8;

  const headerY = y;
  doc.setFillColor(26, 115, 232);
  doc.rect(margin, headerY, pageWidth - 2 * margin, 8, 'F');

  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');

  const colX = {
    tipo: margin + 2,
    item: margin + 20,
    complemento: margin + 80,
    qtd: margin + 130,
    unid: margin + 150,
  };

  doc.text('TIPO', colX.tipo, headerY + 5);
  doc.text('ITEM', colX.item, headerY + 5);
  doc.text('COMPLEMENTO', colX.complemento, headerY + 5);
  doc.text('QTD', colX.qtd, headerY + 5);
  doc.text('UNID', colX.unid, headerY + 5);

  y = headerY + 8;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  items.forEach((item, index) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, pageWidth - 2 * margin, 6, 'F');
    }

    const tipoMap: any = {
      'item_livre': 'Livre',
      'insumo': 'Insumo',
      'servico': 'Serviço'
    };

    doc.text(tipoMap[item.item_type] || item.item_type, colX.tipo, y + 4);

    const itemText = doc.splitTextToSize(item.item_name || '', 58);
    doc.text(itemText[0] || '', colX.item, y + 4);

    const complementText = item.complement ? doc.splitTextToSize(item.complement, 48) : [];
    doc.text(complementText[0] || '', colX.complemento, y + 4);

    doc.text(String(item.quantity || 0), colX.qtd, y + 4);
    doc.text(item.unit || '', colX.unid, y + 4);

    y += 6;
  });

  y += 10;

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
