import { useState, useEffect } from 'react';
import { Users, UserPlus, Search, CreditCard as Edit, Trash2, DollarSign, Calendar, X, TrendingUp, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAlert } from '../../hooks/useAlert';
import { getEmpresaContext } from '../../utils/empresaContext';

interface Employee {
  id: string;
  nome_completo: string;
  email?: string;
  telefone?: string;
  cargo_funcao?: string;
  tipo_vinculo?: string;
  valor_mensal: number;
  valor_diario: number;
  data_inicio?: string;
  data_fim?: string;
  status: string;
  observacoes?: string;
  created_at: string;
}

interface Payment {
  id: string;
  employee_id: string;
  data_pagamento: string;
  valor: number;
  competencia?: string;
  observacao?: string;
  status: string;
}

interface EmployeeFormData {
  nome_completo: string;
  email: string;
  telefone: string;
  cargo_funcao: string;
  tipo_vinculo: string;
  valor_mensal: string;
  valor_diario: string;
  data_inicio: string;
  status: string;
  observacoes: string;
}

const TIPOS_VINCULO = ['CLT', 'PJ', 'Autonomo', 'Freelancer', 'Estagiario'];

export function CompanyEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ativo');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [formData, setFormData] = useState<EmployeeFormData>({
    nome_completo: '',
    email: '',
    telefone: '',
    cargo_funcao: '',
    tipo_vinculo: 'CLT',
    valor_mensal: '',
    valor_diario: '',
    data_inicio: new Date().toISOString().split('T')[0],
    status: 'ativo',
    observacoes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    data_pagamento: new Date().toISOString().split('T')[0],
    valor: '',
    competencia: '',
    observacao: '',
    status: 'pago'
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [employees, searchTerm, filterStatus]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const { empresaId } = await getEmpresaContext();

      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('company_employees')
        .select('*')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
        .order('nome_completo');

      if (error) throw error;

      setEmployees(data || []);
    } catch (error: any) {
      showAlert('Erro ao carregar colaboradores', 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async (employeeId: string) => {
    try {
      const { empresaId } = await getEmpresaContext();

      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data, error } = await supabase
        .from('company_employee_payments')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('employee_id', employeeId)
        .is('deleted_at', null)
        .order('data_pagamento', { ascending: false });

      if (error) throw error;

      setPayments(data || []);
    } catch (error: any) {
      console.error(error);
    }
  };

  const applyFilters = () => {
    let filtered = [...employees];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nome_completo.toLowerCase().includes(term) ||
        (e.cargo_funcao && e.cargo_funcao.toLowerCase().includes(term)) ||
        (e.email && e.email.toLowerCase().includes(term))
      );
    }

    if (filterStatus !== 'todos') {
      filtered = filtered.filter(e => e.status === filterStatus);
    }

    setFilteredEmployees(filtered);
  };

  const calculateStats = () => {
    const ativos = employees.filter(e => e.status === 'ativo');
    const totalFolha = ativos.reduce((sum, e) => sum + Number(e.valor_mensal), 0);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const competencia = `${String(currentMonth).padStart(2, '0')}/${currentYear}`;

    return {
      totalAtivos: ativos.length,
      totalFolha,
      competencia
    };
  };

  const handleSave = async () => {
    try {
      if (!formData.nome_completo || !formData.cargo_funcao) {
        showAlert('Preencha os campos obrigatórios', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const employeeData = {
        empresa_id: empresaId,
        nome_completo: formData.nome_completo,
        email: formData.email || null,
        telefone: formData.telefone || null,
        cargo_funcao: formData.cargo_funcao,
        tipo_vinculo: formData.tipo_vinculo,
        valor_mensal: Number(formData.valor_mensal) || 0,
        valor_diario: Number(formData.valor_diario) || 0,
        data_inicio: formData.data_inicio || null,
        status: formData.status,
        observacoes: formData.observacoes || null,
        created_by: user?.id
      };

      if (editingEmployee) {
        const { error } = await supabase
          .from('company_employees')
          .update(employeeData)
          .eq('id', editingEmployee.id);

        if (error) throw error;
        showAlert('Colaborador atualizado com sucesso', 'success');
      } else {
        const { error } = await supabase
          .from('company_employees')
          .insert(employeeData);

        if (error) throw error;
        showAlert('Colaborador criado com sucesso', 'success');
      }

      setShowModal(false);
      setEditingEmployee(null);
      resetForm();
      loadEmployees();
    } catch (error: any) {
      showAlert('Erro ao salvar colaborador', 'error');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este colaborador?')) return;

    try {
      const { error } = await supabase
        .from('company_employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      showAlert('Colaborador excluído com sucesso', 'success');
      loadEmployees();
    } catch (error: any) {
      showAlert('Erro ao excluir colaborador', 'error');
      console.error(error);
    }
  };

  const handleInactivate = async (employee: Employee) => {
    if (!confirm(`Deseja inativar o colaborador ${employee.nome_completo}?`)) return;

    try {
      const { error } = await supabase
        .from('company_employees')
        .update({
          status: 'inativo',
          data_fim: new Date().toISOString().split('T')[0]
        })
        .eq('id', employee.id);

      if (error) throw error;

      showAlert('Colaborador inativado com sucesso', 'success');
      loadEmployees();
    } catch (error: any) {
      showAlert('Erro ao inativar colaborador', 'error');
      console.error(error);
    }
  };

  const openModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        nome_completo: employee.nome_completo,
        email: employee.email || '',
        telefone: employee.telefone || '',
        cargo_funcao: employee.cargo_funcao || '',
        tipo_vinculo: employee.tipo_vinculo || 'CLT',
        valor_mensal: String(employee.valor_mensal || ''),
        valor_diario: String(employee.valor_diario || ''),
        data_inicio: employee.data_inicio || '',
        status: employee.status,
        observacoes: employee.observacoes || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const openPaymentModal = async (employee: Employee) => {
    setSelectedEmployee(employee);
    await loadPayments(employee.id);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedEmployee) return;

    try {
      if (!paymentForm.valor) {
        showAlert('Informe o valor do pagamento', 'error');
        return;
      }

      const { empresaId } = await getEmpresaContext();
      if (!empresaId) {
        showAlert('Usuário sem empresa vinculada', 'error');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const paymentData = {
        empresa_id: empresaId,
        employee_id: selectedEmployee.id,
        data_pagamento: paymentForm.data_pagamento,
        valor: Number(paymentForm.valor),
        competencia: paymentForm.competencia || null,
        observacao: paymentForm.observacao || null,
        status: paymentForm.status,
        created_by: user?.id
      };

      const { error } = await supabase
        .from('company_employee_payments')
        .insert(paymentData);

      if (error) throw error;

      showAlert('Pagamento registrado com sucesso', 'success');
      resetPaymentForm();
      await loadPayments(selectedEmployee.id);
    } catch (error: any) {
      showAlert('Erro ao registrar pagamento', 'error');
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_completo: '',
      email: '',
      telefone: '',
      cargo_funcao: '',
      tipo_vinculo: 'CLT',
      valor_mensal: '',
      valor_diario: '',
      data_inicio: new Date().toISOString().split('T')[0],
      status: 'ativo',
      observacoes: ''
    });
    setEditingEmployee(null);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      data_pagamento: new Date().toISOString().split('T')[0],
      valor: '',
      competencia: '',
      observacao: '',
      status: 'pago'
    });
  };

  const stats = calculateStats();

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getTotalPaidToEmployee = () => {
    return payments
      .filter(p => p.status === 'pago')
      .reduce((sum, p) => sum + Number(p.valor), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Colaboradores</h2>
          <p className="text-gray-600 mt-1">Gestão dos colaboradores da empresa</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <UserPlus size={18} />
          Adicionar Colaborador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Colaboradores Ativos</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalAtivos}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total da Folha Mensal</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalFolha)}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Competência Atual</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{stats.competencia}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Calendar className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Registros</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{employees.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingUp className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, cargo ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Nome</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Função</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tipo de Vínculo</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Valor Mensal</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    Nenhum colaborador encontrado
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700 font-medium">{employee.nome_completo}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{employee.cargo_funcao || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{employee.tipo_vinculo || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-800">
                      {formatCurrency(Number(employee.valor_mensal))}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        employee.status === 'ativo'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {employee.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openPaymentModal(employee)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          title="Registrar Pagamento"
                        >
                          Pagamento
                        </button>
                        <button
                          onClick={() => openModal(employee)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        {employee.status === 'ativo' && (
                          <button
                            onClick={() => handleInactivate(employee)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            title="Inativar"
                          >
                            Inativar
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(employee.id)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                {editingEmployee ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEmployee(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome_completo}
                  onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo / Função <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cargo_funcao}
                    onChange={(e) => setFormData({ ...formData, cargo_funcao: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Engenheiro Civil"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Vínculo
                  </label>
                  <select
                    value={formData.tipo_vinculo}
                    onChange={(e) => setFormData({ ...formData, tipo_vinculo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {TIPOS_VINCULO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Mensal
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_mensal}
                    onChange={(e) => setFormData({ ...formData, valor_mensal: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Diário
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_diario}
                    onChange={(e) => setFormData({ ...formData, valor_diario: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Informações adicionais..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingEmployee(null);
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
                {editingEmployee ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                Pagamentos - {selectedEmployee.nome_completo}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedEmployee(null);
                  resetPaymentForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Cargo/Função</p>
                    <p className="text-sm font-medium text-gray-800">{selectedEmployee.cargo_funcao || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Valor Fixo Mensal</p>
                    <p className="text-sm font-medium text-gray-800">{formatCurrency(Number(selectedEmployee.valor_mensal))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Recebido</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(getTotalPaidToEmployee())}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-4">Registrar Novo Pagamento</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data do Pagamento
                    </label>
                    <input
                      type="date"
                      value={paymentForm.data_pagamento}
                      onChange={(e) => setPaymentForm({ ...paymentForm, data_pagamento: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={paymentForm.valor}
                      onChange={(e) => setPaymentForm({ ...paymentForm, valor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0,00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Competência
                    </label>
                    <input
                      type="text"
                      value={paymentForm.competencia}
                      onChange={(e) => setPaymentForm({ ...paymentForm, competencia: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 01/2026"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={paymentForm.status}
                      onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pago">Pago</option>
                      <option value="pendente">Pendente</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observação
                    </label>
                    <input
                      type="text"
                      value={paymentForm.observacao}
                      onChange={(e) => setPaymentForm({ ...paymentForm, observacao: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSavePayment}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Registrar Pagamento
                </button>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-800 mb-4">Histórico de Pagamentos</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Data</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Competência</th>
                        <th className="text-right py-2 px-3 text-sm font-semibold text-gray-700">Valor</th>
                        <th className="text-center py-2 px-3 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Obs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-sm text-gray-500">
                            Nenhum pagamento registrado
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr key={payment.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-sm text-gray-700">
                              {new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-700">{payment.competencia || '-'}</td>
                            <td className="py-2 px-3 text-sm text-right font-semibold text-green-600">
                              {formatCurrency(Number(payment.valor))}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                payment.status === 'pago'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {payment.status === 'pago' ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600">{payment.observacao || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
