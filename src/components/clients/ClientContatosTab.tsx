import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, HelpCircle } from 'lucide-react';
import { conktColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { ClientContact } from '../../types/client';

interface ClientContatosTabProps {
  clientId: string | null;
  onNavigateHome?: () => void;
}

export default function ClientContatosTab({ clientId}: ClientContatosTabProps) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    mobile: '',
    email: '',
    observation: ''
  });

  useEffect(() => {
    if (clientId) {
      loadContacts();
    }
  }, [clientId]);

  const loadContacts = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!clientId || !newContact.name.trim()) {
      alert('Nome do contato é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_contacts')
        .insert({
          client_id: clientId,
          ...newContact,
          is_main: contacts.length === 0
        });

      if (error) throw error;

      setNewContact({
        name: '',
        phone: '',
        mobile: '',
        email: '',
        observation: ''
      });

      await loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Erro ao adicionar contato');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Deseja realmente excluir este contato?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      await loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Erro ao excluir contato');
    } finally {
      setLoading(false);
    }
  };

  const toggleAccess = async (contactId: string, currentAccess: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('client_contacts')
        .update({ has_access: !currentAccess })
        .eq('id', contactId);

      if (error) throw error;
      await loadContacts();
    } catch (error) {
      console.error('Error updating access:', error);
      alert('Erro ao atualizar acesso');
    } finally {
      setLoading(false);
    }
  };

  if (!clientId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o cliente primeiro para adicionar contatos
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="Nome do contato"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="text"
              value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="(00) 0000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
            <input
              type="text"
              value={newContact.mobile}
              onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="contato@email.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
            <input
              type="text"
              value={newContact.observation}
              onChange={(e) => setNewContact({ ...newContact, observation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
              placeholder="Observações sobre o contato"
            />
          </div>
        </div>

        <button
          onClick={handleAddContact}
          disabled={loading || !newContact.name.trim()}
          className="px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: conktColors.primary.blue }}
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-700">Contatos</h3>
        </div>

        {loading && contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Carregando...</div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Nenhum contato cadastrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Celular
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Obs.
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1">
                      Acesso
                      <HelpCircle className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {contact.name}
                      {contact.is_main && (
                        <span className="ml-2 text-xs text-blue-600 font-medium">Principal</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.mobile || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.email || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{contact.observation || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAccess(contact.id, contact.has_access)}
                        disabled={loading}
                        className="inline-flex items-center justify-center w-6 h-6 rounded border-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        style={{
                          borderColor: contact.has_access ? conktColors.primary.blue : '#d1d5db',
                          backgroundColor: contact.has_access ? conktColors.primary.blue : 'white'
                        }}
                      >
                        {contact.has_access && <Check className="w-4 h-4 text-gray-900" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
