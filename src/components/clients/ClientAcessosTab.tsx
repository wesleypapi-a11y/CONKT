import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { arcoColors } from '../../styles/colors';
import { supabase } from '../../lib/supabase';
import { ClientPermission, AVAILABLE_MODULES } from '../../types/client';

interface ClientAcessosTabProps {
  clientId: string | null;
  onNavigateHome?: () => void;
}

export default function ClientAcessosTab({ clientId}: ClientAcessosTabProps) {
  const [permissions, setPermissions] = useState<Map<string, ClientPermission>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectAllPortal, setSelectAllPortal] = useState(false);
  const [selectAllMobile, setSelectAllMobile] = useState(false);

  useEffect(() => {
    if (clientId) {
      loadPermissions();
    }
  }, [clientId]);

  const loadPermissions = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_permissions')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;

      const permMap = new Map<string, ClientPermission>();
      data?.forEach(perm => {
        permMap.set(perm.module_name, perm);
      });

      setPermissions(permMap);

      const allPortalChecked = AVAILABLE_MODULES.every(mod => permMap.get(mod)?.portal_access);
      const allMobileChecked = AVAILABLE_MODULES.every(mod => permMap.get(mod)?.mobile_access);
      setSelectAllPortal(allPortalChecked);
      setSelectAllMobile(allMobileChecked);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (moduleName: string, type: 'portal' | 'mobile') => {
    if (!clientId) return;

    setLoading(true);
    try {
      const existing = permissions.get(moduleName);

      if (existing) {
        const updates = type === 'portal'
          ? { portal_access: !existing.portal_access }
          : { mobile_access: !existing.mobile_access };

        const { error } = await supabase
          .from('client_permissions')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_permissions')
          .insert({
            client_id: clientId,
            module_name: moduleName,
            portal_access: type === 'portal',
            mobile_access: type === 'mobile'
          });

        if (error) throw error;
      }

      await loadPermissions();
    } catch (error) {
      console.error('Error toggling permission:', error);
      alert('Erro ao atualizar permissão');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = async (type: 'portal' | 'mobile') => {
    if (!clientId) return;

    const newValue = type === 'portal' ? !selectAllPortal : !selectAllMobile;

    setLoading(true);
    try {
      for (const moduleName of AVAILABLE_MODULES) {
        const existing = permissions.get(moduleName);

        if (existing) {
          const updates = type === 'portal'
            ? { portal_access: newValue }
            : { mobile_access: newValue };

          const { error } = await supabase
            .from('client_permissions')
            .update(updates)
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('client_permissions')
            .insert({
              client_id: clientId,
              module_name: moduleName,
              portal_access: type === 'portal' ? newValue : false,
              mobile_access: type === 'mobile' ? newValue : false
            });

          if (error) throw error;
        }
      }

      await loadPermissions();
    } catch (error) {
      console.error('Error toggling all permissions:', error);
      alert('Erro ao atualizar permissões');
    } finally {
      setLoading(false);
    }
  };

  if (!clientId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Salve o cliente primeiro para configurar acessos
      </div>
    );
  }

  const splitModules = () => {
    const perColumn = Math.ceil(AVAILABLE_MODULES.length / 3);
    return [
      AVAILABLE_MODULES.slice(0, perColumn),
      AVAILABLE_MODULES.slice(perColumn, perColumn * 2),
      AVAILABLE_MODULES.slice(perColumn * 2)
    ];
  };

  const columns = splitModules();

  return (
    <div className="space-y-4 relative">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h3 className="text-sm font-semibold text-blue-900 mb-1.5">
          Configuração de acesso ao Portal do Cliente e App móvel do Cliente
        </h3>
        <p className="text-xs text-blue-800 mb-1">
          <strong>Usuários para acesso</strong>
        </p>
        <p className="text-xs text-blue-700">
          Os acessos do cliente poderão ser cadastrados na aba{' '}
          <span className="font-semibold">Contato</span>
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Permissões</h3>
        <p className="text-xs text-gray-600 mb-3">
          Selecione os módulos que o cliente poderá ter acesso
        </p>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Portal do Cliente</span>
              <button
                onClick={() => toggleSelectAll('portal')}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: selectAllPortal ? arcoColors.primary.blue : '#d1d5db',
                    backgroundColor: selectAllPortal ? arcoColors.primary.blue : 'white'
                  }}
                >
                  {selectAllPortal && <Check className="w-4 h-4 text-gray-900" />}
                </div>
                Selecionar tudo
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1.5">
              {columns.map((columnModules, colIndex) => (
                <div key={colIndex} className="space-y-1">
                  {columnModules.map((moduleName) => {
                    const perm = permissions.get(moduleName);
                    const isChecked = perm?.portal_access || false;

                    return (
                      <label
                        key={moduleName}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded transition-colors"
                      >
                        <button
                          type="button"
                          onClick={() => togglePermission(moduleName, 'portal')}
                          disabled={loading}
                          className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-50"
                          style={{
                            borderColor: isChecked ? arcoColors.primary.blue : '#d1d5db',
                            backgroundColor: isChecked ? arcoColors.primary.blue : 'white'
                          }}
                        >
                          {isChecked && <Check className="w-4 h-4 text-gray-900" />}
                        </button>
                        <span className="text-sm text-gray-700">{moduleName}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Aplicativo Móvel</span>
            <button
              onClick={() => toggleSelectAll('mobile')}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <div
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: selectAllMobile ? arcoColors.primary.blue : '#d1d5db',
                  backgroundColor: selectAllMobile ? arcoColors.primary.blue : 'white'
                }}
              >
                {selectAllMobile && <Check className="w-4 h-4 text-gray-900" />}
              </div>
              Selecionar tudo
            </button>
          </div>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1.5">
            {columns.map((columnModules, colIndex) => (
              <div key={colIndex} className="space-y-1">
                {columnModules.map((moduleName) => {
                  const perm = permissions.get(moduleName);
                  const isChecked = perm?.mobile_access || false;

                  return (
                    <label
                      key={moduleName}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => togglePermission(moduleName, 'mobile')}
                        disabled={loading}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors disabled:opacity-50"
                        style={{
                          borderColor: isChecked ? arcoColors.primary.blue : '#d1d5db',
                          backgroundColor: isChecked ? arcoColors.primary.blue : 'white'
                        }}
                      >
                        {isChecked && <Check className="w-4 h-4 text-gray-900" />}
                      </button>
                      <span className="text-sm text-gray-700">{moduleName}</span>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
