import jsPDF from 'jspdf';
import { supabase } from '../lib/supabase';

interface RDOData {
  work_diary: any;
  work: any;
  labor: any[];
  activities: any[];
  occurrences: any[];
  comments: any[];
  photos: any[];
  photosCount: number;
}

const getWeatherLabel = (weather: string) => {
  const labels: Record<string, string> = {
    'claro': 'Claro',
    'nublado': 'Nublado',
    'chuvoso': 'Chuvoso'
  };
  return labels[weather] || weather;
};

const getConditionLabel = (condition: string) => {
  const labels: Record<string, string> = {
    'praticavel': 'Praticável',
    'impraticavel': 'Impraticável'
  };
  return labels[condition] || condition;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'preenchendo': 'Preenchendo',
    'revisar': 'Revisar',
    'aprovado': 'Aprovado'
  };
  return labels[status] || status;
};

const getStatusColor = (status: string): [number, number, number] => {
  const colors: Record<string, [number, number, number]> = {
    'preenchendo': [251, 191, 36],
    'revisar': [239, 68, 68],
    'aprovado': [34, 197, 94]
  };
  return colors[status] || [156, 163, 175];
};

const loadImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro ao carregar imagem:', error);
    return null;
  }
};

export async function fetchRDOData(rdoId: string): Promise<RDOData | null> {
  try {
    const { data: workDiary, error: rdoError } = await supabase
      .from('work_diaries')
      .select('*')
      .eq('id', rdoId)
      .maybeSingle();

    if (rdoError || !workDiary) {
      console.error('Erro ao buscar RDO:', rdoError);
      return null;
    }

    const { data: work } = await supabase
      .from('works')
      .select('*')
      .eq('id', workDiary.work_id)
      .maybeSingle();

    const { data: labor } = await supabase
      .from('work_diary_labor')
      .select('*')
      .eq('work_diary_id', rdoId);

    const { data: activities } = await supabase
      .from('work_diary_activities')
      .select('*')
      .eq('work_diary_id', rdoId);

    const { data: occurrences } = await supabase
      .from('work_diary_occurrences')
      .select('*')
      .eq('work_diary_id', rdoId);

    const { data: comments } = await supabase
      .from('work_diary_comments')
      .select('*')
      .eq('work_diary_id', rdoId)
      .order('created_at', { ascending: false });

    const { data: photos, count: photosCount } = await supabase
      .from('work_diary_photos')
      .select('*', { count: 'exact' })
      .eq('work_diary_id', rdoId)
      .order('created_at', { ascending: false });

    return {
      work_diary: workDiary,
      work: work || {},
      labor: labor || [],
      activities: activities || [],
      occurrences: occurrences || [],
      comments: comments || [],
      photos: photos || [],
      photosCount: photosCount || 0
    };
  } catch (error) {
    console.error('Erro ao buscar dados do RDO:', error);
    return null;
  }
}

export async function generateRDOPDF(rdoId: string): Promise<void> {
  const data = await fetchRDOData(rdoId);
  if (!data) {
    alert('Erro ao buscar dados do RDO');
    return;
  }

  const { work_diary, work, labor, activities, occurrences, comments, photos, photosCount } = data;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 10;

  // Cabeçalho com fundo colorido
  doc.setFillColor(26, 115, 232); // Azul profissional
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Título em branco
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`RDO - ${work.name || 'Obra'}`, pageWidth / 2, 15, { align: 'center' });

  // Subtítulo
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Diário de Obra #${work_diary.report_number}`, pageWidth / 2, 22, { align: 'center' });

  // Badge de status
  const statusColor = getStatusColor(work_diary.status);
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - 50, 12, 35, 10, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(getStatusLabel(work_diary.status), pageWidth - 32.5, 18.5, { align: 'center' });

  doc.setTextColor(0, 0, 0);

  y = 45;

  // Card de informações principais
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3);

  // Grid 2 colunas
  const colWidth = (pageWidth - 2 * margin - 4) / 2;
  let gridY = y + 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Data:', margin + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(new Date(work_diary.report_date).toLocaleDateString('pt-BR'), margin + 20, gridY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Dia:', margin + colWidth + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(work_diary.day_of_week || '-', margin + colWidth + 18, gridY);

  gridY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Contrato:', margin + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(work_diary.contract_number || '-', margin + 25, gridY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Responsável:', margin + colWidth + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(work_diary.responsible || '-', margin + colWidth + 32, gridY, { maxWidth: colWidth - 36 });

  gridY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Local:', margin + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const address = work.work_address || '-';
  doc.text(address, margin + 20, gridY, { maxWidth: colWidth - 24 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Prazo:', margin + colWidth + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${work_diary.contracted_days || '-'} dias`, margin + colWidth + 22, gridY);

  gridY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('Decorrido:', margin + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${work_diary.elapsed_days || 0} dias`, margin + 28, gridY);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('A vencer:', margin + colWidth + 4, gridY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${work_diary.remaining_days || 0} dias`, margin + colWidth + 26, gridY);

  y += 60;

  // Seção de Clima
  doc.setFillColor(66, 133, 244);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDICOES CLIMATICAS', margin + 4, y + 5.5);

  y += 10;
  doc.setTextColor(0, 0, 0);

  // Card clima
  doc.setFillColor(252, 252, 253);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2);

  const climaColWidth = (pageWidth - 2 * margin) / 2;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 70, 70);
  doc.text('Manhã:', margin + 4, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${getWeatherLabel(work_diary.morning_weather)} - ${getConditionLabel(work_diary.morning_condition)}`, margin + 22, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(70, 70, 70);
  doc.text('Tarde:', margin + 4, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${getWeatherLabel(work_diary.afternoon_weather)} - ${getConditionLabel(work_diary.afternoon_condition)}`, margin + 22, y + 14);

  y += 25;

  if (labor.length > 0) {
    // Cabeçalho Mão de Obra
    doc.setFillColor(52, 168, 83);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`MAO DE OBRA (${labor.length})`, margin + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);

    y += 10;

    // Card mão de obra
    doc.setFillColor(248, 252, 248);
    const laborHeight = Math.max(20, labor.length * 8 + 8);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, laborHeight, 2, 2, 'F');
    doc.setDrawColor(200, 230, 201);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, laborHeight, 2, 2);

    let laborY = y + 6;
    labor.forEach((l) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('•', margin + 4, laborY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(l.name, margin + 8, laborY);

      doc.setFillColor(52, 168, 83);
      doc.roundedRect(pageWidth - margin - 20, laborY - 3, 15, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(String(l.quantity), pageWidth - margin - 12.5, laborY + 1, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      laborY += 8;
    });

    y += laborHeight + 5;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  if (activities.length > 0) {
    // Cabeçalho Atividades
    doc.setFillColor(251, 140, 0);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ATIVIDADES (${activities.length})`, margin + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);

    y += 10;

    activities.forEach((activity) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      // Card atividade
      doc.setFillColor(255, 248, 240);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, 'F');
      doc.setDrawColor(255, 224, 178);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(activity.description || '-', margin + 4, y + 7, { maxWidth: pageWidth - 2 * margin - 35 });

      // Badge status
      doc.setFillColor(251, 140, 0);
      doc.roundedRect(pageWidth - margin - 26, y + 3, 22, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Pendente', pageWidth - margin - 15, y + 7, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      y += 14;
    });

    y += 5;
  }

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  if (occurrences.length > 0) {
    // Cabeçalho Ocorrências
    doc.setFillColor(234, 67, 53);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`OCORRENCIAS (${occurrences.length})`, margin + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);

    y += 10;

    occurrences.forEach((occurrence) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      // Card ocorrência
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2, 'F');
      doc.setDrawColor(252, 165, 165);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 12, 2, 2);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('•', margin + 4, y + 7);
      doc.text(occurrence.description || '-', margin + 8, y + 7, { maxWidth: pageWidth - 2 * margin - 12 });

      y += 14;
    });

    y += 5;
  }

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  if (comments.length > 0) {
    // Cabeçalho Comentários
    doc.setFillColor(156, 39, 176);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`COMENTARIOS (${comments.length})`, margin + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);

    y += 10;

    comments.forEach((comment) => {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }

      // Card comentário
      doc.setFillColor(250, 245, 255);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, 'F');
      doc.setDrawColor(225, 190, 231);
      doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 100, 100);
      doc.text(new Date(comment.created_at).toLocaleString('pt-BR'), margin + 4, y + 5);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(comment.comment || '-', margin + 4, y + 11, { maxWidth: pageWidth - 2 * margin - 8 });

      y += 20;
    });

    y += 5;
  }

  if (photosCount > 0 && photos.length > 0) {
    if (y > 255) {
      doc.addPage();
      y = 20;
    }
    // Cabeçalho Fotos
    doc.setFillColor(0, 172, 193);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 8, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`FOTOS (${photosCount})`, margin + 4, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 12;

    const imgWidth = (pageWidth - 2 * margin - 10) / 2;
    const imgHeight = imgWidth * 0.75;
    let colIndex = 0;

    for (const photo of photos) {
      try {
        const imageData = await loadImageAsBase64(photo.file_path);
        if (imageData) {
          const xPos = margin + (colIndex % 2) * (imgWidth + 5);

          if (y + imgHeight + 20 > pageHeight - 20) {
            doc.addPage();
            y = 20;
            colIndex = 0;
          }

          doc.addImage(imageData, 'JPEG', xPos, y, imgWidth, imgHeight);

          if (photo.description) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(photo.description, xPos, y + imgHeight + 3, { maxWidth: imgWidth });
          }

          colIndex++;

          if (colIndex % 2 === 0) {
            y += imgHeight + 8;
          }
        }
      } catch (error) {
        console.error('Erro ao adicionar foto ao PDF:', error);
      }
    }

    if (colIndex % 2 !== 0) {
      y += imgHeight + 8;
    }
    y += 5;
  }

  // Rodapé com informações
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(`Criado por: ${work_diary.responsible || 'N/A'}`, margin, y);
  doc.text(new Date(work_diary.created_at).toLocaleString('pt-BR'), pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.text(`Última modificação: ${work_diary.responsible || 'N/A'}`, margin, y);
  doc.text(new Date(work_diary.updated_at).toLocaleString('pt-BR'), pageWidth - margin, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  const fileName = `RDO_${work_diary.report_number}_${work.name || 'Obra'}_${new Date(work_diary.report_date).toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}

export async function generateBatchRDOPDF(rdoIds: string[]): Promise<void> {
  if (rdoIds.length === 0) {
    alert('Nenhum RDO selecionado');
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  for (let i = 0; i < rdoIds.length; i++) {
    const data = await fetchRDOData(rdoIds[i]);
    if (!data) continue;

    if (i > 0) {
      doc.addPage();
    }

    const { work_diary, work, labor, activities, occurrences, comments, photosCount } = data;
    let y = 10;

    // Cabeçalho com fundo colorido
    doc.setFillColor(26, 115, 232);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Título em branco
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`RDO - ${work.name || 'Obra'}`, pageWidth / 2, 15, { align: 'center' });

    // Subtítulo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Relatório Diário de Obra #${work_diary.report_number}`, pageWidth / 2, 22, { align: 'center' });

    // Badge de status
    const statusColor = getStatusColor(work_diary.status);
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageWidth - 50, 12, 35, 10, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(getStatusLabel(work_diary.status), pageWidth - 32.5, 18.5, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    y = 45;

    // Card de informações principais
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 50, 3, 3);

    // Grid 2 colunas
    const colWidth = (pageWidth - 2 * margin - 4) / 2;
    let gridY = y + 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Data:', margin + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(new Date(work_diary.report_date).toLocaleDateString('pt-BR'), margin + 20, gridY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Dia:', margin + colWidth + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(work_diary.day_of_week || '-', margin + colWidth + 18, gridY);

    gridY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Contrato:', margin + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(work_diary.contract_number || '-', margin + 25, gridY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Responsável:', margin + colWidth + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(work_diary.responsible || '-', margin + colWidth + 32, gridY, { maxWidth: colWidth - 36 });

    gridY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Local:', margin + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const batchAddress = work.work_address || '-';
    doc.text(batchAddress, margin + 20, gridY, { maxWidth: colWidth - 24 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Prazo:', margin + colWidth + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${work_diary.contracted_days || '-'} dias`, margin + colWidth + 22, gridY);

    gridY += 10;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('Decorrido:', margin + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${work_diary.elapsed_days || 0} dias`, margin + 28, gridY);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text('A vencer:', margin + colWidth + 4, gridY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${work_diary.remaining_days || 0} dias`, margin + colWidth + 26, gridY);

    y += 60;

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, (pageWidth - 2 * margin) / 3, 8, 'F');
    doc.rect(margin + (pageWidth - 2 * margin) / 3, y, (pageWidth - 2 * margin) / 3, 8, 'F');
    doc.rect(margin + 2 * (pageWidth - 2 * margin) / 3, y, (pageWidth - 2 * margin) / 3, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Condição climática', margin + 2, y + 5.5);
    doc.text('Tempo', margin + (pageWidth - 2 * margin) / 3 + 2, y + 5.5);
    doc.text('Condição', margin + 2 * (pageWidth - 2 * margin) / 3 + 2, y + 5.5);

    y += 8;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, y, (pageWidth - 2 * margin) / 3, 8);
    doc.rect(margin + (pageWidth - 2 * margin) / 3, y, (pageWidth - 2 * margin) / 3, 8);
    doc.rect(margin + 2 * (pageWidth - 2 * margin) / 3, y, (pageWidth - 2 * margin) / 3, 8);
    doc.setFont('helvetica', 'normal');
    doc.text('Manhã', margin + 2, y + 5.5);
    doc.text(getWeatherLabel(work_diary.morning_weather), margin + (pageWidth - 2 * margin) / 3 + 2, y + 5.5);
    doc.text(getConditionLabel(work_diary.morning_condition), margin + 2 * (pageWidth - 2 * margin) / 3 + 2, y + 5.5);

    y += 8;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, (pageWidth - 2 * margin) / 3, 8, 'F');
    doc.rect(margin + (pageWidth - 2 * margin) / 3, y, (pageWidth - 2 * margin) / 3, 8, 'F');
    doc.rect(margin + 2 * (pageWidth - 2 * margin) / 3, y, (pageWidth - 2 * margin) / 3, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.text('Tarde', margin + 2, y + 5.5);
    doc.text(getWeatherLabel(work_diary.afternoon_weather), margin + (pageWidth - 2 * margin) / 3 + 2, y + 5.5);
    doc.text(getConditionLabel(work_diary.afternoon_condition), margin + 2 * (pageWidth - 2 * margin) / 3 + 2, y + 5.5);

    y += 15;

    if (labor.length > 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`Mão de obra (${labor.length})`, margin + 2, y + 5.5);

      y += 8;
      const colWidth = (pageWidth - 2 * margin - 60) / labor.length;
      labor.forEach((l) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin + idx * colWidth, y, colWidth, 8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(l.name, margin + idx * colWidth + 2, y + 5.5, { maxWidth: colWidth - 4 });
      });

      y += 8;
      labor.forEach((l) => {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin + idx * colWidth, y, colWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(String(l.quantity), margin + idx * colWidth + colWidth / 2, y + 5.5, { align: 'center' });
      });

      y += 8;
      doc.setFillColor(255, 255, 255);
      doc.rect(margin + labor.length * colWidth, y - 16, 60, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Mão de Obra Direta', margin + labor.length * colWidth + 30, y - 8, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`(${labor.length})`, margin + labor.length * colWidth + 30, y - 2, { align: 'center' });

      y += 7;
    }

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    if (activities.length > 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Atividades (${activities.length})`, margin + 2, y + 5.5);

      y += 8;
      activities.forEach((activity) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, pageWidth - 2 * margin - 30, 8);
        doc.rect(margin + pageWidth - 2 * margin - 30, y, 30, 8);
        doc.setFont('helvetica', 'normal');
        doc.text(activity.description || '-', margin + 2, y + 5.5, { maxWidth: pageWidth - 2 * margin - 35 });
        doc.text('Pendente', margin + pageWidth - 2 * margin - 28, y + 5.5);
        y += 8;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 7;
    }

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    if (occurrences.length > 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`Ocorrências (${occurrences.length})`, margin + 2, y + 5.5);

      y += 8;
      occurrences.forEach((occurrence) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, pageWidth - 2 * margin, 8);
        doc.setFont('helvetica', 'normal');
        doc.text(occurrence.description || '-', margin + 2, y + 5.5, { maxWidth: pageWidth - 2 * margin - 4 });
        y += 8;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      y += 7;
    }

    if (y > 230) {
      doc.addPage();
      y = 20;
    }

    if (comments.length > 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`Comentários (${comments.length})`, margin + 2, y + 5.5);

      y += 8;
      comments.forEach((comment) => {
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, pageWidth - 2 * margin, 15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Usuário', margin + 2, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(comment.created_at).toLocaleString('pt-BR'), margin + 2, y + 8);
        doc.setFontSize(9);
        doc.text(comment.comment || '-', margin + 2, y + 12, { maxWidth: pageWidth - 2 * margin - 4 });
        y += 15;

        if (y > 265) {
          doc.addPage();
          y = 20;
        }
      });

      y += 7;
    }

    if (photosCount > 0) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text(`Fotos (${photosCount})`, margin + 2, y + 5.5);
      y += 15;
    }

    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Criado por: ${work_diary.responsible || 'N/A'} (${new Date(work_diary.created_at).toLocaleString('pt-BR')})`, margin, y);
    y += 5;
    doc.text(`Última modificação: ${work_diary.responsible || 'N/A'} (${new Date(work_diary.updated_at).toLocaleString('pt-BR')})`, margin, y);
  }

  const fileName = `RDOs_Lote_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}
