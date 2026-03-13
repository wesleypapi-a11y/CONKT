import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

export function CompanyCashflow() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h2>
        <p className="text-gray-600 mt-1">Controle financeiro interno da empresa</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="bg-blue-100 rounded-full p-6">
            <TrendingUp className="w-16 h-16 text-blue-600" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h3>
            <p className="text-gray-600 max-w-md">
              Esta funcionalidade está em desenvolvimento e estará disponível em breve.
            </p>
          </div>

          <div className="bg-blue-100 rounded-lg p-4 flex items-start gap-3 max-w-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm text-blue-800 font-medium">Em breve você poderá:</p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Visualizar entradas e saídas da empresa</li>
                <li>Projetar fluxo de caixa futuro</li>
                <li>Acompanhar saldo disponível</li>
                <li>Gerar relatórios financeiros</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
