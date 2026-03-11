import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Phone, Mail, Calendar, DollarSign, Building2, Filter, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ProspectionModal from './ProspectionModal';
import TemplateImportModal from './TemplateImportModal';
import QuickWorkModal from '../works/QuickWorkModal';
import {
  Prospection,
  ProspectionStatus,
  prospectionStatusLabels,
  prospectionStatusColors,
  prospectionProbabilidadeColors,
  prospectionProbabilidadeLabels,
} from '../../types/prospection';

export default function ProspectionsList() {
  const { profile } = useAuth();
  const [prospections, setProspections] = useState<Prospection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProspectionStatus | 'all'>('all');
  const [selectedProspection, setSelectedProspection] = useState<Prospection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isQuickWorkModalOpen, setIsQuickWorkModalOpen] = useState(false);

  useEffect(() => {
    loadProspections();
  }, []);

  const loadProspections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prospections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProspections(data || []);
    } catch (error) {
      console.error('Error loading prospections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta prospecção?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('prospections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadProspections();
    } catch (error) {
      console.error('Error deleting prospection:', error);
      alert('Erro ao excluir prospecção');
    }
  };

  const handleEdit = (prospection: Prospection) => {
    setSelectedProspection(prospection);
    setIsModalOpen(true);
  };

  const handleNewProspection = () => {
    setSelectedProspection(null);
    setIsModalOpen(true);
  };

  const filteredProspections = prospections.filter((prospection) => {
    const matchesSearch =
      prospection.nome_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospection.telefone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospection.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospection.tipo_obra?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || prospection.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const isFollowUpToday = (date?: string) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  const isFollowUpOverdue = (date?: string) => {
    if (!date) return false;
    const today = new Date().toISOString().split('T')[0];
    return date < today;
  };

  const statusCounts = prospections.reduce((acc, prospection) => {
    acc[prospection.status] = (acc[prospection.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const canDelete = profile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Prospecção de Orçamentos</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie leads e contatos de clientes potenciais
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsQuickWorkModalOpen(true)}
            className="px-4 py-2 bg-gray-600 text-gray-900 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <Building2 size={18} />
            Cadastrar Obra
          </button>
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            Templates
          </button>
          <button
            onClick={handleNewProspection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Nova Prospecção
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(prospectionStatusLabels).map(([status, label]) => (
          <div
            key={status}
            className={`p-4 rounded-lg border-2 ${
              statusFilter === status ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
            } cursor-pointer transition-all hover:shadow-md`}
            onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as ProspectionStatus)}
          >
            <div className="text-2xl font-bold text-gray-800">
              {statusCounts[status] || 0}
            </div>
            <div className="text-sm text-gray-600 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email ou tipo de obra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProspectionStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          >
            <option value="all">Todos os Status</option>
            {Object.entries(prospectionStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Carregando prospecções...</p>
        </div>
      ) : filteredProspections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 mb-4">
            {searchTerm || statusFilter !== 'all'
              ? 'Nenhuma prospecção encontrada com os filtros aplicados'
              : 'Nenhuma prospecção cadastrada'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <button
              onClick={handleNewProspection}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Criar Primeira Prospecção
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredProspections.map((prospection) => (
            <div
              key={prospection.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-gray-800">
                      {prospection.nome_cliente}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${prospectionStatusColors[prospection.status]}`}>
                      {prospectionStatusLabels[prospection.status]}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${prospectionProbabilidadeColors[prospection.probabilidade]}`}>
                      {prospectionProbabilidadeLabels[prospection.probabilidade]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {prospection.telefone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone size={16} className="text-gray-400" />
                        <span>{prospection.telefone}</span>
                      </div>
                    )}
                    {prospection.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail size={16} className="text-gray-400" />
                        <span>{prospection.email}</span>
                      </div>
                    )}
                    {prospection.tipo_obra && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 size={16} className="text-gray-400" />
                        <span>{prospection.tipo_obra}</span>
                      </div>
                    )}
                    {prospection.valor_estimado && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign size={16} className="text-gray-400" />
                        <span>
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(prospection.valor_estimado)}
                        </span>
                      </div>
                    )}
                    {prospection.proximo_followup && (
                      <div className={`flex items-center gap-2 text-sm ${
                        isFollowUpOverdue(prospection.proximo_followup)
                          ? 'text-red-600 font-semibold'
                          : isFollowUpToday(prospection.proximo_followup)
                          ? 'text-orange-600 font-semibold'
                          : 'text-gray-600'
                      }`}>
                        <Calendar size={16} className={
                          isFollowUpOverdue(prospection.proximo_followup)
                            ? 'text-red-400'
                            : isFollowUpToday(prospection.proximo_followup)
                            ? 'text-orange-400'
                            : 'text-gray-400'
                        } />
                        <span>
                          Follow-up: {new Date(prospection.proximo_followup).toLocaleDateString('pt-BR')}
                          {isFollowUpOverdue(prospection.proximo_followup) && ' (ATRASADO)'}
                          {isFollowUpToday(prospection.proximo_followup) && ' (HOJE)'}
                        </span>
                      </div>
                    )}
                  </div>

                  {prospection.descricao && (
                    <p className="text-sm text-gray-600 mb-2">
                      {prospection.descricao.length > 150
                        ? `${prospection.descricao.substring(0, 150)}...`
                        : prospection.descricao}
                    </p>
                  )}

                  <div className="text-xs text-gray-400">
                    Criado em: {new Date(prospection.created_at).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(prospection.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(prospection)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar prospecção"
                  >
                    <Edit size={18} />
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(prospection.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir prospecção"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProspectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProspection(null);
        }}
        prospection={selectedProspection}
        onSave={loadProspections}
      />

      <TemplateImportModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <QuickWorkModal
        isOpen={isQuickWorkModalOpen}
        onClose={() => setIsQuickWorkModalOpen(false)}
        onWorkCreated={loadProspections}
      />
    </div>
  );
}
