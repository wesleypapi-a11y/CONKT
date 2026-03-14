import { arcoColors } from '../../styles/colors';
import { WorkDiary, RDOStatus } from '../../types/workDiary';

interface RDOSignatureTabProps {
  rdo: Partial<WorkDiary>;
  onChange: (updates: Partial<WorkDiary>) => void;
}

export default function RDOSignatureTab({ rdo, onChange }: RDOSignatureTabProps) {
  const statusOptions: { value: RDOStatus; label: string; color: string }[] = [
    { value: 'preenchendo', label: 'Preenchendo', color: '#f59e0b' },
    { value: 'revisar', label: 'Revisar', color: '#3b82f6' },
    { value: 'aprovado', label: 'Aprovado', color: '#10b981' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Assinatura manual e Status
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assinatura manual
            </label>
            <input
              type="text"
              value={rdo.manual_signature || ''}
              onChange={(e) => onChange({ manual_signature: e.target.value })}
              placeholder="Nome completo para assinatura"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            />
            <p className="text-xs text-gray-500 mt-1">
              Digite o nome completo do responsável pela assinatura
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status do relatório <span className="text-red-500">*</span>
            </label>
            <select
              value={rdo.status || 'preenchendo'}
              onChange={(e) => onChange({ status: e.target.value as RDOStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{}}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {rdo.manual_signature && (
          <div className="mt-6 p-4 border-2 border-gray-300 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 uppercase">Assinatura</p>
            <div className="border-b-2 border-gray-400 pb-2">
              <p
                className="text-2xl text-center italic"
                style={{
                  fontFamily: 'cursive',
                  color: arcoColors.text.primary
                }}
              >
                {rdo.manual_signature}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: arcoColors.text.primary }}>
          Status do relatório
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusOptions.map((option) => (
            <div
              key={option.value}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                rdo.status === option.value
                  ? 'border-opacity-100 shadow-lg'
                  : 'border-opacity-30 hover:border-opacity-60'
              }`}
              style={{
                borderColor: option.color,
                backgroundColor: rdo.status === option.value ? `${option.color}15` : 'white'
              }}
              onClick={() => onChange({ status: option.value })}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: option.color }}
                >
                  {rdo.status === option.value && (
                    <svg
                      className="w-4 h-4 text-gray-900"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{option.label}</p>
                  <p className="text-xs text-gray-600">
                    {option.value === 'preenchendo' && 'Relatório em andamento'}
                    {option.value === 'revisar' && 'Aguardando revisão'}
                    {option.value === 'aprovado' && 'Relatório aprovado'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">Informações sobre o status</h4>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>
            <strong>Preenchendo:</strong> O relatório está sendo preenchido e ainda não está completo
          </li>
          <li>
            <strong>Revisar:</strong> O relatório está completo e aguardando revisão
          </li>
          <li>
            <strong>Aprovado:</strong> O relatório foi revisado e aprovado
          </li>
        </ul>
      </div>
    </div>
  );
}
