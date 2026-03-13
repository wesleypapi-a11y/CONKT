import { conktColors } from '../../styles/colors';
import { WorkDiary, WeatherType, WeatherCondition } from '../../types/workDiary';

interface RDOWeatherTabProps {
  rdo: Partial<WorkDiary>;
  onChange: (updates: Partial<WorkDiary>) => void;
}

export default function RDOWeatherTab({ rdo, onChange }: RDOWeatherTabProps) {
  const weatherOptions: { value: WeatherType; label: string }[] = [
    { value: 'claro', label: 'Claro' },
    { value: 'nublado', label: 'Nublado' },
    { value: 'chuvoso', label: 'Chuvoso' }
  ];

  const conditionOptions: { value: WeatherCondition; label: string }[] = [
    { value: 'praticavel', label: 'Praticável' },
    { value: 'impraticavel', label: 'Impraticável' }
  ];

  const periods = [
    { key: 'morning', label: 'Manhã' },
    { key: 'afternoon', label: 'Tarde' },
    { key: 'night', label: 'Noite' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text.primary }}>
          Condição climática
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Período
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Tempo
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Condição
                </th>
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.key} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-3 font-medium text-gray-700">
                    {period.label}
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <div className="flex gap-4">
                      {weatherOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`${period.key}_weather`}
                            value={option.value}
                            checked={rdo[`${period.key}_weather` as keyof WorkDiary] === option.value}
                            onChange={(e) => onChange({ [`${period.key}_weather`]: e.target.value as WeatherType })}
                            className="w-4 h-4"
                            style={{ accentColor: conktColors.primary.blue }}
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <div className="flex gap-4">
                      {conditionOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`${period.key}_condition`}
                            value={option.value}
                            checked={rdo[`${period.key}_condition` as keyof WorkDiary] === option.value}
                            onChange={(e) => onChange({ [`${period.key}_condition`]: e.target.value as WeatherCondition })}
                            className="w-4 h-4"
                            style={{ accentColor: conktColors.primary.blue }}
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Índice pluviométrico (mm)
          </label>
          <input
            type="text"
            value={rdo.rainfall_index || ''}
            onChange={(e) => onChange({ rainfall_index: e.target.value })}
            placeholder="Ex: 5.2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
            style={{}}
          />
          <p className="text-xs text-gray-500 mt-1">
            Informe o índice de chuva do dia em milímetros
          </p>
        </div>
      </div>
    </div>
  );
}
