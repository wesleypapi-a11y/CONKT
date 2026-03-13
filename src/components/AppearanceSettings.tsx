import { useState, useEffect } from 'react';
import { Image, Upload, Save, Check, Palette } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAlert } from '../hooks/useAlert';

interface AppearancePreferences {
  logo_url: string | null;
  home_image_url: string | null;
  menu_bg_color: string;
  menu_text_color: string;
}

export default function AppearanceSettings() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingHome, setSavingHome] = useState(false);
  const [savingColors, setSavingColors] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHome, setUploadingHome] = useState(false);

  const [preferences, setPreferences] = useState<AppearancePreferences>({
    logo_url: null,
    home_image_url: null,
    menu_bg_color: '#1e3a8a',
    menu_text_color: '#ffffff',
  });

  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [previewHome, setPreviewHome] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appearance_preferences')
        .select('logo_url, home_image_url, menu_bg_color, menu_text_color')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          logo_url: data.logo_url || null,
          home_image_url: data.home_image_url || null,
          menu_bg_color: data.menu_bg_color || '#1e3a8a',
          menu_text_color: data.menu_text_color || '#ffffff',
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar preferências:', error);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Apenas arquivos PNG, JPG, JPEG e SVG são permitidos', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewLogo(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!previewLogo) return;

    setSavingLogo(true);
    try {
      const blob = await fetch(previewLogo).then(r => r.blob());
      const fileExt = blob.type.split('/')[1];
      const fileName = `logo-${user?.id}-${Date.now()}.${fileExt}`;

      if (preferences.logo_url) {
        const oldFileName = preferences.logo_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('company-branding').remove([oldFileName]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('company-branding')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-branding')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('appearance_preferences')
        .upsert({
          user_id: user!.id,
          logo_url: data.publicUrl,
          home_image_url: preferences.home_image_url,
          menu_bg_color: preferences.menu_bg_color,
          menu_text_color: preferences.menu_text_color,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences({ ...preferences, logo_url: data.publicUrl });
      setPreviewLogo(null);
      showAlert('Logo salva com sucesso!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showAlert('Erro ao salvar logo', 'error');
      console.error(error);
    } finally {
      setSavingLogo(false);
    }
  };

  const handleHomeImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Apenas arquivos PNG, JPG e JPEG são permitidos', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewHome(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveHome = async () => {
    if (!previewHome) return;

    setSavingHome(true);
    try {
      const blob = await fetch(previewHome).then(r => r.blob());
      const fileExt = blob.type.split('/')[1];
      const fileName = `home-${user?.id}-${Date.now()}.${fileExt}`;

      if (preferences.home_image_url) {
        const oldFileName = preferences.home_image_url.split('/').pop();
        if (oldFileName) {
          await supabase.storage.from('company-branding').remove([oldFileName]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('company-branding')
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-branding')
        .getPublicUrl(fileName);

      const { error } = await supabase
        .from('appearance_preferences')
        .upsert({
          user_id: user!.id,
          logo_url: preferences.logo_url,
          home_image_url: data.publicUrl,
          menu_bg_color: preferences.menu_bg_color,
          menu_text_color: preferences.menu_text_color,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences({ ...preferences, home_image_url: data.publicUrl });
      setPreviewHome(null);
      showAlert('Imagem da página inicial salva com sucesso!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showAlert('Erro ao salvar imagem', 'error');
      console.error(error);
    } finally {
      setSavingHome(false);
    }
  };

  const handleSaveColors = async () => {
    if (!user) return;

    setSavingColors(true);
    try {
      const { error } = await supabase
        .from('appearance_preferences')
        .upsert({
          user_id: user.id,
          logo_url: preferences.logo_url,
          home_image_url: preferences.home_image_url,
          menu_bg_color: preferences.menu_bg_color,
          menu_text_color: preferences.menu_text_color,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      showAlert('Cores salvas com sucesso!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showAlert('Erro ao salvar cores', 'error');
      console.error(error);
    } finally {
      setSavingColors(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Palette size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aparência</h2>
          <p className="text-sm text-gray-500">Personalize a identidade visual do sistema</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <Image size={24} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Upload da Logo da Empresa</h3>
              <p className="text-sm text-gray-500">Imagem exibida no menu superior</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {(previewLogo || preferences.logo_url) && (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <img
                  src={previewLogo || preferences.logo_url || ''}
                  alt="Logo da empresa"
                  className="max-h-16 object-contain"
                />
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, JPEG ou SVG</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.svg"
                onChange={handleLogoUpload}
              />
            </label>

            {previewLogo && (
              <button
                onClick={handleSaveLogo}
                disabled={savingLogo}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {savingLogo ? 'Salvando...' : 'Salvar Logo'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <Image size={24} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Imagem da Página Inicial</h3>
              <p className="text-sm text-gray-500">Imagem exibida na tela de início</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {(previewHome || preferences.home_image_url) && (
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                <img
                  src={previewHome || preferences.home_image_url || ''}
                  alt="Imagem da página inicial"
                  className="max-h-32 object-contain"
                />
              </div>
            )}

            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-gray-400" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                </p>
                <p className="text-xs text-gray-500">PNG, JPG ou JPEG</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg"
                onChange={handleHomeImageUpload}
              />
            </label>

            {previewHome && (
              <button
                onClick={handleSaveHome}
                disabled={savingHome}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {savingHome ? 'Salvando...' : 'Salvar Imagem'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <Palette size={24} className="text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cores do Menu</h3>
              <p className="text-sm text-gray-500">Personalize as cores do menu lateral</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cor do Menu
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={preferences.menu_bg_color}
                  onChange={(e) => setPreferences({ ...preferences, menu_bg_color: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={preferences.menu_bg_color.toUpperCase()}
                    onChange={(e) => setPreferences({ ...preferences, menu_bg_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#1E3A8A"
                  />
                  <div className="text-xs text-gray-500 mt-1">Cor de fundo do menu lateral</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cor do Texto do Menu
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={preferences.menu_text_color}
                  onChange={(e) => setPreferences({ ...preferences, menu_text_color: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={preferences.menu_text_color.toUpperCase()}
                    onChange={(e) => setPreferences({ ...preferences, menu_text_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#FFFFFF"
                  />
                  <div className="text-xs text-gray-500 mt-1">Cor das letras do menu</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: preferences.menu_bg_color }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg"></div>
                <span
                  className="font-medium text-sm"
                  style={{ color: preferences.menu_text_color }}
                >
                  Exemplo de Item do Menu
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg"></div>
                <span
                  className="font-medium text-sm"
                  style={{ color: preferences.menu_text_color }}
                >
                  Outro Item do Menu
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">Preview das cores do menu</p>
          </div>

          <button
            onClick={handleSaveColors}
            disabled={savingColors}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 mt-6"
          >
            <Save size={18} />
            {savingColors ? 'Salvando...' : 'Salvar Cores'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Importante:</strong> Após salvar cada alteração, a página será recarregada automaticamente para aplicar as mudanças visuais.
        </p>
      </div>
    </div>
  );
}
