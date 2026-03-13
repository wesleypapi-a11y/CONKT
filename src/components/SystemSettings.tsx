import { useEffect, useState } from 'react';
import { Calendar, Building2, AlertTriangle, CheckCircle, Clock, TrendingUp, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Empresa } from '../types/empresa';

export default function SystemSettings() {
  const { profile } = useAuth();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmpresaData();
  }, [profile?.empresa_id]);

  const loadEmpresaData = async () => {
    if (!profile?.empresa_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', profile.empresa_id)
        .single();

      if (error) throw error;
      setEmpresa(data);
    } catch (error) {
      console.error('Erro ao carregar dados da empresa:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const calculatePercentageElapsed = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const today = new Date().getTime();

    const total = end - start;
    const elapsed = today - start;

    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  const getStatusInfo = (daysRemaining: number, status: string) => {
    if (status === 'bloqueada') {
      return {
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        badgeColor: 'bg-red-100 text-red-800',
        icon: AlertTriangle,
        label: 'Bloqueada',
        message: 'Seu acesso está bloqueado. Entre em contato com o suporte.'
      };
    }

    if (status === 'inativa') {
      return {
        color: 'gray',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-900',
        badgeColor: 'bg-gray-100 text-gray-800',
        icon: AlertTriangle,
        label: 'Inativa',
        message: 'Sua licença está inativa.'
      };
    }

    if (daysRemaining < 0) {
      return {
        color: 'red',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        badgeColor: 'bg-red-100 text-red-800',
        icon: AlertTriangle,
        label: 'Expirada',
        message: 'Sua licença expirou. Renove agora para continuar usando o sistema.'
      };
    }

    if (daysRemaining <= 15) {
      return {
        color: 'orange',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-900',
        badgeColor: 'bg-orange-100 text-orange-800',
        icon: AlertTriangle,
        label: 'Atenção',
        message: 'Sua licença está próxima do vencimento. Renove para evitar interrupções.'
      };
    }

    if (daysRemaining <= 30) {
      return {
        color: 'yellow',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-900',
        badgeColor: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
        label: 'Aviso',
        message: 'Sua licença vence em breve. Programe a renovação.'
      };
    }

    return {
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-900',
      badgeColor: 'bg-green-100 text-green-800',
      icon: CheckCircle,
      label: 'Ativa',
      message: 'Sua licença está ativa e em dia.'
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <Shield size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Informações de Sistema
        </h3>
        <p className="text-gray-500">
          Nenhuma empresa vinculada ao seu perfil.
        </p>
      </div>
    );
  }

  const daysRemaining = calculateDaysRemaining(empresa.data_fim_vigencia);
  const percentageElapsed = calculatePercentageElapsed(empresa.data_inicio_vigencia, empresa.data_fim_vigencia);
  const statusInfo = getStatusInfo(daysRemaining, empresa.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Informações do Sistema</h2>
          <p className="text-sm text-gray-500">Vigência e status da sua licença</p>
        </div>
      </div>

      <div className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2 rounded-xl p-6 shadow-sm`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <StatusIcon size={32} className={statusInfo.textColor} />
            <div>
              <h3 className="text-xl font-bold text-gray-900">{empresa.nome_fantasia}</h3>
              <p className="text-sm text-gray-600">{empresa.razao_social}</p>
            </div>
          </div>
          <span className={`${statusInfo.badgeColor} px-3 py-1 rounded-full text-sm font-semibold`}>
            {statusInfo.label}
          </span>
        </div>

        <p className={`${statusInfo.textColor} font-medium mb-6`}>
          {statusInfo.message}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Data de Início</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatDate(empresa.data_inicio_vigencia)}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Data de Término</span>
            </div>
            <p className="text-lg font-bold text-gray-900">{formatDate(empresa.data_fim_vigencia)}</p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Dias Restantes</span>
            </div>
            <p className={`text-lg font-bold ${
              daysRemaining < 0 ? 'text-red-600' :
              daysRemaining <= 15 ? 'text-orange-600' :
              daysRemaining <= 30 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {daysRemaining < 0 ? 'Expirado' : `${daysRemaining} dias`}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Progresso da Vigência</span>
            </div>
            <span className="text-sm font-bold text-gray-900">{percentageElapsed.toFixed(1)}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                percentageElapsed < 70 ? 'bg-green-500' :
                percentageElapsed < 85 ? 'bg-yellow-500' :
                percentageElapsed < 95 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${percentageElapsed}%` }}
            />
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Início</span>
            <span>Término</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalhes da Empresa</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">CNPJ</label>
            <p className="text-gray-900 font-medium mt-1">{empresa.cnpj}</p>
          </div>

          {empresa.telefone && (
            <div>
              <label className="text-sm font-medium text-gray-600">Telefone</label>
              <p className="text-gray-900 font-medium mt-1">{empresa.telefone}</p>
            </div>
          )}

          {empresa.email && (
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <p className="text-gray-900 font-medium mt-1">{empresa.email}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600">Status da Licença</label>
            <p className="text-gray-900 font-medium mt-1 capitalize">{empresa.status}</p>
          </div>
        </div>
      </div>

      {(daysRemaining <= 30 && daysRemaining > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Renovação de Licença</h4>
              <p className="text-blue-800 text-sm mb-3">
                Para garantir acesso contínuo ao sistema e evitar interrupções nos seus trabalhos,
                entre em contato com nossa equipe para renovar sua licença antes do vencimento.
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                Solicitar Renovação
              </button>
            </div>
          </div>
        </div>
      )}

      {daysRemaining < 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-red-900 mb-2">Licença Expirada</h4>
              <p className="text-red-800 text-sm mb-3">
                Sua licença expirou há {Math.abs(daysRemaining)} dias.
                O acesso ao sistema pode ser limitado ou bloqueado.
                Entre em contato urgentemente para regularizar sua situação.
              </p>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                Renovar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
