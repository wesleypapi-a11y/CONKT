import { TrendingUp } from 'lucide-react';
import { conktColors } from '../../styles/colors';

interface Props {
  workId: string;
}

export default function FinancialMovementsManager({ workId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: conktColors.primary.blue }}>
          Movimentos Financeiros
        </h2>
      </div>

      <div className="text-center py-12 text-gray-500">
        <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="font-medium mb-2">Movimentos e Conciliação Bancária</p>
        <p className="text-sm">Entradas, Saídas e Transferências</p>
        <p className="text-sm mt-4 text-blue-600">Em desenvolvimento...</p>
      </div>
    </div>
  );
}
