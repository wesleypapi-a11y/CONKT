import { useState, useEffect } from 'react';
import { XCircle, Save, TrendingUp, Calendar, FileText, BarChart3, DollarSign } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Work {
  id: string;
  name: string;
  client_id: string;
}

interface PortalAccess {
  id: string;
  client_id: string;
  work_id: string;
  access_email: string;
  is_active: boolean;
  modules_enabled: {
    budget: boolean;
    schedule: boolean;
    diary: boolean;
    dashboard: boolean;
    cashflow: boolean;
  };
}

interface ClientPortalAccessModalProps {
  access: PortalAccess | null;
  clients: Client[];
  works: Work[];
  onClose: () => void;
  onSave: () => void;
}

export default function ClientPortalAccessModal({
  access,
  clients,
  works,
  onClose,
  onSave
}: ClientPortalAccessModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [filteredWorks, setFilteredWorks] = useState<Work[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    work_id: '',
    access_email: '',
    access_password: '',
    is_active: true,
    modules: {
      budget: true,
      schedule: true,
      diary: true,
      dashboard: true,
      cashflow: true
    }
  });

  useEffect(() => {
    if (access) {
      setFormData({
        client_id: access.client_id,
        work_id: access.work_id,
        access_email: access.access_email,
        access_password: '',
        is_active: access.is_active,
        modules: access.modules_enabled
      });
    }
  }, [access]);

  useEffect(() => {
    if (formData.client_id) {
      const clientWorks = works.filter(w => w.client_id === formData.client_id);
      setFilteredWorks(clientWorks);

      if (!clientWorks.find(w => w.id === formData.work_id)) {
        setFormData(prev => ({ ...prev, work_id: '' }));
      }
    } else {
      setFilteredWorks([]);
    }
  }, [formData.client_id, works]);

  const handleSave = async () => {
    if (!formData.client_id || !formData.work_id || !formData.access_email) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (!access && !formData.access_password) {
      alert('Defina uma senha para o novo acesso');
      return;
    }

    setSaving(true);

    try {
      const dataToSave: any = {
        client_id: formData.client_id,
        work_id: formData.work_id,
        access_email: formData.access_email,
        is_active: formData.is_active,
        modules_enabled: formData.modules,
        created_by: user?.id
      };

      if (formData.access_password) {
        dataToSave.access_password = formData.access_password;
      }

      if (access) {
        const { error } = await supabase
          .from('client_portal_access')
          .update(dataToSave)
          .eq('id', access.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_portal_access')
          .insert([dataToSave]);

        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar acesso: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {access ? 'Editar Acesso ao Portal' : 'Novo Acesso ao Portal'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              >
                <option value="">Selecione um cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Obra *
              </label>
              <select
                value={formData.work_id}
                onChange={(e) => setFormData({ ...formData, work_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={saving || !formData.client_id}
              >
                <option value="">Selecione uma obra</option>
                {filteredWorks.map(work => (
                  <option key={work.id} value={work.id}>{work.name}</option>
                ))}
              </select>
              {!formData.client_id && (
                <p className="text-xs text-gray-500 mt-1">Selecione um cliente primeiro</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email de Acesso *
            </label>
            <input
              type="email"
              value={formData.access_email}
              onChange={(e) => setFormData({ ...formData, access_email: e.target.value })}
              placeholder="email@cliente.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {access ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha *'}
            </label>
            <input
              type="password"
              value={formData.access_password}
              onChange={(e) => setFormData({ ...formData, access_password: e.target.value })}
              placeholder={access ? 'Digite para alterar a senha' : 'Digite a senha'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta senha será usada pelo cliente para acessar o portal
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                disabled={saving}
              />
              <span className="text-sm font-medium text-gray-700">Acesso Ativo</span>
            </label>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Módulos Habilitados</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.modules.budget}
                  onChange={(e) => setFormData({
                    ...formData,
                    modules: { ...formData.modules, budget: e.target.checked }
                  })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                />
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Orçamento</p>
                  <p className="text-xs text-gray-500">Visualizar orçado vs realizado</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.modules.schedule}
                  onChange={(e) => setFormData({
                    ...formData,
                    modules: { ...formData.modules, schedule: e.target.checked }
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  disabled={saving}
                />
                <Calendar className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Cronograma</p>
                  <p className="text-xs text-gray-500">Visualizar andamento do cronograma</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.modules.diary}
                  onChange={(e) => setFormData({
                    ...formData,
                    modules: { ...formData.modules, diary: e.target.checked }
                  })}
                  className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                  disabled={saving}
                />
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Diário de Obras</p>
                  <p className="text-xs text-gray-500">Acompanhar os registros diários</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.modules.dashboard}
                  onChange={(e) => setFormData({
                    ...formData,
                    modules: { ...formData.modules, dashboard: e.target.checked }
                  })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                  disabled={saving}
                />
                <BarChart3 className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Dashboard</p>
                  <p className="text-xs text-gray-500">Visão geral da obra em gráficos</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.modules.cashflow}
                  onChange={(e) => setFormData({
                    ...formData,
                    modules: { ...formData.modules, cashflow: e.target.checked }
                  })}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                  disabled={saving}
                />
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Fluxo de Caixa</p>
                  <p className="text-xs text-gray-500">Ver receitas e despesas da obra</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-md text-white flex items-center gap-2 font-medium"
            style={{ backgroundColor: arcoColors.primary.blue }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
