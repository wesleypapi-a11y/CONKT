import { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { conktColors } from '../../styles/colors';
import { Task, TaskColumn } from '../../types/task';
import { Work } from '../../types/work';
import { useAuth } from '../../contexts/AuthContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  task?: Task | null;
}

interface Profile {
  id: string;
  nome_completo: string;
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const { user } = useAuth();
  const [descricao, setDescricao] = useState('');
  const [obraId, setObraId] = useState('');
  const [obraText, setObraText] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [columnId, setColumnId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [boardId, setBoardId] = useState('');
  const [loading, setLoading] = useState(false);
  const [obras, setObras] = useState<Work[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchObras();
      fetchProfiles();

      if (task) {
        setDescricao(task.descricao);
        setObraId(task.obra_id);
        setObraText(task.obra_nome || '');
        setResponsavelId(task.responsavel_id || '');
        setColumnId(task.column_id || '');
        setDeadline(task.deadline || '');
        setBoardId(task.board_id || '');
        if (task.board_id) {
          fetchColumns(task.board_id);
        }
      } else {
        setDescricao('');
        setObraId('');
        setObraText('');
        setResponsavelId('');
        setColumnId(task?.column_id || '');
        setDeadline('');
        setBoardId(task?.board_id || '');
        if (task?.board_id) {
          fetchColumns(task.board_id);
        }
      }
    }
  }, [isOpen, task]);

  const fetchObras = async () => {
    const { data, error } = await supabase
      .from('works')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Erro ao buscar obras:', error);
    } else if (data) {
      const obrasFormatted = data.map(obra => ({
        ...obra,
        nome: obra.name
      }));
      setObras(obrasFormatted as any);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nome_completo')
      .order('nome_completo');

    if (error) {
      console.error('Erro ao buscar perfis:', error);
    } else if (data) {
      setProfiles(data);
    }
  };

  const fetchColumns = async (board_id: string) => {
    const { data, error } = await supabase
      .from('task_columns')
      .select('*')
      .eq('board_id', board_id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Erro ao buscar colunas:', error);
    } else if (data) {
      setColumns(data);
      if (!columnId && data.length > 0) {
        setColumnId(data[0].id);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (task?.id) {
        const { error } = await supabase
          .from('tasks')
          .update({
            descricao: descricao || null,
            obra_id: obraId || null,
            obra_nome: obraText || null,
            responsavel_id: responsavelId || null,
            column_id: columnId || null,
            deadline: deadline || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', task.id);

        if (error) throw error;
      } else {
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
          .insert({
            descricao: descricao || null,
            obra_id: obraId || null,
            obra_nome: obraText || null,
            responsavel_id: responsavelId || null,
            column_id: columnId || null,
            board_id: boardId,
            deadline: deadline || null,
            status: 'todo',
            ordem: nextOrdem,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (err) {
      setError('Erro ao salvar tarefa');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">
            {task?.id ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              className="p-4 rounded-lg text-sm text-white"
              style={{ backgroundColor: conktColors.status.error }}
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="obra" className="block text-sm font-semibold text-gray-700 mb-2">
              Obra
            </label>
            <input
              type="text"
              id="obra"
              list="obras-list"
              value={obraText}
              onChange={(e) => {
                setObraText(e.target.value);
                const selectedObra = obras.find(o => o.nome === e.target.value);
                setObraId(selectedObra?.id || '');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
              placeholder="Digite ou selecione uma obra"
            />
            <datalist id="obras-list">
              {obras.map((obra) => (
                <option key={obra.id} value={obra.nome} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="descricao" className="block text-sm font-semibold text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-gray-900"
              placeholder="Descreva a tarefa..."
            />
          </div>

          <div>
            <label htmlFor="responsavel" className="block text-sm font-semibold text-gray-700 mb-2">
              Responsável
            </label>
            <select
              id="responsavel"
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            >
              <option value="">Sem responsável</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.nome_completo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="column" className="block text-sm font-semibold text-gray-700 mb-2">
              Coluna
            </label>
            <select
              id="column"
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            >
              <option value="">Selecione uma coluna</option>
              {columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                Prazo Final
              </div>
            </label>
            <input
              type="date"
              id="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">
              Data limite para conclusão da tarefa (opcional)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: conktColors.sidebar.main }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
