import { useState } from 'react';
import { FileText } from 'lucide-react';
import { arcoColors } from '../../styles/colors';

interface Props {
  workId: string;
}

export default function FinancialDocumentsManager({ workId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: arcoColors.text.primary }}>
          Documentos Financeiros
        </h2>
      </div>

      <div className="text-center py-12" style={{ color: arcoColors.text.secondary }}>
        <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="font-medium mb-2">Gestão de Documentos Financeiros</p>
        <p className="text-sm">Provisões, Previsões, Adiantamentos, Recebimentos e Pagamentos</p>
        <p className="text-sm mt-4" style={{ color: arcoColors.primary.gold }}>Em desenvolvimento...</p>
      </div>
    </div>
  );
}
