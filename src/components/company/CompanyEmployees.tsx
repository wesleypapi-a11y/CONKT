import React from 'react';
import { Users, AlertCircle } from 'lucide-react';

export function CompanyEmployees() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Colaboradores</h2>
        <p className="text-gray-600 mt-1">Cadastro e gestão dos colaboradores da empresa</p>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="bg-green-100 rounded-full p-6">
            <Users className="w-16 h-16 text-green-600" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-gray-800">Colaboradores</h3>
            <p className="text-gray-600 max-w-md">
              Esta funcionalidade está em desenvolvimento e estará disponível em breve.
            </p>
          </div>

          <div className="bg-green-100 rounded-lg p-4 flex items-start gap-3 max-w-lg">
            <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm text-green-800 font-medium">Em breve você poderá:</p>
              <ul className="text-sm text-green-700 mt-2 space-y-1 list-disc list-inside">
                <li>Cadastrar colaboradores da empresa</li>
                <li>Gerenciar dados pessoais e profissionais</li>
                <li>Controlar documentação e contratos</li>
                <li>Acompanhar histórico e férias</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
