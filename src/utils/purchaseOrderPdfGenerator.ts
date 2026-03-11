import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface PurchaseOrderData {
  order: any;
  work: any;
  supplier: any;
  client: any;
  items: any[];
  phase_name?: string;
  subphase_name?: string;
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export async function fetchPurchaseOrderData(orderId: string): Promise<PurchaseOrderData | null> {
  try {
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !order) {
      console.error('Erro ao buscar pedido:', orderError);
      return null;
    }

    let work = null;
    let client = null;
    let phase_name = '';
    let subphase_name = '';

    // Buscar work_id do pedido diretamente ou da solicitação
    let workId = order.work_id;

    if (!workId && order.request_id) {
      const { data: requestData } = await supabase
        .from('purchase_requests')
        .select('work_id')
        .eq('id', order.request_id)
        .maybeSingle();
      workId = requestData?.work_id;
    }

    if (workId) {
      const { data: workData } = await supabase
        .from('works')
        .select('*')
        .eq('id', workId)
        .is('deleted_at', null)
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

    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', order.supplier_id)
      .maybeSingle();

    if (order.phase_id) {
      const { data: phaseData } = await supabase
        .from('budget_items')
        .select('display_number, descricao')
        .eq('id', order.phase_id)
        .maybeSingle();
      phase_name = phaseData ? `${phaseData.display_number} - ${phaseData.descricao}` : '';
    }

    if (order.subphase_id) {
      const { data: subphaseData } = await supabase
        .from('budget_items')
        .select('display_number, descricao')
        .eq('id', order.subphase_id)
        .maybeSingle();
      subphase_name = subphaseData ? `${subphaseData.display_number} - ${subphaseData.descricao}` : '';
    }

    const { data: orderItems } = await supabase
      .from('purchase_order_items')
      .select('*')
      .eq('order_id', order.id)
      .is('deleted_at', null);

    const items = await Promise.all((orderItems || []).map(async (item) => {
      let phase_display = '-';
      let subphase_display = '-';

      console.log('Item phase_id:', item.phase_id, 'subphase_id:', item.subphase_id);

      if (item.phase_id) {
        const { data: phaseData, error: phaseError } = await supabase
          .from('budget_items')
          .select('descricao, tipo, ordem')
          .eq('id', item.phase_id)
          .maybeSingle();

        if (!phaseError && phaseData) {
          phase_display = phaseData.descricao || '-';
        }
      }

      if (item.subphase_id) {
        const { data: subphaseData, error: subphaseError } = await supabase
          .from('budget_items')
          .select('descricao, tipo, ordem')
          .eq('id', item.subphase_id)
          .maybeSingle();

        if (!subphaseError && subphaseData) {
          subphase_display = subphaseData.descricao || '-';
        }
      }

      return {
        description: item.item_name || '',
        quantity: item.quantity || 0,
        unit: item.unit || 'UN',
        unit_price: item.unit_price || 0,
        total_price: item.total_price || 0,
        phase_display,
        subphase_display
      };
    }));

    return {
      order: order || {},
      work: work || {},
      supplier: supplierData || {},
      client: client || {},
      items: items || [],
      phase_name,
      subphase_name
    };
  } catch (error) {
    console.error('Erro ao buscar dados do pedido:', error);
    return null;
  }
}

export async function generatePurchaseOrderPDF(orderId: string): Promise<Blob | null> {
  const data = await fetchPurchaseOrderData(orderId);
  if (!data) {
    return null;
  }

  const { order, work, supplier, client, items, phase_name, subphase_name } = data;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  let y = 8;

  doc.setFillColor(26, 115, 232);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO DE COMPRA', pageWidth / 2, 11, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nº ${order.order_number || '-'}`, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`Data: ${formatDate(order.created_at)}`, pageWidth / 2, 24, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  y = 32;

  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(0.8);
  doc.line(margin, y - 1, pageWidth - margin, y - 1);

  y += 2;

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 42, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 42, 2, 2);

  let infoY = y + 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DO PEDIDO', margin + 4, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.name || '-', margin + 22, infoY);

  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Obra:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(work?.name || '-', margin + 22, infoY);

  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Fornecedor:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  const supplierName = supplier?.fantasy_name || supplier?.name || '-';
  doc.text(supplierName, margin + 22, infoY);

  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  const statusLabel = order.status === 'aberto' ? 'Aberto' :
                      order.status === 'aprovado' ? 'Aprovado' :
                      order.status === 'cancelado' ? 'Cancelado' :
                      order.status === 'recebido' ? 'Recebido' : order.status;
  doc.text(statusLabel, margin + 22, infoY);

  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Fase:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(phase_name || '-', margin + 22, infoY);

  infoY += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Subfase:', margin + 4, infoY);
  doc.setFont('helvetica', 'normal');
  doc.text(subphase_name || '-', margin + 22, infoY);

  y = infoY + 6;

  // Endereço de Entrega
  const deliveryAddress = work ? (() => {
    const parts = [];

    // Logradouro e número na mesma linha
    if (work.work_address) {
      const street = work.work_number
        ? `${work.work_address}, nº ${work.work_number}`
        : work.work_address;
      parts.push(street);
    }

    // Complemento, se houver
    if (work.work_complement) {
      parts.push(work.work_complement);
    }

    // Bairro
    if (work.work_neighborhood) {
      parts.push(`Bairro: ${work.work_neighborhood}`);
    }

    // Cidade e estado
    if (work.work_city || work.work_state) {
      const location = [work.work_city, work.work_state].filter(Boolean).join(' - ');
      parts.push(location);
    }

    // CEP
    if (work.work_zip_code) {
      parts.push(`CEP: ${work.work_zip_code}`);
    }

    return parts.join(' - ');
  })() : '-';

  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 14, 2, 2);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ENDEREÇO DE ENTREGA', margin + 4, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addressLines = doc.splitTextToSize(deliveryAddress, pageWidth - 2 * margin - 8);
  doc.text(addressLines, margin + 4, y + 9);

  y += 17;

  if (order.payment_conditions) {
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 10, 2, 2);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Forma de Pagamento:', margin + 4, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(order.payment_conditions, margin + 4, y + 8);

    y += 13;
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO PEDIDO', margin, y);

  y += 5;

  doc.setFillColor(26, 115, 232);
  doc.rect(margin, y, pageWidth - 2 * margin, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const colX1 = margin + 2;
  const colX2 = margin + 75;
  const colX3 = margin + 128;
  const colX4 = margin + 168;
  const colX5 = margin + 186;
  const colX6 = margin + 198;
  const colX7 = pageWidth - margin - 2;

  doc.text('Descrição', colX1, y + 6);
  doc.text('Fase', colX2, y + 6);
  doc.text('Subfase', colX3, y + 6);
  doc.text('Qtd', colX4, y + 6);
  doc.text('Un', colX5, y + 6);
  doc.text('Valor Unit.', colX6, y + 6);
  doc.text('Total', colX7, y + 6, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  y += 10;

  const startY = y;
  let totalValue = 0;

  const maxItemsPerPage = 12;
  const itemsToDisplay = items.slice(0, maxItemsPerPage);
  const hasMoreItems = items.length > maxItemsPerPage;

  itemsToDisplay.forEach((item, index) => {
    doc.setFontSize(7);
    const maxDescWidth = 68;
    const maxPhaseWidth = 48;
    const maxSubphaseWidth = 33;

    const description = doc.splitTextToSize(item.description || '-', maxDescWidth);
    const phaseText = doc.splitTextToSize(item.phase_display || '-', maxPhaseWidth);
    const subphaseText = doc.splitTextToSize(item.subphase_display || '-', maxSubphaseWidth);

    const maxLines = Math.max(description.length, phaseText.length, subphaseText.length);
    const rowHeight = Math.max(7, 4 + (maxLines * 3));

    const rowBg = index % 2 === 0 ? [255, 255, 255] : [245, 247, 250];
    doc.setFillColor(...rowBg);
    doc.rect(margin, y - 1, pageWidth - 2 * margin, rowHeight, 'F');

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.rect(margin, y - 1, pageWidth - 2 * margin, rowHeight);

    let textY = y + 2.5;
    doc.text(description, colX1, textY);

    textY = y + 2.5;
    doc.text(phaseText, colX2, textY);

    textY = y + 2.5;
    doc.text(subphaseText, colX3, textY);

    const centerY = y + (rowHeight / 2) + 0.5;
    doc.text(String(item.quantity || 0), colX4 + 5, centerY, { align: 'center' });
    doc.text(item.unit || 'UN', colX5 + 4, centerY, { align: 'center' });
    doc.text('R$ ' + (item.unit_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX6, centerY);
    doc.text('R$ ' + (item.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), colX7, centerY, { align: 'right' });

    totalValue += item.total_price || 0;
    y += rowHeight;
  });

  if (hasMoreItems) {
    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text(`... e mais ${items.length - maxItemsPerPage} item(ns)`, margin + 2, y + 2);
    doc.setTextColor(0, 0, 0);
    y += 5;

    items.slice(maxItemsPerPage).forEach(item => {
      totalValue += item.total_price || 0;
    });
  }

  if (items.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y - 3, pageWidth - 2 * margin, 7, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.1);
    doc.rect(margin, y - 3, pageWidth - 2 * margin, 7);

    doc.setFontSize(7);
    doc.setTextColor(128, 128, 128);
    doc.text('Nenhum item encontrado', pageWidth / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 7;
  }

  y += 3;

  doc.setLineWidth(0.8);
  doc.setDrawColor(26, 115, 232);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;

  const itemsSubtotal = totalValue;
  const freightValue = order.freight_value || 0;
  const discountValue = order.discount_value || 0;
  const finalTotal = itemsSubtotal + freightValue - discountValue;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  if (freightValue > 0 || discountValue > 0) {
    doc.text('Subtotal dos Itens:', pageWidth - margin - 50, y);
    doc.text(
      itemsSubtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      pageWidth - margin - 3,
      y,
      { align: 'right' }
    );
    y += 4;

    if (freightValue > 0) {
      doc.text('Frete:', pageWidth - margin - 50, y);
      doc.text(
        freightValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pageWidth - margin - 3,
        y,
        { align: 'right' }
      );
      y += 4;
    }

    if (discountValue > 0) {
      doc.text('Desconto:', pageWidth - margin - 50, y);
      doc.text(
        '- ' + discountValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        pageWidth - margin - 3,
        y,
        { align: 'right' }
      );
      y += 4;
    }

    y += 1;
  }

  doc.setFillColor(26, 115, 232);
  doc.rect(margin, y - 3, pageWidth - 2 * margin, 9, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('VALOR TOTAL:', margin + 4, y + 3);
  doc.text(
    finalTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    pageWidth - margin - 4,
    y + 3,
    { align: 'right' }
  );

  doc.setTextColor(0, 0, 0);

  y += 12;

  if (order.notes && y < pageHeight - 20) {
    doc.setFillColor(245, 247, 250);
    const maxObsHeight = Math.min(18, pageHeight - y - 5);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, maxObsHeight, 2, 2, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, maxObsHeight, 2, 2);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', margin + 4, y + 5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(order.notes, pageWidth - 2 * margin - 8);
    const maxObsLines = Math.floor((maxObsHeight - 7) / 3);
    const displayedLines = obsLines.slice(0, maxObsLines);
    doc.text(displayedLines, margin + 4, y + 10);
  }

  const fileName = `Pedido_${order.order_number || 'novo'}.pdf`;
  doc.save(fileName);

  return doc.output('blob');
}
