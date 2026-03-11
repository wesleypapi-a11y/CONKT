import jsPDF from 'jspdf';

interface ContractData {
  id: string;
  contract_number: string;
  contract_date: string;
  total_value: number;
  payment_method: string;
  installments_count: number;
  scope: string;
  internal_notes: string;
  status: string;
  vinculo: string;
  first_due_date?: string;
  recurrence_days?: number;
  budget_phase_id?: string;
  budget_subphase_id?: string;
  start_date?: string;
  end_date?: string;
  client?: {
    nome?: string;
    razao_social?: string;
    nome_fantasia?: string;
    cpf_cnpj?: string;
    cnpj_cpf?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  supplier?: {
    name?: string;
    fantasy_name?: string;
    cnpj_cpf?: string;
    phone?: string;
    email?: string;
  };
  work?: {
    codigo?: string;
    work_code?: string;
    nome?: string;
    name?: string;
    work_address?: string;
    work_number?: string;
    work_neighborhood?: string;
    work_city?: string;
    work_state?: string;
    work_zip_code?: string;
  };
}

interface InstallmentData {
  installment_number: number;
  due_date: string;
  amount: number;
  status?: string;
  paid?: boolean;
  payment_date?: string;
  paid_date?: string;
  paid_amount?: number;
}

interface AttachmentData {
  file_name: string;
  file_type: string;
}

export async function generateContractPdf(
  contract: ContractData,
  installments: InstallmentData[],
  attachments: AttachmentData[]
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addText = (text: string, x: number, y: number, options: any = {}) => {
    doc.text(text, x, y, options);
  };

  const addNewPage = () => {
    doc.addPage();
    yPosition = margin;
  };

  const checkPageBreak = (requiredSpace: number = 10) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      addNewPage();
    }
  };

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  addText('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  addText(`Contrato Nº: ${contract.contract_number}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  addText('DADOS DO CONTRATO', margin, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  addText(`Data do Contrato: ${new Date(contract.contract_date).toLocaleDateString('pt-BR')}`, margin, yPosition);
  yPosition += 6;

  if (contract.start_date) {
    addText(`Data de Início: ${new Date(contract.start_date).toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 6;
  }

  if (contract.end_date) {
    addText(`Data de Término: ${new Date(contract.end_date).toLocaleDateString('pt-BR')}`, margin, yPosition);
    yPosition += 6;
  }

  addText(`Status: ${contract.status === 'ativo' ? 'Ativo' : contract.status === 'concluido' ? 'Concluído' : 'Cancelado'}`, margin, yPosition);
  yPosition += 6;

  addText(`Vínculo: ${contract.vinculo === 'com_vinculo' ? 'Com Vínculo' : 'Sem Vínculo'}`, margin, yPosition);
  yPosition += 10;

  if (contract.client) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    addText('CONTRATANTE', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    const clientName = contract.client.nome_fantasia || contract.client.razao_social || contract.client.nome || 'Não informado';
    addText(`Nome/Razão Social: ${clientName}`, margin, yPosition);
    yPosition += 6;

    const clientDoc = contract.client.cnpj_cpf || contract.client.cpf_cnpj || 'Não informado';
    addText(`CPF/CNPJ: ${clientDoc}`, margin, yPosition);
    yPosition += 6;

    if (contract.client.telefone) {
      addText(`Telefone: ${contract.client.telefone}`, margin, yPosition);
      yPosition += 6;
    }

    if (contract.client.email) {
      addText(`E-mail: ${contract.client.email}`, margin, yPosition);
      yPosition += 6;
    }

    if (contract.client.endereco) {
      const fullAddress = `${contract.client.endereco}${contract.client.numero ? ', ' + contract.client.numero : ''}${contract.client.bairro ? ' - ' + contract.client.bairro : ''}`;
      addText(`Endereço: ${fullAddress}`, margin, yPosition);
      yPosition += 6;
      if (contract.client.cidade && contract.client.estado) {
        addText(`${contract.client.cidade}/${contract.client.estado}${contract.client.cep ? ' - CEP: ' + contract.client.cep : ''}`, margin, yPosition);
        yPosition += 6;
      }
    }
    yPosition += 4;
  }

  if (contract.supplier) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    addText('CONTRATADO (FORNECEDOR)', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    const supplierName = contract.supplier.fantasy_name || contract.supplier.name || 'Não informado';
    addText(`Nome/Razão Social: ${supplierName}`, margin, yPosition);
    yPosition += 6;

    const supplierDoc = contract.supplier.cnpj_cpf || 'Não informado';
    addText(`CPF/CNPJ: ${supplierDoc}`, margin, yPosition);
    yPosition += 6;

    if (contract.supplier.phone) {
      addText(`Telefone: ${contract.supplier.phone}`, margin, yPosition);
      yPosition += 6;
    }

    if (contract.supplier.email) {
      addText(`E-mail: ${contract.supplier.email}`, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 4;
  }

  if (contract.work) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    addText('OBRA VINCULADA', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    const workCode = contract.work.work_code || contract.work.codigo || 'N/A';
    addText(`Código: ${workCode}`, margin, yPosition);
    yPosition += 6;

    const workName = contract.work.name || contract.work.nome || 'Não informado';
    addText(`Nome: ${workName}`, margin, yPosition);
    yPosition += 6;

    if (contract.work.work_address) {
      const workFullAddress = `${contract.work.work_address}${contract.work.work_number ? ', ' + contract.work.work_number : ''}${contract.work.work_neighborhood ? ' - ' + contract.work.work_neighborhood : ''}`;
      addText(`Endereço: ${workFullAddress}`, margin, yPosition);
      yPosition += 6;
      if (contract.work.work_city && contract.work.work_state) {
        addText(`${contract.work.work_city}/${contract.work.work_state}${contract.work.work_zip_code ? ' - CEP: ' + contract.work.work_zip_code : ''}`, margin, yPosition);
        yPosition += 6;
      }
    }
    yPosition += 4;
  }

  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  addText('VALORES E PAGAMENTO', margin, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 5;

  const totalValue = contract.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  addText(`Valor Total: ${totalValue}`, margin, yPosition);
  yPosition += 6;

  addText(`Forma de Pagamento: ${contract.payment_method === 'avista' ? 'À Vista' : contract.payment_method === 'parcelado' ? 'Parcelado' : contract.payment_method}`, margin, yPosition);
  yPosition += 6;

  if (contract.payment_method === 'parcelado') {
    addText(`Número de Parcelas: ${contract.installments_count}`, margin, yPosition);
    yPosition += 6;

    if (contract.first_due_date) {
      addText(`Primeiro Vencimento: ${new Date(contract.first_due_date).toLocaleDateString('pt-BR')}`, margin, yPosition);
      yPosition += 6;
    }

    if (contract.recurrence_days) {
      addText(`Recorrência: A cada ${contract.recurrence_days} dias`, margin, yPosition);
      yPosition += 6;
    }
  }
  yPosition += 4;

  if (installments.length > 0) {
    checkPageBreak(50);
    doc.setFont('helvetica', 'bold');
    addText('PARCELAS', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    doc.setFontSize(8);
    const colWidths = [15, 30, 30, 25, 30, 30];
    const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1],
                  margin + colWidths[0] + colWidths[1] + colWidths[2],
                  margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
                  margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]];

    doc.setFont('helvetica', 'bold');
    addText('Nº', colX[0], yPosition);
    addText('Vencimento', colX[1], yPosition);
    addText('Valor', colX[2], yPosition);
    addText('Status', colX[3], yPosition);
    addText('Data Pgto', colX[4], yPosition);
    addText('Valor Pago', colX[5], yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    installments.forEach((inst) => {
      checkPageBreak(8);
      addText(inst.installment_number.toString(), colX[0], yPosition);
      addText(new Date(inst.due_date).toLocaleDateString('pt-BR'), colX[1], yPosition);
      addText(inst.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), colX[2], yPosition);

      const statusText = inst.paid ? 'Pago' : (inst.status === 'pago' ? 'Pago' : inst.status === 'pendente' ? 'Pendente' : 'Parcial');
      addText(statusText, colX[3], yPosition);

      const paymentDateStr = inst.payment_date || inst.paid_date;
      addText(paymentDateStr ? new Date(paymentDateStr).toLocaleDateString('pt-BR') : '-', colX[4], yPosition);
      addText(inst.paid_amount ? inst.paid_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-', colX[5], yPosition);
      yPosition += 6;
    });

    doc.setFontSize(10);
    yPosition += 4;
  }

  if (contract.scope) {
    checkPageBreak(40);
    doc.setFont('helvetica', 'bold');
    addText('ESCOPO DO CONTRATO', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    const scopeLines = doc.splitTextToSize(contract.scope, contentWidth);
    scopeLines.forEach((line: string) => {
      checkPageBreak();
      addText(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 4;
  }

  if (contract.internal_notes) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    addText('OBSERVAÇÕES INTERNAS', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    const notesLines = doc.splitTextToSize(contract.internal_notes, contentWidth);
    notesLines.forEach((line: string) => {
      checkPageBreak();
      addText(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 4;
  }

  if (attachments.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    addText('ANEXOS', margin, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    attachments.forEach((att, index) => {
      checkPageBreak();
      addText(`${index + 1}. ${att.file_name} (${att.file_type})`, margin, yPosition);
      yPosition += 6;
    });
  }

  checkPageBreak(50);
  yPosition += 20;

  doc.line(margin, yPosition, margin + 70, yPosition);
  yPosition += 5;
  addText('Assinatura do Contratante', margin, yPosition);

  doc.line(pageWidth - margin - 70, yPosition - 5, pageWidth - margin, yPosition - 5);
  yPosition += 5;
  addText('Assinatura do Contratado', pageWidth - margin - 70, yPosition);

  yPosition += 15;
  doc.setFontSize(8);
  addText(`Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    pageWidth / 2, yPosition, { align: 'center' });

  doc.save(`Contrato_${contract.contract_number}.pdf`);
}
