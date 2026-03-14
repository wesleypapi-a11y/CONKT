import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { arcoColors } from '../../styles/colors';
import { WorkContact } from '../../types/work';

interface WorkContatosTabProps {
  workId?: string;
  onNavigateHome?: () => void;
}

export default function WorkContatosTab({ workId}: WorkContatosTabProps) {
  const [contacts, setContacts] = useState<WorkContact[]>([]);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    mobile: '',
    email: '',
    observation: '',
    origin: 'Obra',
  });

  useEffect(() => {
    if (workId) {
      loadContacts();
    }
  }, [workId]);

  const loadContacts = async () => {
    if (!workId) return;

    try {
      const { data, error } = await supabase
        .from('work_contacts')
        .select('*')
        .eq('work_id', workId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleAddContact = async () => {
    if (!workId || !newContact.name) {
      alert('Preencha pelo menos o nome do contato');
      return;
    }

    try {
      const { error } = await supabase
        .from('work_contacts')
        .insert({
          work_id: workId,
          name: newContact.name,
          phone: newContact.phone,
          mobile: newContact.mobile,
          email: newContact.email,
          observation: newContact.observation,
          origin: newContact.origin,
        });

      if (error) throw error;

      setNewContact({
        name: '',
        phone: '',
        mobile: '',
        email: '',
        observation: '',
        origin: 'Obra',
      });

      loadContacts();
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Erro ao adicionar contato');
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      const { error } = await supabase
        .from('work_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Erro ao excluir contato');
    }
  };

  return (
    <div className="space-y-4 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={newContact.name}
            onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <input
            type="text"
            value={newContact.phone}
            onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input
            type="email"
            value={newContact.email}
            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
          <input
            type="text"
            value={newContact.mobile}
            onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observação</label>
          <input
            type="text"
            value={newContact.observation}
            onChange={(e) => setNewContact({ ...newContact, observation: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleAddContact}
          className="px-4 py-2 text-white rounded-md hover:opacity-90 transition-all flex items-center gap-2"
          style={{ backgroundColor: arcoColors.primary.blue }}
        >
          <Plus size={18} />
          Adicionar
        </button>
      </div>

      {workId && (
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">Contatos</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Origem
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Telefone
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Celular
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    E-mail
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Obs.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                      Nenhum contato cadastrado
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{contact.origin}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{contact.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{contact.phone || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{contact.mobile || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{contact.email || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {contact.observation || '-'}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
