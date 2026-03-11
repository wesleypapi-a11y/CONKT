import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, User, Building2, Calendar, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { conktColors } from '../../styles/colors';
import { Task, TaskColumn, TaskBoard as TaskBoardType } from '../../types/task';
import TaskModal from './TaskModal';
import { useAuth } from '../../contexts/AuthContext';

interface TaskWithDetails extends Task {
  obra_nome?: string;
  responsavel_nome?: string;
  created_by_name?: string;
}

export default function TaskBoard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [boards, setBoards] = useState<TaskBoardType[]>([]);
  const [activeBoard, setActiveBoard] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<TaskColumn | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<TaskBoardType | null>(null);
  const [newBoardName, setNewBoardName] = useState('');

  useEffect(() => {
    fetchBoards();
  }, []);

  useEffect(() => {
    if (activeBoard) {
      fetchColumns();
      fetchTasks();
    }
  }, [activeBoard]);

  const fetchBoards = async () => {
    const { data, error } = await supabase
      .from('task_boards')
      .select('*')
      .order('position', { ascending: true });

    if (error) {
      console.error('Erro ao buscar quadros:', error);
    } else if (data && data.length > 0) {
      setBoards(data);
      setActiveBoard(data[0].id);
    }
  };

  const fetchColumns = async () => {
    if (!activeBoard) return;

    const { data, error } = await supabase
      .from('task_columns')
      .select('*')
      .eq('board_id', activeBoard)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erro ao buscar colunas:', error);
    } else if (data) {
      setColumns(data);
    }
  };

  const fetchTasks = async () => {
    if (!activeBoard) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        works!tasks_obra_id_fkey(name),
        profiles!tasks_responsavel_id_fkey(nome),
        creator:profiles!tasks_created_by_fkey(nome)
      `)
      .eq('board_id', activeBoard)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('Erro ao buscar tarefas:', error);
    } else if (data) {
      const tasksWithDetails = data.map((task: any) => ({
        ...task,
        obra_nome: task.works?.name,
        responsavel_nome: task.profiles?.nome,
        created_by_name: task.creator?.nome,
      }));
      setTasks(tasksWithDetails);
    }
    setLoading(false);
  };

  const handleAddTask = (columnId?: string) => {
    const newTask = {
      column_id: columnId || (columns.length > 0 ? columns[0].id : ''),
      board_id: activeBoard,
    } as any;
    setSelectedTask(newTask);
    setIsModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao excluir tarefa:', error);
      alert('Erro ao excluir tarefa');
    } else {
      fetchTasks();
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (columnId: string) => {
    if (!draggedTask) return;

    const task = tasks.find(t => t.id === draggedTask);
    if (!task || task.column_id === columnId) {
      setDraggedTask(null);
      return;
    }

    const maxOrdemResult = await supabase
      .from('tasks')
      .select('ordem')
      .eq('column_id', columnId)
      .order('ordem', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrdem = maxOrdemResult.data ? maxOrdemResult.data.ordem + 1 : 0;

    const { error } = await supabase
      .from('tasks')
      .update({
        column_id: columnId,
        ordem: nextOrdem,
        updated_at: new Date().toISOString(),
      })
      .eq('id', draggedTask);

    if (error) {
      console.error('Erro ao mover tarefa:', error);
      alert('Erro ao mover tarefa');
    } else {
      fetchTasks();
    }

    setDraggedTask(null);
  };

  const getTasksByColumn = (columnId: string) => {
    return tasks.filter(task => task.column_id === columnId);
  };

  const handleAddColumn = () => {
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
    setIsColumnModalOpen(true);
  };

  const handleEditColumn = (column: TaskColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
    setNewColumnColor(column.color);
    setIsColumnModalOpen(true);
  };

  const handleSaveColumn = async () => {
    if (!newColumnName.trim()) {
      alert('Digite um nome para a coluna');
      return;
    }

    if (editingColumn) {
      const { error } = await supabase
        .from('task_columns')
        .update({
          name: newColumnName,
          color: newColumnColor,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingColumn.id);

      if (error) {
        console.error('Erro ao atualizar coluna:', error);
        alert('Erro ao atualizar coluna');
      } else {
        fetchColumns();
        setIsColumnModalOpen(false);
      }
    } else {
      const maxPositionResult = await supabase
        .from('task_columns')
        .select('position')
        .eq('board_id', activeBoard)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = maxPositionResult.data ? maxPositionResult.data.position + 1 : 0;

      const { error } = await supabase
        .from('task_columns')
        .insert({
          name: newColumnName,
          color: newColumnColor,
          position: nextPosition,
          board_id: activeBoard,
        });

      if (error) {
        console.error('Erro ao criar coluna:', error);
        alert('Erro ao criar coluna');
      } else {
        fetchColumns();
        setIsColumnModalOpen(false);
      }
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const columnTasks = getTasksByColumn(columnId);
    if (columnTasks.length > 0) {
      alert('Não é possível excluir uma coluna que contém tarefas. Mova ou exclua as tarefas primeiro.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir esta coluna?')) return;

    const { error } = await supabase
      .from('task_columns')
      .delete()
      .eq('id', columnId);

    if (error) {
      console.error('Erro ao excluir coluna:', error);
      alert('Erro ao excluir coluna');
    } else {
      fetchColumns();
    }
  };

  const handleAddBoard = () => {
    setEditingBoard(null);
    setNewBoardName('');
    setIsBoardModalOpen(true);
  };

  const handleEditBoard = (board: TaskBoardType) => {
    setEditingBoard(board);
    setNewBoardName(board.name);
    setIsBoardModalOpen(true);
  };

  const handleSaveBoard = async () => {
    if (!newBoardName.trim()) {
      alert('Digite um nome para o quadro');
      return;
    }

    if (editingBoard) {
      const { error } = await supabase
        .from('task_boards')
        .update({
          name: newBoardName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingBoard.id);

      if (error) {
        console.error('Erro ao atualizar quadro:', error);
        alert('Erro ao atualizar quadro');
      } else {
        fetchBoards();
        setIsBoardModalOpen(false);
      }
    } else {
      const maxPositionResult = await supabase
        .from('task_boards')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = maxPositionResult.data ? maxPositionResult.data.position + 1 : 0;

      const { data, error } = await supabase
        .from('task_boards')
        .insert({
          name: newBoardName,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar quadro:', error);
        alert('Erro ao criar quadro');
      } else {
        if (data) {
          const defaultColumns = [
            { name: 'A Fazer', color: '#ef4444', position: 0 },
            { name: 'Em Andamento', color: '#f59e0b', position: 1 },
            { name: 'Concluído', color: '#10b981', position: 2 },
          ];

          const columnsToInsert = defaultColumns.map(col => ({
            ...col,
            board_id: data.id,
          }));

          const { error: columnsError } = await supabase
            .from('task_columns')
            .insert(columnsToInsert);

          if (columnsError) {
            console.error('Erro ao criar colunas padrão:', columnsError);
          }

          setActiveBoard(data.id);
        }
        fetchBoards();
        setIsBoardModalOpen(false);
      }
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (boards.length <= 1) {
      alert('Não é possível excluir o último quadro.');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este quadro? Todas as colunas e tarefas serão excluídas.')) return;

    const { error } = await supabase
      .from('task_boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      console.error('Erro ao excluir quadro:', error);
      alert('Erro ao excluir quadro');
    } else {
      fetchBoards();
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const isOverdue = (deadline: string | null) => {
    if (!deadline) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: '#3b82f6' }}
        >
          Voltar
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Quadro de Tarefas</h2>
        <div></div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {boards.map((board) => (
          <div key={board.id} className="relative group">
            <button
              onClick={() => setActiveBoard(board.id)}
              className={`px-6 py-3 font-medium transition-all whitespace-nowrap ${
                activeBoard === board.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {board.name}
            </button>
            <div className="absolute -top-1 -right-1 flex gap-1">
              <button
                onClick={() => handleEditBoard(board)}
                className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                title="Editar quadro"
              >
                <Edit size={12} className="text-blue-600" />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Deseja realmente excluir esta aba?')) {
                    handleDeleteBoard(board.id);
                  }
                }}
                className="p-1 bg-white rounded-full shadow-md hover:bg-red-100"
                title="Excluir aba"
              >
                <Trash2 size={12} className="text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => handleAddTask()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: '#3b82f6' }}
        >
          <Plus size={20} />
          Nova Tarefa
        </button>
        <button
          onClick={handleAddColumn}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: '#10b981' }}
        >
          <Plus size={20} />
          Nova Coluna
        </button>
        <button
          onClick={handleAddBoard}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: '#fbbf24' }}
        >
          <Plus size={20} />
          Novo Quadro
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Carregando tarefas...</div>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max pb-4">
            {columns.map((column) => {
              const columnTasks = getTasksByColumn(column.id);
              return (
                <div
                  key={column.id}
                  className="flex-shrink-0 w-80 bg-gray-50 rounded-xl p-4 flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(column.id)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: column.color }}
                      />
                      <h3 className="font-semibold text-gray-700">{column.name}</h3>
                      <span className="text-sm text-gray-500">({columnTasks.length})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditColumn(column)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Editar coluna"
                      >
                        <Edit size={16} className="text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Deseja realmente excluir esta coluna?')) {
                            handleDeleteColumn(column.id);
                          }
                        }}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="Excluir coluna"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto min-h-[100px]">
                    {columnTasks.length === 0 ? (
                      <div className="text-center text-gray-400 text-sm py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        Arraste tarefas aqui
                      </div>
                    ) : (
                      columnTasks.map((task) => (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => handleDragStart(task.id)}
                          onClick={() => handleEditTask(task)}
                          className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-move hover:border-gray-300 ${
                            draggedTask === task.id ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="space-y-3">
                            <p className="text-gray-800 text-sm leading-relaxed font-medium">
                              {task.descricao}
                            </p>

                            {task.deadline && (
                              <div className={`flex items-center gap-2 text-xs ${
                                isOverdue(task.deadline) ? 'text-red-600 font-semibold' : 'text-gray-600'
                              }`}>
                                <Calendar size={14} />
                                <span>{formatDate(task.deadline)}</span>
                                {isOverdue(task.deadline) && <span className="text-xs">(Atrasado)</span>}
                              </div>
                            )}

                            {task.obra_nome && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Building2 size={14} />
                                <span>{task.obra_nome}</span>
                              </div>
                            )}

                            {task.responsavel_nome && (
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <User size={14} />
                                <span>{task.responsavel_nome}</span>
                              </div>
                            )}

                            {task.created_by_name && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                                <span>Criado por: {task.created_by_name}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditTask(task);
                                }}
                                className="p-1 rounded hover:bg-gray-100 transition-colors text-blue-600"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTask(task.id);
                                }}
                                className="p-1 rounded hover:bg-gray-100 transition-colors text-red-600"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchTasks}
        task={selectedTask}
      />

      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingColumn ? 'Editar Coluna' : 'Nova Coluna'}
              </h3>
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome da Coluna
                </label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Ex: Em Análise"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Cor da Coluna
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200"
                  />
                  <input
                    type="text"
                    value={newColumnColor.toUpperCase()}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase text-gray-900"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              {editingColumn && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDeleteColumn(editingColumn.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={18} />
                    Excluir Coluna
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setIsColumnModalOpen(false)}
                className="btn-cancel flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveColumn}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <Check size={18} />
                {editingColumn ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBoardModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBoard ? 'Editar Quadro' : 'Novo Quadro'}
              </h3>
              <button
                onClick={() => setIsBoardModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome do Quadro
                </label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  placeholder="Ex: Projetos 2024"
                />
              </div>

              {editingBoard && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleDeleteBoard(editingBoard.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={18} />
                    Excluir Quadro
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setIsBoardModalOpen(false)}
                className="btn-cancel flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBoard}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: '#3b82f6' }}
              >
                <Check size={18} />
                {editingBoard ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
