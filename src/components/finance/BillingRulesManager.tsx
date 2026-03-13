import { DollarSign } from 'lucide-react';
import { conktColors } from '../../styles/colors';

interface Props {
  workId: string;
}

export default function BillingRulesManager({ workId }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: conktColors.primary.blue }}>
          Regras de Faturamento
        </h2>
      </div>

      <div className="text-center py-12 text-gray-500">
        <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="font-medium mb-2">Configuração de Faturamento Automático</p>
        <p className="text-sm">Taxa de Administração, Avanço Físico e Medições</p>
        <p className="text-sm mt-4 text-blue-600">Em desenvolvimento...</p>
      </div>
    </div>
  );
}
