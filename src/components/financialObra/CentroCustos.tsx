import { useState, useEffect } from 'react';
import { FolderTree, Plus, Search, X, CreditCard as Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface CostCenterModalData {
  nome: string;
  codigo: string;
  descricao: string;
}

export function CentroCustos() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [filteredCenters, setFilteredCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CostCenterModalData>({
    nome: '',
    codigo: '',
    descricao: ''
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadCostCenters();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [costCenters, searchTerm]);

  const loadCostCenters = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('financial_cost_centers')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('codigo');

      if (error) throw error;

      setCostCenters(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar centros de custo', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...costCenters];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cc =>
        cc.nome.toLowerCase().includes(term) ||
        (cc.codigo && cc.codigo.toLowerCase().includes(term))
      );
    }

    setFilteredCenters(filtered);
  };

  const handleSave = async () => {
    try {
      if (!formData.nome) {
        showAlert('Preencha o nome do centro de custo', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const centerData = {
        empresa_id: empresaId,
        nome: formData.nome,
        codigo: formData.codigo || null,
        descricao: formData.descricao || null,
        created_by: user?.id
      };

      if (editingCenter) {
        const { error } = await supabase
          .from('financial_cost_centers')
          .update(centerData)
          .eq('id', editingCenter.id);

        if (error) throw error;
        showAlert('Centro de custo atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_cost_centers')
          .insert(centerData);

        if (error) throw error;
        showAlert('Centro de custo criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingCenter(null);
      resetForm();
      loadCostCenters();
    } catch (error: any) {
      showAlert('Erro ao salvar centro de custo', 'error');
      console.error(error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('financial_cost_centers')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showAlert(`Centro de custo ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`, 'success');
      loadCostCenters();
    } catch (error: any) {
      showAlert('Erro ao alterar status', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este centro de custo?')) return;

    try {
      const { error } = await supabase
        .from('financial_cost_centers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Centro de custo excluído com sucesso', 'success');
      loadCostCenters();
    } catch (error: any) {
      showAlert('Erro ao excluir centro de custo', 'error');
      console.error(error);
    }
  };

  const openModal = (center?: any) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        nome: center.nome,
        codigo: center.codigo || '',
        descricao: center.descricao || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      codigo: '',
      descricao: ''
    });
    setEditingCenter(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Centros de Custo</h2>
          <p className="text-gray-600 mt-1">Classificação de despesas por área</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Novo Centro de Custo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
            >
              <X size={18} />
              Limpar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Descrição</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredCenters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhum centro de custo encontrado
                  </td>
                </tr>
              ) : (
                filteredCenters.map((cc) => (
                  <tr key={cc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{cc.codigo || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{cc.nome}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{cc.descricao || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(cc.id, cc.ativo)}
                        className="flex items-center gap-1"
                      >
                        {cc.ativo ? (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            <ToggleRight size={14} className="mr-1" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            <ToggleLeft size={14} className="mr-1" />
                            Inativo
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openModal(cc)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(cc.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCenter(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: CC-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Fundação"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o que este centro de custo engloba..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCenter(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingCenter ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  async function handleSave() {
    try {
      if (!formData.nome) {
        showAlert('Preencha o nome do centro de custo', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const centerData = {
        empresa_id: empresaId,
        nome: formData.nome,
        codigo: formData.codigo || null,
        descricao: formData.descricao || null,
        created_by: user?.id
      };

      if (editingCenter) {
        const { error } = await supabase
          .from('financial_cost_centers')
          .update(centerData)
          .eq('id', editingCenter.id);

        if (error) throw error;
        showAlert('Centro de custo atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('financial_cost_centers')
          .insert(centerData);

        if (error) throw error;
        showAlert('Centro de custo criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingCenter(null);
      resetForm();
      loadCostCenters();
    } catch (error: any) {
      showAlert('Erro ao salvar centro de custo', 'error');
      console.error(error);
    }
  }

  function openModal(center?: any) {
    if (center) {
      setEditingCenter(center);
      setFormData({
        nome: center.nome,
        codigo: center.codigo || '',
        descricao: center.descricao || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      nome: '',
      codigo: '',
      descricao: ''
    });
    setEditingCenter(null);
  }

  async function handleToggleActive(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('financial_cost_centers')
        .update({ ativo: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      showAlert(`Centro de custo ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`, 'success');
      loadCostCenters();
    } catch (error: any) {
      showAlert('Erro ao alterar status', 'error');
      console.error(error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este centro de custo?')) return;

    try {
      const { error } = await supabase
        .from('financial_cost_centers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Centro de custo excluído com sucesso', 'success');
      loadCostCenters();
    } catch (error: any) {
      showAlert('Erro ao excluir centro de custo', 'error');
      console.error(error);
    }
  }
}
