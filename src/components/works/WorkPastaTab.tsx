import { useEffect, useState } from 'react';
import { FolderOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Client } from '../../types/client';
import ClientAnexosTab from '../clients/ClientAnexosTab';

interface WorkPastaTabProps {
  clientId?: string;
  onNavigateHome?: () => void;
}

export default function WorkPastaTab({ clientId}: WorkPastaTabProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      loadClient();
    } else {
      setLoading(false);
    }
  }, [clientId]);

  const loadClient = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error loading client:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FolderOpen size={48} className="mb-4 text-gray-900" />
        <p>Selecione um cliente para visualizar a pasta da obra</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <FolderOpen size={48} className="mb-4 text-gray-900" />
        <p>Cliente não encontrado</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-sm text-blue-800">
          <strong>Pasta da obra:</strong> Esta aba exibe os anexos do cliente {client.name}.
          Todos os arquivos gerenciados aqui são compartilhados com o cadastro do cliente.
        </p>
      </div>
      <ClientAnexosTab clientId={clientId} />
    </div>
  );
}
