import { useState } from 'react';
import { Calendar, TrendingUp, Activity } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { Schedule, ScheduleTask, ScheduleHoliday } from '../../types/schedule';
import { parseDate } from '../../utils/scheduleCalculations';

interface ScheduleSimulationProps {
  schedule: Schedule;
  tasks: ScheduleTask[];
  holidays: ScheduleHoliday[];
}

export default function ScheduleSimulation({ schedule, tasks_holidays }: ScheduleSimulationProps) {
  const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simulationResult, setSimulationResult] = useState<{
    totalTasks: number;
    completedTasks: number;
    totalDuration: number;
    completedDuration: number;
    progressPercentage: number;
  } | null>(null);

  const runSimulation = () => {
    if (!referenceDate) {
      alert('Informe uma data de referência');
      return;
    }

    const refDate = parseDate(referenceDate);
    if (!refDate) return;

    const nonMacroTasks = tasks.filter(t => !t.is_macro);

    if (nonMacroTasks.length === 0) {
      alert('Não há tarefas para simular');
      return;
    }

    let completedTasks = 0;
    let completedDuration = 0;
    const totalDuration = nonMacroTasks.reduce((sum, t) => sum + t.duration, 0);

    nonMacroTasks.forEach(task => {
      const taskEndDate = parseDate(task.end_date);

      if (taskEndDate && taskEndDate <= refDate) {
        completedTasks++;
        completedDuration += task.duration;
      }
    });

    const progressPercentage = totalDuration > 0
      ? Math.round((completedDuration / totalDuration) * 100)
      : 0;

    setSimulationResult({
      totalTasks: nonMacroTasks.length,
      completedTasks,
      totalDuration,
      completedDuration,
      progressPercentage
    });
  };

  const calculateCurrentProgress = () => {
    const nonMacroTasks = tasks.filter(t => !t.is_macro);

    if (nonMacroTasks.length === 0) return 0;

    const totalDuration = nonMacroTasks.reduce((sum, t) => sum + t.duration, 0);

    if (totalDuration === 0) return 0;

    const weightedProgress = nonMacroTasks.reduce(
      (sum, t) => sum + (t.progress * t.duration),
      0
    );

    return Math.round((weightedProgress / totalDuration) / 100 * 100);
  };

  const currentProgress = calculateCurrentProgress();

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progresso Atual</h3>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progresso Real</span>
              <span className="text-sm font-bold text-gray-900">{currentProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all"
                style={{
                  width: `${currentProgress}%`,
                  backgroundColor: arcoColors.primary.blue
                }}
              />
            </div>
          </div>
          <Activity className="w-8 h-8 text-gray-400" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-gray-600">Total de Tarefas</p>
            <p className="text-xl font-bold text-gray-900">
              {tasks.filter(t => !t.is_macro).length}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-gray-600">Duração Total</p>
            <p className="text-xl font-bold text-gray-900">
              {tasks.filter(t => !t.is_macro).reduce((sum, t) => sum + t.duration, 0)} dias
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Simular Avanço do Projeto</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data de Referência
            </label>
            <div className="flex gap-3">
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              />
              <button
                onClick={runSimulation}
                className="px-6 py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#10B981', color: '#000000' }}
              >
                Simular
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Informe uma data para simular qual seria o progresso esperado do projeto
            </p>
          </div>

          {simulationResult && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <TrendingUp className="w-12 h-12 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Progresso Esperado em {new Date(referenceDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {simulationResult.progressPercentage}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Tarefas Concluídas</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {simulationResult.completedTasks} / {simulationResult.totalTasks}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Duração Concluída</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {simulationResult.completedDuration} / {simulationResult.totalDuration} dias
                  </p>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">Como funciona a simulação:</p>
                    <p>
                      A simulação considera como 100% concluídas todas as tarefas cuja data final planejada
                      seja anterior ou igual à data de referência informada. O progresso é calculado com base
                      na duração ponderada das tarefas.
                    </p>
                  </div>
                </div>
              </div>

              {currentProgress !== simulationResult.progressPercentage && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm font-medium text-gray-700 mb-2">Comparação</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Progresso Real</p>
                      <p className="text-lg font-bold text-gray-900">{currentProgress}%</p>
                    </div>
                    <div className="text-2xl text-gray-400">→</div>
                    <div>
                      <p className="text-xs text-gray-500">Progresso Esperado</p>
                      <p className="text-lg font-bold text-blue-600">{simulationResult.progressPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Diferença</p>
                      <p className={`text-lg font-bold ${
                        currentProgress >= simulationResult.progressPercentage
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {currentProgress >= simulationResult.progressPercentage ? '+' : ''}
                        {currentProgress - simulationResult.progressPercentage}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
