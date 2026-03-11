import { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { WorkDiaryComment } from '../../types/workDiary';

interface RDOCommentsTabProps {
  rdoId: string;
}

export default function RDOCommentsTab({ rdoId }: RDOCommentsTabProps) {
  const [notes, setNotes] = useState('');
  const [commentsList, setCommentsList] = useState<WorkDiaryComment[]>([]);
  const [commentForm, setCommentForm] = useState({ comment: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [rdoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [notesData, commentsData] = await Promise.all([
        supabase.from('work_diaries').select('comments_notes').eq('id', rdoId).maybeSingle(),
        supabase.from('work_diary_comments').select('*').eq('work_diary_id', rdoId).order('created_at', { ascending: true })
      ]);

      if (notesData.data) {
        setNotes(notesData.data.comments_notes || '');
      }
      setCommentsList(commentsData.data || []);
    } catch (error) {
      console.error('Error loading comments data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('work_diaries')
        .update({ comments_notes: notes })
        .eq('id', rdoId);

      if (error) throw error;
      alert('Observações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Erro ao salvar observações');
    } finally {
      setSaving(false);
    }
  };

  const addComment = async () => {
    if (!commentForm.comment.trim()) {
      alert('Preencha o comentário');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_diary_comments')
        .insert({
          work_diary_id: rdoId,
          comment: commentForm.comment
        });

      if (error) throw error;
      setCommentForm({ comment: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Erro ao adicionar comentário');
    }
  };

  const deleteComment = async (id: string) => {
    if (!confirm('Deseja realmente excluir este comentário?')) return;

    try {
      const { error } = await supabase.from('work_diary_comments').delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4" style={{ color: conktColors.text }}>
          Comentários
        </h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações gerais
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
            style={{}}
            placeholder="Escreva observações gerais..."
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="mt-2 px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: conktColors.primary.blue }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Observações'}
          </button>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold mb-4 text-gray-800">Adicionar Comentário</h4>

          <div className="p-4 bg-gray-50 rounded-lg mb-4">
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comentário</label>
              <textarea
                value={commentForm.comment}
                onChange={(e) => setCommentForm({ comment: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-none"
                style={{}}
                placeholder="Escreva um comentário..."
              />
            </div>
            <button
              onClick={addComment}
              className="px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: conktColors.primary.blue }}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {commentsList.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Lista de Comentários ({commentsList.length})</h4>
              {commentsList.map((comment) => (
                <div key={comment.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-1">
                    <p className="text-gray-800 whitespace-pre-wrap">{comment.comment}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(comment.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors ml-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
