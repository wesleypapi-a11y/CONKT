import { useState, useEffect } from 'react';
import { Image, Upload, Save, LogIn, Menu as MenuIcon, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useAlert } from '../hooks/useAlert';

interface AppearancePreferences {
  logo_login: string | null;
  logo_menu: string | null;
  logo_inicio: string | null;
}

export default function AppearanceSettings() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [savingLogin, setSavingLogin] = useState(false);
  const [savingMenu, setSavingMenu] = useState(false);
  const [savingInicio, setSavingInicio] = useState(false);

  const [preferences, setPreferences] = useState<AppearancePreferences>({
    logo_login: null,
    logo_menu: null,
    logo_inicio: null,
  });

  const [previewLogin, setPreviewLogin] = useState<string | null>(null);
  const [previewMenu, setPreviewMenu] = useState<string | null>(null);
  const [previewInicio, setPreviewInicio] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('appearance_preferences')
        .select('logo_login, logo_menu, logo_inicio')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          logo_login: data.logo_login || null,
          logo_menu: data.logo_menu || null,
          logo_inicio: data.logo_inicio || null,
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar preferências:', error);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: (value: string | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      showAlert('Apenas arquivos PNG, JPG e JPEG são permitidos', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = async (
    preview: string | null,
    fieldName: 'logo_login' | 'logo_menu' | 'logo_inicio',
    prefix: string,
    setSaving: (value: boolean) => void,
    setPreview: (value: string | null) => void
  ) => {
    if (!preview) return;

    setSaving(true);
    try {
      const blob = await fetch(preview).then(r => r.blob());
      const fileExt = blob.type.split('/')[1];
      const fileName = `${prefix}-${user?.id}-${Date.now()}.${fileExt}`;

      if (preferences[fieldName]) {
        const oldFileName = preferences[fieldName]!.split('/').pop();
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

      const updateData = {
        user_id: user!.id,
        [fieldName]: data.publicUrl,
      };

      const { error } = await supabase
        .from('appearance_preferences')
        .upsert(updateData, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPreferences({ ...preferences, [fieldName]: data.publicUrl });
      setPreview(null);
      showAlert('Imagem salva com sucesso!', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      showAlert('Erro ao salvar imagem', 'error');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const LogoUploadSection = ({
    title,
    description,
    icon: Icon,
    preview,
    currentImage,
    onUpload,
    onSave,
    saving,
  }: {
    title: string;
    description: string;
    icon: any;
    preview: string | null;
    currentImage: string | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    saving: boolean;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <Icon size={24} className="text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {(preview || currentImage) && (
            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
              <img
                src={preview || currentImage || ''}
                alt={title}
                className="max-h-24 object-contain"
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
              onChange={onUpload}
            />
          </label>

          {preview && (
            <button
              onClick={onSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Salvando...' : 'Salvar Imagem'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Image size={28} className="text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aparência</h2>
          <p className="text-sm text-gray-500">Personalize a identidade visual do sistema</p>
        </div>
      </div>

      <LogoUploadSection
        title="Logo Login"
        description="Imagem exibida na tela de login"
        icon={LogIn}
        preview={previewLogin}
        currentImage={preferences.logo_login}
        onUpload={(e) => handleImageUpload(e, setPreviewLogin)}
        onSave={() => handleSaveImage(previewLogin, 'logo_login', 'login', setSavingLogin, setPreviewLogin)}
        saving={savingLogin}
      />

      <LogoUploadSection
        title="Logo Menu"
        description="Imagem exibida no topo do menu, acima da foto de perfil"
        icon={MenuIcon}
        preview={previewMenu}
        currentImage={preferences.logo_menu}
        onUpload={(e) => handleImageUpload(e, setPreviewMenu)}
        onSave={() => handleSaveImage(previewMenu, 'logo_menu', 'menu', setSavingMenu, setPreviewMenu)}
        saving={savingMenu}
      />

      <LogoUploadSection
        title="Logo Início"
        description="Imagem exibida na página quando o usuário clica em 'Início'"
        icon={Home}
        preview={previewInicio}
        currentImage={preferences.logo_inicio}
        onUpload={(e) => handleImageUpload(e, setPreviewInicio)}
        onSave={() => handleSaveImage(previewInicio, 'logo_inicio', 'inicio', setSavingInicio, setPreviewInicio)}
        saving={savingInicio}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Importante:</strong> Após salvar cada alteração, a página será recarregada automaticamente para aplicar as mudanças visuais.
        </p>
      </div>
    </div>
  );
}
