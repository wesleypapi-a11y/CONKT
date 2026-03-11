import { useState, useEffect } from 'react';
import { X, Save, Phone, Mail, MapPin, Calendar, DollarSign, Clock, User, FileText, TrendingUp, Target } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  Prospection,
  ProspectionStatus,
  ProspectionOrigem,
  ProspectionProbabilidade,
  prospectionStatusLabels,
  prospectionOrigemLabels,
  prospectionProbabilidadeLabels,
} from '../../types/prospection';

interface ProspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospection?: Prospection | null;
  onSave: () => void;
}

export default function ProspectionModal({ isOpen, onClose, prospection, onSave }: ProspectionModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_cliente: '',
    telefone: '',
    email: '',
    tipo_obra: '',
    descricao: '',
    valor_estimado: '',
    prazo_estimado: '',
    endereco: '',
    cidade: '',
    estado: '',
    status: 'novo' as ProspectionStatus,
    origem: 'telefone' as ProspectionOrigem,
    probabilidade: 'media' as ProspectionProbabilidade,
    proximo_followup: '',
    observacoes: '',
  });

  useEffect(() => {
    if (prospection) {
      setFormData({
        nome_cliente: prospection.nome_cliente || '',
        telefone: prospection.telefone || '',
        email: prospection.email || '',
        tipo_obra: prospection.tipo_obra || '',
        descricao: prospection.descricao || '',
        valor_estimado: prospection.valor_estimado?.toString() || '',
        prazo_estimado: prospection.prazo_estimado || '',
        endereco: prospection.endereco || '',
        cidade: prospection.cidade || '',
        estado: prospection.estado || '',
        status: prospection.status,
        origem: prospection.origem,
        probabilidade: prospection.probabilidade,
        proximo_followup: prospection.proximo_followup || '',
        observacoes: prospection.observacoes || '',
      });
    } else {
      setFormData({
        nome_cliente: '',
        telefone: '',
        email: '',
        tipo_obra: '',
        descricao: '',
        valor_estimado: '',
        prazo_estimado: '',
        endereco: '',
        cidade: '',
        estado: '',
        status: 'novo',
        origem: 'telefone',
        probabilidade: 'media',
        proximo_followup: '',
        observacoes: '',
      });
    }
  }, [prospection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_cliente.trim()) {
      alert('Por favor, informe o nome do cliente');
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        nome_cliente: formData.nome_cliente.trim(),
        telefone: formData.telefone.trim() || null,
        email: formData.email.trim() || null,
        tipo_obra: formData.tipo_obra.trim() || null,
        descricao: formData.descricao.trim() || null,
        valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
        prazo_estimado: formData.prazo_estimado.trim() || null,
        endereco: formData.endereco.trim() || null,
        cidade: formData.cidade.trim() || null,
        estado: formData.estado.trim() || null,
        status: formData.status,
        origem: formData.origem,
        probabilidade: formData.probabilidade,
        proximo_followup: formData.proximo_followup || null,
        observacoes: formData.observacoes.trim() || null,
        created_by: user?.id,
      };

      if (prospection) {
        const { error } = await supabase
          .from('prospections')
          .update(dataToSave)
          .eq('id', prospection.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('prospections')
          .insert(dataToSave);

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving prospection:', error);
      alert('Erro ao salvar prospecção');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800">
            {prospection ? 'Editar Prospecção' : 'Nova Prospecção'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User size={16} />
                Nome do Cliente *
              </label>
              <input
                type="text"
                value={formData.nome_cliente}
                onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Nome completo do cliente"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Phone size={16} />
                Telefone
              </label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail size={16} />
                E-mail
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Origem do Contato
              </label>
              <select
                value={formData.origem}
                onChange={(e) => setFormData({ ...formData, origem: e.target.value as ProspectionOrigem })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                {Object.entries(prospectionOrigemLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <TrendingUp size={16} />
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProspectionStatus })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                {Object.entries(prospectionStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Target size={16} />
                Probabilidade de Fechamento
              </label>
              <select
                value={formData.probabilidade}
                onChange={(e) => setFormData({ ...formData, probabilidade: e.target.value as ProspectionProbabilidade })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                {Object.entries(prospectionProbabilidadeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} />
                Próximo Follow-up
              </label>
              <input
                type="date"
                value={formData.proximo_followup}
                onChange={(e) => setFormData({ ...formData, proximo_followup: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Tipo de Obra
              </label>
              <input
                type="text"
                value={formData.tipo_obra}
                onChange={(e) => setFormData({ ...formData, tipo_obra: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Ex: Reforma, Construção, Ampliação..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <DollarSign size={16} />
                Valor Estimado (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.valor_estimado}
                onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Clock size={16} />
                Prazo Estimado
              </label>
              <input
                type="text"
                value={formData.prazo_estimado}
                onChange={(e) => setFormData({ ...formData, prazo_estimado: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Ex: 3 meses, 6 semanas..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin size={16} />
                Endereço da Obra
              </label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Rua, Número, Bairro"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Cidade
              </label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Nome da cidade"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Estado
              </label>
              <input
                type="text"
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Ex: SP, RJ, MG..."
                maxLength={2}
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Descrição da Necessidade
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                placeholder="Descreva o que o cliente precisa..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FileText size={16} />
                Observações
              </label>
              <textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 resize-none"
                placeholder="Anotações gerais, histórico de contatos, etc..."
              />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="btn-cancel"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Salvando...' : 'Salvar Prospecção'}
          </button>
        </div>
      </div>
    </div>
  );
}
