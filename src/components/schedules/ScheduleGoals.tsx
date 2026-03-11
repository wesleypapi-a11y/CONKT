import { useMemo, useState, useEffect } from 'react';
import { Calendar, Activity } from 'lucide-react';
import { Schedule, ScheduleTask, ScheduleHoliday } from '../../types/schedule';
import { calculateDuration } from '../../utils/scheduleCalculations';

interface ScheduleGoalsProps {
  schedule: Schedule;
  tasks: ScheduleTask[];
  holidays: ScheduleHoliday[];
}

interface MonthlyGoal {
  month: number;
  monthName: string;
  year: number;
  plannedProgress: number;
  actualProgress: number;
  cumulativePlanned: number;
  cumulativeActual: number;
}

export default function ScheduleGoals({ schedule, tasks, holidays }: ScheduleGoalsProps) {
  const [simulationDate, setSimulationDate] = useState<string>('');
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);

  useEffect(() => {
    setSimulatedProgress(null);
    setSimulationDate('');
  }, []);

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  };

  const monthlyGoals = useMemo(() => {
    const nonMacroTasks = tasks.filter(t => !t.is_macro);
    if (nonMacroTasks.length === 0) return [];

    let earliestDate: Date | null = null;
    let latestDate: Date | null = null;

    nonMacroTasks.forEach(task => {
      const startDate = parseDate(task.start_date);
      const endDate = parseDate(task.end_date);

      if (startDate && (!earliestDate || startDate < earliestDate)) {
        earliestDate = startDate;
      }
      if (endDate && (!latestDate || endDate > latestDate)) {
        latestDate = endDate;
      }
    });

    if (!earliestDate || !latestDate) return [];

    const monthsList: MonthlyGoal[] = [];
    const currentDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    const endMonth = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);

    const totalDuration = nonMacroTasks.reduce((sum, t) => sum + t.duration, 0);
    if (totalDuration === 0) return [];

    let cumulativePlanned = 0;
    let cumulativeActual = 0;

    while (currentDate <= endMonth) {
      const monthStart = new Date(currentDate);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      let monthPlannedDuration = 0;
      let monthActualProgress = 0;

      nonMacroTasks.forEach(task => {
        const taskStart = parseDate(task.start_date);
        const taskEnd = parseDate(task.end_date);

        if (!taskStart || !taskEnd) return;

        if (taskEnd < monthStart || taskStart > monthEnd) {
          return;
        }

        const taskDuration = task.duration;
        const overlapStart = taskStart < monthStart ? monthStart : taskStart;
        const overlapEnd = taskEnd > monthEnd ? monthEnd : taskEnd;

        const overlapDuration = calculateDuration(
          overlapStart,
          overlapEnd,
          schedule.consider_weekends,
          holidays.map(h => h.holiday_date)
        );

        const percentInMonth = taskDuration > 0 ? overlapDuration / taskDuration : 0;

        monthPlannedDuration += taskDuration * percentInMonth;

        monthActualProgress += task.progress * taskDuration * percentInMonth / 100;
      });

      const monthPlannedPercent = totalDuration > 0 ? (monthPlannedDuration / totalDuration) * 100 : 0;
      const monthActualPercent = totalDuration > 0 ? (monthActualProgress / totalDuration) * 100 : 0;

      cumulativePlanned += monthPlannedPercent;
      cumulativeActual += monthActualPercent;

      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];

      const finalCumulativePlanned = Math.round(cumulativePlanned * 100) / 100;
      const finalCumulativeActual = Math.round(cumulativeActual * 100) / 100;

      monthsList.push({
        month: currentDate.getMonth() + 1,
        monthName: monthNames[currentDate.getMonth()],
        year: currentDate.getFullYear(),
        plannedProgress: Math.round(monthPlannedPercent * 100) / 100,
        actualProgress: Math.round(monthActualPercent * 100) / 100,
        cumulativePlanned: finalCumulativePlanned >= 99.5 ? 100 : Math.min(100, finalCumulativePlanned),
        cumulativeActual: finalCumulativeActual >= 99.5 ? 100 : Math.min(100, finalCumulativeActual),
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return monthsList;
  }, [tasks, holidays, schedule.consider_weekends]);

  if (monthlyGoals.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium">Nenhuma meta disponível</p>
          <p className="text-sm mt-2">Adicione tarefas ao cronograma para visualizar as metas mensais</p>
        </div>
      </div>
    );
  }


  const totalExecutedSum = monthlyGoals.reduce((sum, g) => sum + g.actualProgress, 0);

  const simulateProgress = () => {
    if (!simulationDate) {
      alert('Por favor, selecione uma data de referência');
      return;
    }

    const refDate = parseDate(simulationDate);
    if (!refDate) {
      alert('Data inválida');
      return;
    }

    const nonMacroTasks = tasks.filter(t => !t.is_macro);
    if (nonMacroTasks.length === 0) {
      setSimulatedProgress(0);
      return;
    }

    let completedDuration = 0;
    const totalDuration = nonMacroTasks.reduce((sum, t) => sum + t.duration, 0);

    nonMacroTasks.forEach(task => {
      const taskEndDate = parseDate(task.end_date);
      if (taskEndDate && taskEndDate <= refDate) {
        completedDuration += task.duration;
      }
    });

    const progressPercentage = totalDuration > 0 ? Math.round((completedDuration / totalDuration) * 10000) / 100 : 0;
    setSimulatedProgress(progressPercentage >= 99.5 ? 100 : progressPercentage);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Metas Mensais</h2>
            <p className="text-sm text-gray-600 mt-1">
              Acompanhamento da evolução planejada vs executada por mês
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-600" />
              <input
                type="date"
                value={simulationDate}
                onChange={(e) => setSimulationDate(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ color: '#000000' }}
              />
            </div>
            <button
              onClick={simulateProgress}
              disabled={!simulationDate}
              className="px-4 py-2 text-sm rounded-md font-medium hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#10B981', color: '#000000' }}
            >
              <Activity className="w-4 h-4" />
              Simular
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total de Meses</div>
            <div className="text-2xl font-bold text-gray-900">{monthlyGoals.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Progresso Simulado</div>
            <div className="text-2xl font-bold" style={{ color: simulatedProgress !== null ? '#10B981' : '#9ca3af' }}>
              {simulatedProgress !== null ? simulatedProgress.toFixed(2) : '0.00'}%
            </div>
            {simulatedProgress !== null && simulationDate && (
              <div className="text-xs text-gray-500 mt-1">
                até {new Date(simulationDate + 'T00:00:00').toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 mb-1">Total Executado (Soma dos Meses)</div>
            <div className="text-2xl font-bold text-green-600">
              {totalExecutedSum.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700" style={{ minWidth: '180px' }}>
                Período
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700" style={{ minWidth: '200px' }}>
                % Planejado do Mês
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700" style={{ minWidth: '200px' }}>
                % Executado do Mês
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700" style={{ minWidth: '150px' }}>
                Desvio do Mês
              </th>
            </tr>
          </thead>
          <tbody>
            {monthlyGoals.map((goal, index) => {
              const monthDeviation = goal.actualProgress - goal.plannedProgress;
              const deviationColor = monthDeviation >= 0 ? '#22c55e' : '#ef4444';
              const executedPercentage = goal.plannedProgress > 0
                ? Math.min(100, (goal.actualProgress / goal.plannedProgress) * 100)
                : 0;

              return (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">
                        Mês {index + 1}
                      </span>
                      <span className="text-sm text-gray-600">
                        {goal.monthName}/{goal.year}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {goal.plannedProgress.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {goal.actualProgress.toFixed(2)}%
                        </span>
                        <span className="text-xs text-gray-500">
                          ({executedPercentage.toFixed(0)}% do planejado)
                        </span>
                      </div>
                      <div className="w-full max-w-[250px] bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${executedPercentage}%`,
                            backgroundColor: executedPercentage >= 100 ? '#22c55e' : executedPercentage >= 75 ? '#facc15' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="text-lg font-bold"
                        style={{ color: deviationColor }}
                      >
                        {monthDeviation >= 0 ? '+' : ''}{monthDeviation.toFixed(2)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        {monthDeviation >= 0 ? 'Adiantado' : 'Atrasado'}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
