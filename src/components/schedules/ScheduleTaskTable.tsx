import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Calendar as CalendarIcon, Check, Upload, Activity, CreditCard as Edit, GripVertical, X, ArrowLeft } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { Schedule, ScheduleTask, ScheduleHoliday } from '../../types/schedule';
import {
  parseDate,
  formatDate,
  calculateDuration,
  calculateEndDate,
  parsePredecessors,
  calculateDateFromPredecessor,
  detectCircularDependency,
  PredecessorRelation
} from '../../utils/scheduleCalculations';
import * as XLSX from 'xlsx';

interface ScheduleTaskTableProps {
  schedule: Schedule;
  tasks: ScheduleTask[];
  holidays: ScheduleHoliday[];
  onTasksChange: () => void;
  onBack?: () => void;
}

export default function ScheduleTaskTable({
  schedule,
  tasks,
  holidays,
  onTasksChange,
  onBack
}: ScheduleTaskTableProps) {
  const [editingTasks, setEditingTasks] = useState<Map<string, ScheduleTask>>(new Map());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [simulationProgress, setSimulationProgress] = useState<number | null>(null);
  const [considerWeekends, setConsiderWeekends] = useState(schedule.consider_weekends);
  const [draggedTask, setDraggedTask] = useState<ScheduleTask | null>(null);
  const [dragOverTask, setDragOverTask] = useState<ScheduleTask | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const holidaysInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    recalculateMacros();
    updateScheduleDates();
  }, [tasks]);

  const recalculateMacros = () => {
    const macros = tasks.filter(t => t.is_macro);
    const updatedTasks = new Map<string, ScheduleTask>();

    macros.forEach(macro => {
      const subtasks = tasks.filter(t => t.parent_id === macro.id);

      if (subtasks.length === 0) return;

      const dates = subtasks
        .map(t => ({ start: parseDate(t.start_date), end: parseDate(t.end_date) }))
        .filter(d => d.start && d.end);

      if (dates.length === 0) return;

      const minStart = dates.reduce((min, d) =>
        !min || (d.start && d.start < min) ? d.start : min, null as Date | null
      );
      const maxEnd = dates.reduce((max, d) =>
        !max || (d.end && d.end > max) ? d.end : max, null as Date | null
      );

      if (!minStart || !maxEnd) return;

      const duration = calculateDuration(
        minStart,
        maxEnd,
        schedule.consider_weekends,
        holidays
      );

      const totalSubtaskDuration = subtasks.reduce((sum, t) => sum + t.duration, 0);
      const weightedProgress = totalSubtaskDuration > 0
        ? subtasks.reduce((sum, t) => sum + (t.progress * t.duration), 0) / totalSubtaskDuration
        : 0;

      updatedTasks.set(macro.id, {
        ...macro,
        start_date: formatDate(minStart),
        end_date: formatDate(maxEnd),
        duration,
        progress: Math.round(weightedProgress)
      });
    });

    if (updatedTasks.size > 0) {
      saveMacroUpdates(Array.from(updatedTasks.values()));
    }
  };

  const saveMacroUpdates = async (macrosToUpdate: ScheduleTask[]) => {
    try {
      for (const macro of macrosToUpdate) {
        await supabase
          .from('schedule_tasks')
          .update({
            start_date: macro.start_date,
            end_date: macro.end_date,
            duration: macro.duration,
            progress: macro.progress,
            updated_at: new Date().toISOString()
          })
          .eq('id', macro.id);
      }
    } catch (error) {
      console.error('Error updating macros:', error);
    }
  };

  const updateScheduleDates = async () => {
    if (tasks.length === 0) return;

    const nonMacroTasks = tasks.filter(t => !t.is_macro && t.start_date && t.end_date);

    if (nonMacroTasks.length === 0) return;

    const dates = nonMacroTasks
      .map(t => ({ start: parseDate(t.start_date), end: parseDate(t.end_date) }))
      .filter(d => d.start && d.end);

    if (dates.length === 0) return;

    const minStart = dates.reduce((min, d) =>
      !min || (d.start && d.start < min) ? d.start : min, null as Date | null
    );
    const maxEnd = dates.reduce((max, d) =>
      !max || (d.end && d.end > max) ? d.end : max, null as Date | null
    );

    if (!minStart || !maxEnd) return;

    const formattedStartDate = formatDate(minStart);
    const formattedEndDate = formatDate(maxEnd);

    if (schedule.start_date === formattedStartDate && schedule.end_date === formattedEndDate) {
      return;
    }

    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          start_date: formattedStartDate,
          end_date: formattedEndDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', schedule.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating schedule dates:', error);
    }
  };

  const handleAddTask = async (isMacro: boolean = false, parentId: string | null = null) => {
    try {
      const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order_index), 0);

      // Se não é macro e não tem parent_id especificado, pega o último macro criado
      let finalParentId = parentId;
      if (!isMacro && !parentId) {
        const lastMacro = [...tasks]
          .filter(t => t.is_macro && !t.parent_id)
          .sort((a, b) => b.order_index - a.order_index)[0];

        if (lastMacro) {
          finalParentId = lastMacro.id;
        }
      }

      const newTask = {
        schedule_id: schedule.id,
        name: isMacro ? 'Nova Tarefa Macro' : 'Nova Tarefa',
        is_macro: isMacro,
        parent_id: finalParentId,
        duration: 0,
        start_date: null,
        end_date: null,
        predecessors: '',
        progress: 0,
        responsible: '',
        notes: '',
        order_index: maxOrder + 1
      };

      const { data, error } = await supabase
        .from('schedule_tasks')
        .insert(newTask)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const startDateObj = parseDate(data.start_date);
        if (startDateObj) {
          const endDateObj = calculateEndDate(
            startDateObj,
            data.duration,
            schedule.consider_weekends,
            holidays
          );

          await supabase
            .from('schedule_tasks')
            .update({ end_date: formatDate(endDateObj) })
            .eq('id', data.id);
        }
      }

      onTasksChange();
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Erro ao adicionar tarefa');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;

    try {
      const { error } = await supabase
        .from('schedule_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      onTasksChange();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Erro ao excluir tarefa');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Deseja realmente apagar TODAS as tarefas deste cronograma? Esta ação não pode ser desfeita!')) return;

    setImporting(true);
    try {
      const { error } = await supabase
        .from('schedule_tasks')
        .delete()
        .eq('schedule_id', schedule.id);

      if (error) throw error;

      alert('Todas as tarefas foram excluídas com sucesso!');
      onTasksChange();
    } catch (error) {
      console.error('Error clearing tasks:', error);
      alert('Erro ao limpar tarefas');
    } finally {
      setImporting(false);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        alert('Planilha vazia ou formato inválido');
        return;
      }

      console.log('Primeira linha do Excel:', jsonData[0]);
      console.log('Colunas disponíveis:', Object.keys(jsonData[0] as any));

      const getColumnValue = (row: any, ...possibleNames: string[]) => {
        const keys = Object.keys(row);
        for (const name of possibleNames) {
          const exactMatch = keys.find(k => k === name);
          if (exactMatch && row[exactMatch]) return row[exactMatch];

          const lowerMatch = keys.find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
          if (lowerMatch && row[lowerMatch]) return row[lowerMatch];

          const partialMatch = keys.find(k => k.toLowerCase().includes(name.toLowerCase()));
          if (partialMatch && row[partialMatch]) return row[partialMatch];
        }
        return null;
      };

      const maxOrder = tasks.reduce((max, t) => Math.max(max, t.order_index), 0);
      let importedCount = 0;
      let lastMacroId: string | null = null;

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];

        const taskName = getColumnValue(row, 'Nome', 'Tarefa', 'Atividade', 'Descrição', 'Descricao', 'Task', 'Name');
        if (!taskName) {
          console.log(`Linha ${i + 1}: Nome não encontrado`, row);
          continue;
        }

        const macroValue = getColumnValue(row, 'Macro', 'É Macro', 'E Macro', 'Tipo');
        const isMacro = macroValue === 'Sim' || macroValue === 'sim' || macroValue === 'S' || macroValue === 's' || macroValue === true || macroValue === 'TRUE';

        const durationValue = getColumnValue(row, 'Duração', 'Duracao', 'Dias', 'Duration', 'Prazo');
        const duration = Number(durationValue) || 1;

        const startDateStr = getColumnValue(row, 'Data Inicial', 'Início', 'Inicio', 'Data Inicio', 'Start Date', 'Data de Inicio');

        const progressValue = getColumnValue(row, '% Concluída', '% Concluida', 'Progresso', 'Progress', '%', 'Percentual');
        const progress = Number(progressValue) || 0;

        const responsible = getColumnValue(row, 'Responsável', 'Responsavel', 'Responsible', 'Resp') || '';
        const predecessors = getColumnValue(row, 'Predecessoras', 'Predecessores', 'Depende de', 'Dependencies') || '';
        const notes = getColumnValue(row, 'Observações', 'Observacoes', 'Notas', 'Notes', 'Comentários', 'Comentarios', 'Obs') || '';

        let startDate = schedule.start_date || formatDate(new Date());
        if (startDateStr) {
          const parsedDate = parseExcelDate(startDateStr);
          if (parsedDate) {
            startDate = formatDate(parsedDate);
          }
        }

        const startDateObj = parseDate(startDate);
        const endDateObj = startDateObj ? calculateEndDate(
          startDateObj,
          duration,
          schedule.consider_weekends,
          holidays
        ) : null;

        const newTask = {
          schedule_id: schedule.id,
          name: String(taskName),
          is_macro: isMacro,
          parent_id: isMacro ? null : lastMacroId,
          duration,
          start_date: startDate,
          end_date: endDateObj ? formatDate(endDateObj) : null,
          predecessors: String(predecessors || ''),
          progress: Math.min(100, Math.max(0, progress)),
          responsible: String(responsible || ''),
          notes: String(notes || ''),
          order_index: maxOrder + i + 1
        };

        console.log(`Importando tarefa ${i + 1}:`, newTask);

        const { data, error } = await supabase
          .from('schedule_tasks')
          .insert(newTask)
          .select()
          .single();

        if (error) throw error;

        if (isMacro && data) {
          lastMacroId = data.id;
        }

        importedCount++;
      }

      alert(`${importedCount} tarefas importadas com sucesso!`);
      onTasksChange();
    } catch (error) {
      console.error('Error importing Excel:', error);
      alert('Erro ao importar Excel. Verifique o formato do arquivo e o console para mais detalhes.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const parseExcelDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;

    if (typeof dateValue === 'number') {
      const date = XLSX.SSF.parse_date_code(dateValue);
      return new Date(date.y, date.m - 1, date.d);
    }

    if (typeof dateValue === 'string') {
      const formats = [
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
        /^(\d{4})-(\d{2})-(\d{2})$/,
        /^(\d{2})-(\d{2})-(\d{4})$/
      ];

      for (const format of formats) {
        const match = dateValue.match(format);
        if (match) {
          if (format === formats[1]) {
            return new Date(`${match[1]}-${match[2]}-${match[3]}`);
          } else if (format === formats[0]) {
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
          } else {
            return new Date(`${match[3]}-${match[2]}-${match[1]}`);
          }
        }
      }

      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    return null;
  };

  const handleImportHolidays = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;

      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];

        const dateValue = row['Data'] || row['data'] || row['DATE'] || row['Date'];
        const description = row['Descrição'] || row['Descricao'] || row['descrição'] || row['descricao'] || row['Description'] || row['DESCRIPTION'] || row['Nome'] || row['nome'];

        if (!dateValue) {
          console.log(`Linha ${i + 1}: Data não encontrada`, row);
          continue;
        }

        const holidayDate = parseExcelDate(dateValue);
        if (!holidayDate) {
          console.log(`Linha ${i + 1}: Data inválida`, dateValue);
          continue;
        }

        const newHoliday = {
          schedule_id: schedule.id,
          holiday_date: formatDate(holidayDate),
          name: String(description || 'Feriado')
        };

        const { error } = await supabase
          .from('schedule_holidays')
          .insert(newHoliday);

        if (error) {
          console.error(`Erro ao inserir feriado linha ${i + 1}:`, error);
          continue;
        }

        importedCount++;
      }

      alert(`${importedCount} feriados importados com sucesso!`);
      window.location.reload();
    } catch (error) {
      console.error('Error importing holidays:', error);
      alert('Erro ao importar feriados. Verifique o formato do arquivo (deve ter colunas: Data, Descrição).');
    } finally {
      setImporting(false);
      if (holidaysInputRef.current) {
        holidaysInputRef.current.value = '';
      }
    }
  };

  const handleTaskChange = (taskId: string, field: keyof ScheduleTask, value: any) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTask = { ...task, [field]: value };

    if (field === 'predecessors' && value) {
      const taskNumberMap = buildTaskNumberMap();
      const taskNumber = Array.from(taskNumberMap.entries()).find(([_, t]) => t.id === taskId)?.[0];

      if (taskNumber) {
        const predecessorRelations = parsePredecessors(value);
        if (predecessorRelations.length > 0) {
          const newDates = calculateDateFromPredecessor(
            taskNumber,
            updatedTask.duration,
            predecessorRelations,
            taskNumberMap,
            schedule.consider_weekends,
            holidays
          );

          if (newDates) {
            updatedTask.start_date = newDates.start_date;
            updatedTask.end_date = newDates.end_date;
          }
        }
      }
    }

    if (field === 'start_date' || field === 'end_date' || field === 'duration') {
      const startDate = parseDate(field === 'start_date' ? value : updatedTask.start_date);
      const endDate = parseDate(field === 'end_date' ? value : updatedTask.end_date);
      const duration = field === 'duration' ? Number(value) : updatedTask.duration;

      if (field === 'start_date' && startDate && duration > 0) {
        const newEndDate = calculateEndDate(startDate, duration, schedule.consider_weekends, holidays);
        updatedTask.end_date = formatDate(newEndDate);
      } else if (field === 'end_date' && startDate && endDate) {
        const newDuration = calculateDuration(startDate, endDate, schedule.consider_weekends, holidays);
        updatedTask.duration = newDuration;
      } else if (field === 'duration' && startDate && duration > 0) {
        const newEndDate = calculateEndDate(startDate, duration, schedule.consider_weekends, holidays);
        updatedTask.end_date = formatDate(newEndDate);
      }
    }

    setEditingTasks(prev => new Map(prev).set(taskId, updatedTask));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSaveTask(taskId);
    }, 1000);
  };

  const handleSaveTask = async (taskId: string) => {
    const task = editingTasks.get(taskId);
    if (!task || saving) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('schedule_tasks')
        .update({
          name: task.name,
          duration: task.duration,
          start_date: task.start_date,
          end_date: task.end_date,
          predecessors: task.predecessors,
          progress: task.progress,
          responsible: task.responsible,
          notes: task.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      setEditingTasks(prev => {
        const newMap = new Map(prev);
        newMap.delete(taskId);
        return newMap;
      });

      onTasksChange();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const getTaskValue = (task: ScheduleTask, field: keyof ScheduleTask) => {
    const editingTask = editingTasks.get(task.id);
    return editingTask ? editingTask[field] : task[field];
  };

  const handleDragStart = (task: ScheduleTask) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, task: ScheduleTask) => {
    e.preventDefault();
    setDragOverTask(task);
  };

  const handleDragEnd = async () => {
    if (!draggedTask || !dragOverTask || draggedTask.id === dragOverTask.id) {
      setDraggedTask(null);
      setDragOverTask(null);
      return;
    }

    try {
      const draggedIndex = tasks.findIndex(t => t.id === draggedTask.id);
      const targetIndex = tasks.findIndex(t => t.id === dragOverTask.id);

      const reorderedTasks = [...tasks];
      const [movedTask] = reorderedTasks.splice(draggedIndex, 1);
      reorderedTasks.splice(targetIndex, 0, movedTask);

      for (let i = 0; i < reorderedTasks.length; i++) {
        const { error } = await supabase
          .from('schedule_tasks')
          .update({ order_index: i })
          .eq('id', reorderedTasks[i].id);

        if (error) throw error;
      }

      onTasksChange();
    } catch (error) {
      console.error('Error reordering tasks:', error);
    } finally {
      setDraggedTask(null);
      setDragOverTask(null);
    }
  };

  const renderTaskRow = (task: ScheduleTask, level: number = 0, itemNumber: string = '') => {
    const isMacro = task.is_macro;
    const isDragging = draggedTask?.id === task.id;
    const isDragOver = dragOverTask?.id === task.id;

    const predecessorsError = validatePredecessors(itemNumber, String(getTaskValue(task, 'predecessors')));

    return (
      <tr
        key={task.id}
        className={`${isMacro ? 'bg-blue-100 font-semibold border-l-4 border-blue-600' : 'hover:bg-gray-50'} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'border-t-2 border-blue-500' : ''} transition-all cursor-move`}
        draggable
        onDragStart={() => handleDragStart(task)}
        onDragOver={(e) => handleDragOver(e, task)}
        onDragEnd={handleDragEnd}
      >
        <td className="px-4 py-2 border-b text-center" style={{ minWidth: '80px' }}>
          <div className="flex items-center justify-center gap-1">
            <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-grab" />
            <span className="font-semibold text-gray-900">{itemNumber}</span>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="p-1 text-red-600 hover:text-red-800"
              title="Excluir"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
        <td className="px-4 py-2 border-b text-center" style={{ minWidth: '100px' }}>
          <div className="flex items-center justify-center gap-2">
            {isMacro ? (
              <>
                <span className="px-2 py-1 text-xs font-bold rounded text-white" style={{ backgroundColor: arcoColors.primary.blue }}>
                  MACRO
                </span>
                <button
                  onClick={() => handleAddTask(false, task.id)}
                  className="p-1 hover:text-blue-800"
                  style={{ color: arcoColors.primary.blue }}
                  title="Adicionar Subtarefa"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </>
            ) : (
              <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                Tarefa
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '110px' }}>
          <input
            type="number"
            value={Number(getTaskValue(task, 'progress'))}
            onChange={(e) => handleTaskChange(task.id, 'progress', Math.min(100, Math.max(0, Number(e.target.value))))}
            disabled={isMacro}
            min="0"
            max="100"
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
          />
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '140px' }}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">{Number(getTaskValue(task, 'progress'))}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  width: `${Number(getTaskValue(task, 'progress'))}%`,
                  backgroundColor: '#22c55e'
                }}
              >
                {Number(getTaskValue(task, 'progress')) > 15 && (
                  <span className="text-xs font-semibold text-gray-900">{Number(getTaskValue(task, 'progress'))}%</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '140px' }}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">{calculatePlannedProgress(task)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 flex items-center justify-center"
                style={{
                  width: `${calculatePlannedProgress(task)}%`,
                  backgroundColor: arcoColors.primary.blue
                }}
              >
                {calculatePlannedProgress(task) > 15 && (
                  <span className="text-xs font-semibold text-gray-900">{calculatePlannedProgress(task)}%</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2 border-b" style={{ paddingLeft: `${level * 20 + 16}px`, minWidth: '500px' }}>
          <div className="flex items-center gap-2">
            <Edit className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={String(getTaskValue(task, 'name'))}
              onChange={(e) => handleTaskChange(task.id, 'name', e.target.value)}
              placeholder="Digite o nome da tarefa"
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold text-gray-900 bg-white"
            />
            {saving && editingTasks.has(task.id) && (
              <span className="text-xs text-gray-500 whitespace-nowrap">Salvando...</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '110px' }}>
          <input
            type="number"
            value={Number(getTaskValue(task, 'duration'))}
            onChange={(e) => handleTaskChange(task.id, 'duration', Math.max(0, Number(e.target.value)))}
            disabled={isMacro}
            min="0"
            placeholder="1"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
          />
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '150px' }}>
          <input
            type="date"
            value={String(getTaskValue(task, 'start_date') || '')}
            onChange={(e) => handleTaskChange(task.id, 'start_date', e.target.value)}
            disabled={isMacro}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
          />
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '150px' }}>
          <input
            type="date"
            value={String(getTaskValue(task, 'end_date') || '')}
            onChange={(e) => handleTaskChange(task.id, 'end_date', e.target.value)}
            disabled={isMacro}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-500"
          />
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '200px' }}>
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={String(getTaskValue(task, 'predecessors'))}
              onChange={(e) => handleTaskChange(task.id, 'predecessors', e.target.value)}
              placeholder="Ex: 1FS+7d, 2SS, 3"
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:border-transparent text-gray-900 bg-white placeholder-gray-400 ${
                predecessorsError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
              }`}
              title={predecessorsError || 'Formato: [ID][Tipo][±Dias]. Ex: 1FS+7d (Finish-Start +7 dias), 2SS (Start-Start), 3FF-2d (Finish-Finish -2 dias)'}
            />
            {predecessorsError && (
              <span className="text-xs text-red-600">{predecessorsError}</span>
            )}
          </div>
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '150px' }}>
          <input
            type="text"
            value={String(getTaskValue(task, 'responsible'))}
            onChange={(e) => handleTaskChange(task.id, 'responsible', e.target.value)}
            placeholder="Nome do responsável"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
          />
        </td>
        <td className="px-4 py-2 border-b" style={{ minWidth: '200px' }}>
          <input
            type="text"
            value={String(getTaskValue(task, 'notes'))}
            onChange={(e) => handleTaskChange(task.id, 'notes', e.target.value)}
            placeholder="Observações"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
          />
        </td>
      </tr>
    );
  };

  const calculatePlannedProgress = (task: ScheduleTask): number => {
    if (!referenceDate || task.is_macro) return 0;
    const refDate = parseDate(referenceDate);
    if (!refDate) return 0;

    const taskStartDate = parseDate(task.start_date);
    const taskEndDate = parseDate(task.end_date);

    if (!taskStartDate || !taskEndDate) return 0;

    if (refDate < taskStartDate) return 0;
    if (refDate >= taskEndDate) return 100;

    const totalDuration = calculateDuration(taskStartDate, taskEndDate, schedule.consider_weekends, holidays);
    const elapsedDuration = calculateDuration(taskStartDate, refDate, schedule.consider_weekends, holidays);

    return totalDuration > 0 ? Math.round((elapsedDuration / totalDuration) * 100) : 0;
  };

  const calculateCurrentProgress = () => {
    const nonMacroTasks = tasks.filter(t => !t.is_macro);
    if (nonMacroTasks.length === 0) return 0;
    const totalDuration = nonMacroTasks.reduce((sum, t) => sum + t.duration, 0);
    if (totalDuration === 0) return 0;
    const weightedProgress = nonMacroTasks.reduce((sum, t) => sum + (t.progress * t.duration), 0);
    return Math.round(weightedProgress / totalDuration);
  };

  const runSimulation = () => {
    if (!referenceDate) return;
    const refDate = parseDate(referenceDate);
    if (!refDate) return;

    const nonMacroTasks = tasks.filter(t => !t.is_macro);
    if (nonMacroTasks.length === 0) {
      setSimulationProgress(null);
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
    setSimulationProgress(progressPercentage >= 99.5 ? 100 : progressPercentage);
  };

  const fillProgressFromPlanned = async () => {
    if (!referenceDate) {
      alert('Por favor, defina uma data de referência primeiro');
      return;
    }

    if (!confirm('Isso irá atualizar a % concluída de todas as tarefas baseado no progresso planejado. Deseja continuar?')) {
      return;
    }

    const refDate = parseDate(referenceDate);
    if (!refDate) return;

    setSaving(true);

    try {
      const nonMacroTasks = tasks.filter(t => !t.is_macro);

      for (const task of nonMacroTasks) {
        const taskEndDate = parseDate(task.end_date);
        const plannedProgress = taskEndDate && taskEndDate <= refDate ? 100 : 0;

        await supabase
          .from('schedule_tasks')
          .update({
            progress: plannedProgress,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }

      onTasksChange();
      alert('Progresso atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Erro ao atualizar progresso');
    } finally {
      setSaving(false);
    }
  };

  const clearRealProgress = async () => {
    if (!confirm('Isso irá zerar a % concluída de todas as tarefas. Deseja continuar?')) {
      return;
    }

    setSaving(true);

    try {
      const nonMacroTasks = tasks.filter(t => !t.is_macro);

      for (const task of nonMacroTasks) {
        await supabase
          .from('schedule_tasks')
          .update({
            progress: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);
      }

      onTasksChange();
      alert('Progresso zerado com sucesso!');
    } catch (error) {
      console.error('Error clearing progress:', error);
      alert('Erro ao zerar progresso');
    } finally {
      setSaving(false);
    }
  };

  const buildTaskNumberMap = (): Map<string, ScheduleTask> => {
    const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);
    const numberMap = new Map<string, ScheduleTask>();
    let macroCounter = 1;
    const macroNumbers = new Map<string, number>();

    sortedTasks.forEach(task => {
      if (task.is_macro && !task.parent_id) {
        macroNumbers.set(task.id, macroCounter);
        numberMap.set(String(macroCounter), task);
        macroCounter++;
      }
    });

    sortedTasks.forEach(task => {
      if (task.parent_id) {
        const parentMacroNum = macroNumbers.get(task.parent_id);
        if (parentMacroNum) {
          const siblingsBefore = sortedTasks
            .slice(0, sortedTasks.indexOf(task))
            .filter(t => t.parent_id === task.parent_id).length;

          const taskNumber = `${parentMacroNum}.${siblingsBefore + 1}`;
          numberMap.set(taskNumber, task);
        }
      } else if (!task.is_macro) {
        numberMap.set(String(macroCounter), task);
        macroCounter++;
      }
    });

    return numberMap;
  };

  const calculateDatesFromPredecessors = async () => {
    if (!confirm('Isso irá recalcular as datas de início e fim de todas as tarefas com base nas predecessoras. Deseja continuar?')) {
      return;
    }

    setSaving(true);

    try {
      const taskNumberMap = buildTaskNumberMap();
      const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);
      const updatedTasks: Array<{ id: string; start_date: string; end_date: string }> = [];

      const taskNumbersList = Array.from(taskNumberMap.entries()).map(([itemNumber, task]) => ({
        itemNumber,
        predecessors: task.predecessors
      }));

      for (const [taskNumber, task] of taskNumberMap.entries()) {
        if (task.is_macro) continue;

        if (detectCircularDependency(taskNumber, taskNumbersList)) {
          alert(`Dependência circular detectada na tarefa ${taskNumber} (${task.name}). Corrija antes de calcular.`);
          setSaving(false);
          return;
        }
      }

      for (const [taskNumber, task] of taskNumberMap.entries()) {
        if (task.is_macro) continue;

        const predecessorRelations = parsePredecessors(task.predecessors);

        if (predecessorRelations.length === 0) {
          continue;
        }

        let latestDate: { startDate: Date; endDate: Date } | null = null;

        for (const relation of predecessorRelations) {
          const predecessorTask = taskNumberMap.get(relation.taskNumber);

          if (!predecessorTask) {
            alert(`Predecessora inválida "${relation.taskNumber}" na tarefa ${taskNumber} (${task.name})`);
            setSaving(false);
            return;
          }

          const predStart = parseDate(predecessorTask.start_date);
          const predEnd = parseDate(predecessorTask.end_date);

          if (!predStart || !predEnd) {
            alert(`A predecessora ${relation.taskNumber} (${predecessorTask.name}) não tem datas definidas`);
            setSaving(false);
            return;
          }

          const calculatedDates = calculateDateFromPredecessor(
            predStart,
            predEnd,
            relation,
            task.duration,
            schedule.consider_weekends,
            holidays
          );

          if (calculatedDates) {
            if (!latestDate || calculatedDates.startDate > latestDate.startDate) {
              latestDate = calculatedDates;
            }
          }
        }

        if (latestDate) {
          updatedTasks.push({
            id: task.id,
            start_date: formatDate(latestDate.startDate),
            end_date: formatDate(latestDate.endDate)
          });
        }
      }

      for (const update of updatedTasks) {
        await supabase
          .from('schedule_tasks')
          .update({
            start_date: update.start_date,
            end_date: update.end_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
      }

      onTasksChange();
      alert(`${updatedTasks.length} tarefas recalculadas com sucesso!`);
    } catch (error) {
      console.error('Error calculating dates from predecessors:', error);
      alert('Erro ao calcular datas. Verifique o console para mais detalhes.');
    } finally {
      setSaving(false);
    }
  };

  const validatePredecessors = (taskNumber: string, predecessorsStr: string): string | null => {
    if (!predecessorsStr.trim()) return null;

    const taskNumberMap = buildTaskNumberMap();
    const predecessorRelations = parsePredecessors(predecessorsStr);

    for (const relation of predecessorRelations) {
      const predecessorTask = taskNumberMap.get(relation.taskNumber);

      if (!predecessorTask) {
        return `Tarefa ${relation.taskNumber} não encontrada`;
      }

      if (relation.taskNumber === taskNumber) {
        return 'Uma tarefa não pode ser predecessora de si mesma';
      }
    }

    const taskNumbersList = Array.from(taskNumberMap.entries()).map(([itemNumber, task]) => ({
      itemNumber,
      predecessors: itemNumber === taskNumber ? predecessorsStr : task.predecessors
    }));

    if (detectCircularDependency(taskNumber, taskNumbersList)) {
      return 'Dependência circular detectada';
    }

    return null;
  };

  const renderTasksHierarchy = () => {
    // Ordena todas as tarefas por order_index para manter a ordem original
    const sortedTasks = [...tasks].sort((a, b) => a.order_index - b.order_index);

    const result: JSX.Element[] = [];
    let macroCounter = 1;
    const macroNumbers = new Map<string, number>();

    // Primeiro, atribui números aos macros
    sortedTasks.forEach(task => {
      if (task.is_macro && !task.parent_id) {
        macroNumbers.set(task.id, macroCounter);
        macroCounter++;
      }
    });

    // Agora renderiza na ordem
    sortedTasks.forEach(task => {
      if (task.is_macro && !task.parent_id) {
        // É um macro
        const macroNum = macroNumbers.get(task.id);
        result.push(renderTaskRow(task, 0, String(macroNum)));
      } else if (task.parent_id) {
        // É uma subtarefa
        const parentMacroNum = macroNumbers.get(task.parent_id);
        if (parentMacroNum) {
          // Conta quantas subtarefas do mesmo pai já foram renderizadas
          const siblingsBefore = sortedTasks
            .slice(0, sortedTasks.indexOf(task))
            .filter(t => t.parent_id === task.parent_id).length;

          result.push(renderTaskRow(task, 1, `${parentMacroNum}.${siblingsBefore + 1}`));
        }
      } else {
        // É uma tarefa órfã (sem pai e não é macro)
        result.push(renderTaskRow(task, 0, String(macroCounter)));
        macroCounter++;
      }
    });

    return result;
  };

  return (
    <div className="flex flex-col h-full p-4">
      {onBack && (
        <div className="mb-3">
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity text-white"
            style={{ backgroundColor: arcoColors.primary.blue }}
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      )}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => handleAddTask(true)}
          className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#10B981', color: '#000000' }}
        >
          <Plus className="w-4 h-4" />
          Macro
        </button>
        <button
          onClick={() => handleAddTask(false)}
          className="px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#fbbf24', color: '#000000' }}
        >
          <Plus className="w-4 h-4" />
          Tarefa
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="px-4 py-2 rounded-md font-medium flex items-center gap-2 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          <Upload className="w-4 h-4" />
          {importing ? 'Importando...' : 'Importar Excel'}
        </button>
        <button
          onClick={handleClearAll}
          disabled={importing || tasks.length === 0}
          className="px-4 py-2 rounded-md font-medium flex items-center gap-2 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#EF4444' }}
        >
          <Trash2 className="w-4 h-4" />
          Limpar Tudo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImportExcel}
          className="hidden"
        />
        <input
          ref={holidaysInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImportHolidays}
          className="hidden"
        />
      </div>

      <div className="mb-2 bg-white rounded-lg border border-gray-200 p-3">
        {/* Controles de simulação */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">Simular progresso:</span>
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
            style={{ color: '#000000' }}
          />
          <button
            onClick={runSimulation}
            className="px-3 py-1 text-xs rounded-md font-medium hover:opacity-90 transition-opacity flex items-center gap-1"
            style={{ backgroundColor: arcoColors.primary.blue, color: '#000000' }}
          >
            <Activity className="w-3 h-3" />
            Simular
          </button>
          <label className="flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs text-gray-700 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={considerWeekends}
              onChange={(e) => setConsiderWeekends(e.target.checked)}
              className="w-3 h-3"
            />
            <span>Considerar finais de semana</span>
          </label>
          <button
            onClick={() => holidaysInputRef.current?.click()}
            disabled={importing}
            className="px-3 py-1 text-xs rounded-md font-medium hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#fbbf24', color: '#000000' }}
          >
            <Upload className="w-3 h-3" />
            {importing ? 'Importando...' : 'Importar Feriados'}
          </button>
          <button
            onClick={fillProgressFromPlanned}
            disabled={saving || !referenceDate}
            className="px-3 py-1 text-xs rounded-md font-medium hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#10B981', color: '#000000' }}
            title="Preenche a % concluída de acordo com o progresso planejado"
          >
            <Check className="w-3 h-3" />
            Simular Real
          </button>
          <button
            onClick={clearRealProgress}
            disabled={saving}
            className="px-3 py-1 text-xs rounded-md font-medium hover:opacity-90 transition-opacity flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#ef4444', color: '#000000' }}
            title="Zera a % concluída de todas as tarefas"
          >
            <X className="w-3 h-3" />
            Limpar Real
          </button>
        </div>

        <div className="space-y-3">
          {/* Barra Real */}
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2" style={{ minWidth: '90px' }}>
              <span className="text-xs font-semibold text-gray-700">Real:</span>
              <span className="text-xs font-bold text-green-600">{calculateCurrentProgress()}%</span>
            </div>
            <div className="flex-1 min-w-0" style={{ maxWidth: '1200px' }}>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="h-6 rounded-full transition-all"
                  style={{ width: `${calculateCurrentProgress()}%`, backgroundColor: '#22c55e' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Barra Planejado */}
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2" style={{ minWidth: '90px' }}>
              <span className="text-xs font-semibold text-gray-700">Planejado:</span>
              <span className="text-xs font-bold" style={{ color: arcoColors.primary.blue }}>
                {simulationProgress !== null ? `${simulationProgress}%` : '-'}
              </span>
            </div>
            <div className="flex-1 min-w-0" style={{ maxWidth: '1200px' }}>
              <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                {simulationProgress !== null && (
                  <div
                    className="h-6 rounded-full transition-all"
                    style={{ width: `${simulationProgress}%`, backgroundColor: arcoColors.primary.blue }}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '80px' }}>Item</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '100px' }}>Macro</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '110px' }}>% Concluída</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '140px' }}>Progresso Real</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '140px' }}>Progresso Planejado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase" style={{ minWidth: '500px' }}>Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '110px' }}>Duração (dias)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '150px' }}>Data Inicial</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '150px' }}>Data Final</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '200px' }}>Predecessoras</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '150px' }}>Responsável</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '200px' }}>Observações</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  Nenhuma tarefa cadastrada. Clique em "Macro" ou "Tarefa" para começar.
                </td>
              </tr>
            ) : (
              renderTasksHierarchy()
            )}
          </tbody>
        </table>
      </div>

      {schedule.consider_weekends && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
          <Check className="w-4 h-4 inline mr-2" />
          Finais de semana estão sendo considerados nos cálculos
        </div>
      )}
    </div>
  );
}
