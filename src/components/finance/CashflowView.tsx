import { BarChart3 } from 'lucide-react';
import { arcoColors } from '../../styles/colors';

interface Props {
  workId: string;
}

export default function CashflowView({ workId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: arcoColors.primary.blue }}>
          Fluxo de Caixa
        </h2>
      </div>

      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="font-medium mb-2">Projeções e Análise de Fluxo de Caixa</p>
        <p className="text-sm">Visualização Diária, Semanal e Mensal</p>
        <p className="text-sm mt-4 text-blue-600">Em desenvolvimento...</p>
      </div>
    </div>
  );
}
