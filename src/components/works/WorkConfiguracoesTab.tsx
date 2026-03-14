import { arcoColors } from '../../styles/colors';
import { Work, Frequency, TrackingType, TaxAdminType } from '../../types/work';

interface WorkConfiguracoesTabProps {
  work: Partial<Work>;
  onChange: (updates: Partial<Work>) => void;
  onNavigateHome?: () => void;
}

export default function WorkConfiguracoesTab({ work, onChange}: WorkConfiguracoesTabProps) {
  const weekDays = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sab.'];

  const toggleWorkDay = (day: string) => {
    const currentDays = work.work_days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    onChange({ work_days: newDays });
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de faturamento
        </label>
        <input
          type="text"
          value={work.billing_type || ''}
          onChange={(e) => onChange({ billing_type: e.target.value })}
          placeholder="Ex: Taxa de Administração"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Faturamento
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="billing_frequency"
              value="semanal"
              checked={work.billing_frequency === 'semanal'}
              onChange={(e) => onChange({ billing_frequency: e.target.value as Frequency })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Semanal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="billing_frequency"
              value="quinzenal"
              checked={work.billing_frequency === 'quinzenal'}
              onChange={(e) => onChange({ billing_frequency: e.target.value as Frequency })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Quinzenal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="billing_frequency"
              value="mensal"
              checked={work.billing_frequency === 'mensal'}
              onChange={(e) => onChange({ billing_frequency: e.target.value as Frequency })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Mensal</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de documento
        </label>
        <input
          type="text"
          value={work.document_type || ''}
          onChange={(e) => onChange({ document_type: e.target.value })}
          placeholder="Ex: Reembolso"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Planejamento
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="planning_frequency"
              value="semanal"
              checked={work.planning_frequency === 'semanal'}
              onChange={(e) => onChange({ planning_frequency: e.target.value as Frequency })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Semanal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="planning_frequency"
              value="quinzenal"
              checked={work.planning_frequency === 'quinzenal'}
              onChange={(e) => onChange({ planning_frequency: e.target.value as Frequency })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Quinzenal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="planning_frequency"
              value="mensal"
              checked={work.planning_frequency === 'mensal'}
              onChange={(e) => onChange({ planning_frequency: e.target.value as Frequency })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Mensal</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Acompanhamento
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking_type"
              value="custo"
              checked={work.tracking_type === 'custo'}
              onChange={(e) => onChange({ tracking_type: e.target.value as TrackingType })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Pelo custo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking_type"
              value="valor_vendas"
              checked={work.tracking_type === 'valor_vendas'}
              onChange={(e) => onChange({ tracking_type: e.target.value as TrackingType })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Pelo valor de vendas+taxas</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking_type"
              value="ambos"
              checked={work.tracking_type === 'ambos'}
              onChange={(e) => onChange({ tracking_type: e.target.value as TrackingType })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Ambos</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dias expediente
        </label>
        <div className="flex gap-2">
          {weekDays.map((day, index) => {
            const isSelected = (work.work_days || []).includes(day);
            return (
              <button
                key={index}
                onClick={() => toggleWorkDay(day)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isSelected
                    ? 'text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={isSelected ? { backgroundColor: arcoColors.primary.blue } : {}}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Controle de estoque
        </label>
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            Seu plano não possui esta funcionalidade
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Acesso pelo cliente
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="client_access"
              value="true"
              checked={work.client_access === true}
              onChange={() => onChange({ client_access: true })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Sim</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="client_access"
              value="false"
              checked={work.client_access === false}
              onChange={() => onChange({ client_access: false })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Não</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Taxa de administração
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tax_admin_type"
              value="tipo_custo"
              checked={work.tax_admin_type === 'tipo_custo'}
              onChange={(e) => onChange({ tax_admin_type: e.target.value as TaxAdminType })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Por tipo de custo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tax_admin_type"
              value="fase_obra"
              checked={work.tax_admin_type === 'fase_obra'}
              onChange={(e) => onChange({ tax_admin_type: e.target.value as TaxAdminType })}
              className="w-4 h-4"
              style={{ accentColor: arcoColors.primary.blue }}
            />
            <span className="text-sm text-gray-700">Por fase da obra</span>
          </label>
        </div>
      </div>
    </div>
  );
}
