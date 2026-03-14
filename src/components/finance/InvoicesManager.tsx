import { Receipt } from 'lucide-react';
import { arcoColors } from '../../styles/colors';

interface Props {
  workId: string;
}

export default function InvoicesManager({ workId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: arcoColors.primary.blue }}>
          Notas Fiscais
        </h2>
      </div>

      <div className="text-center py-12 text-gray-500">
        <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="font-medium mb-2">Gestão de Notas Fiscais</p>
        <p className="text-sm">Controle de NFe de Entrada e Saída</p>
        <p className="text-sm mt-4 text-blue-600">Em desenvolvimento...</p>
      </div>
    </div>
  );
}
