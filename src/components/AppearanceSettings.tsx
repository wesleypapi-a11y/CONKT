import { useState } from 'react';
import { Palette, Sun, Moon, Type, Layout, Zap, Eye, RotateCcw, Save, Check, Sparkles, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const colorPresets = [
  { name: 'Azul Oceano', primary: '#0066CC', secondary: '#00A8E8' },
  { name: 'Verde Floresta', primary: '#059669', secondary: '#10b981' },
  { name: 'Roxo Real', primary: '#7c3aed', secondary: '#a855f7' },
  { name: 'Laranja Solar', primary: '#ea580c', secondary: '#fb923c' },
  { name: 'Rosa Moderno', primary: '#db2777', secondary: '#ec4899' },
  { name: 'Azul Índigo', primary: '#4f46e5', secondary: '#6366f1' },
  { name: 'Ciano Tech', primary: '#0891b2', secondary: '#06b6d4' },
  { name: 'Vermelho Intenso', primary: '#dc2626', secondary: '#ef4444' }
];

export default function AppearanceSettings() {
  const { preferences, updatePreferences, savePreferences, resetToDefault } = useTheme();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePreferences();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      alert('Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Deseja restaurar as configurações padrão?')) {
      resetToDefault();
    }
  };

  const applyColorPreset = (preset: typeof colorPresets[0]) => {
    updatePreferences({
      primary_color: preset.primary,
      secondary_color: preset.secondary
    });
  };

  const getFontSizeClass = () => {
    const sizes = {
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg'
    };
    return sizes[preferences.font_size];
  };

  const getDensitySpacing = () => {
    const spacing = {
      compact: 'p-2',
      normal: 'p-4',
      comfortable: 'p-6'
    };
    return spacing[preferences.layout_density];
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles size={28} style={{ color: preferences.primary_color }} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Personalizar Aparência</h2>
            <p className="text-sm text-gray-500">Configure a interface do seu jeito</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium animate-pulse">
              <Check size={18} />
              Salvo!
            </div>
          )}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <Eye size={18} />
            Preview
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={18} />
            Restaurar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: preferences.primary_color }}
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              {preferences.theme === 'light' ? (
                <Sun size={24} style={{ color: preferences.primary_color }} />
              ) : (
                <Moon size={24} style={{ color: preferences.primary_color }} />
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tema</h3>
                <p className="text-sm text-gray-500">Escolha entre claro ou escuro</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => updatePreferences({ theme: 'light' })}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  preferences.theme === 'light'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {preferences.theme === 'light' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-gray-900" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <Sun size={32} className="text-yellow-500" />
                  <div className="font-semibold text-gray-900">Claro</div>
                </div>
              </button>

              <button
                onClick={() => updatePreferences({ theme: 'dark' })}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  preferences.theme === 'dark'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {preferences.theme === 'dark' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check size={14} className="text-gray-900" />
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <Moon size={32} className="text-blue-400" />
                  <div className="font-semibold text-gray-900">Escuro</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <Type size={24} style={{ color: preferences.primary_color }} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tipografia</h3>
                <p className="text-sm text-gray-500">Ajuste o tamanho do texto</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-3">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => updatePreferences({ font_size: size })}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    preferences.font_size === size
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {preferences.font_size === size && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-gray-900" />
                    </div>
                  )}
                  <div className="text-center">
                    <Type size={size === 'small' ? 20 : size === 'medium' ? 28 : 36} className="mx-auto text-gray-700 mb-1" />
                    <div className="font-semibold text-gray-900 text-xs capitalize">
                      {size === 'small' ? 'Pequeno' : size === 'medium' ? 'Médio' : 'Grande'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <Palette size={24} style={{ color: preferences.primary_color }} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Cores do Sistema</h3>
              <p className="text-sm text-gray-500">Personalize a paleta de cores</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cor Primária
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={preferences.primary_color}
                  onChange={(e) => updatePreferences({ primary_color: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={preferences.primary_color.toUpperCase()}
                    onChange={(e) => updatePreferences({ primary_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#0066CC"
                  />
                  <div className="text-xs text-gray-500 mt-1">Botões e destaques</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Cor Secundária
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={preferences.secondary_color}
                  onChange={(e) => updatePreferences({ secondary_color: e.target.value })}
                  className="w-16 h-16 rounded-lg cursor-pointer border-2 border-gray-200 shadow-sm"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={preferences.secondary_color.toUpperCase()}
                    onChange={(e) => updatePreferences({ secondary_color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm uppercase"
                    placeholder="#FF6B35"
                  />
                  <div className="text-xs text-gray-500 mt-1">Acentos e badges</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Paletas Predefinidas
            </label>
            <div className="grid grid-cols-4 gap-3">
              {colorPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => applyColorPreset(preset)}
                  className="group relative p-3 rounded-lg border-2 border-gray-200 hover:border-gray-400 transition-all hover:shadow-md"
                  title={preset.name}
                >
                  <div className="flex gap-2">
                    <div
                      className="flex-1 h-10 rounded"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="flex-1 h-10 rounded"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-2 text-center font-medium truncate">
                    {preset.name}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <Layout size={24} style={{ color: preferences.primary_color }} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Densidade do Layout</h3>
                <p className="text-sm text-gray-500">Controle o espaçamento</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-3">
              {(['compact', 'normal', 'comfortable'] as const).map((density) => (
                <button
                  key={density}
                  onClick={() => updatePreferences({ layout_density: density })}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    preferences.layout_density === density
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {preferences.layout_density === density && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-gray-900" />
                    </div>
                  )}
                  <div className="text-center space-y-2">
                    <div className="flex flex-col gap-1 items-center">
                      <div className={`w-full bg-gray-300 rounded ${density === 'compact' ? 'h-1.5' : density === 'normal' ? 'h-2' : 'h-2.5'}`} />
                      <div className={`w-full bg-gray-300 rounded ${density === 'compact' ? 'h-1.5' : density === 'normal' ? 'h-2' : 'h-2.5'}`} />
                      <div className={`w-full bg-gray-300 rounded ${density === 'compact' ? 'h-1.5' : density === 'normal' ? 'h-2' : 'h-2.5'}`} />
                    </div>
                    <div className="font-semibold text-gray-900 text-xs">
                      {density === 'compact' ? 'Compacto' : density === 'normal' ? 'Normal' : 'Confortável'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3">
              <Zap size={24} style={{ color: preferences.primary_color }} />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Animações</h3>
                <p className="text-sm text-gray-500">Efeitos visuais e transições</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">Habilitar Animações</div>
                <div className="text-sm text-gray-500">Transições suaves em toda a aplicação</div>
              </div>
              <button
                onClick={() => updatePreferences({ animations_enabled: !preferences.animations_enabled })}
                className={`relative w-16 h-8 rounded-full transition-colors ${
                  preferences.animations_enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                    preferences.animations_enabled ? 'translate-x-8' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye size={24} style={{ color: preferences.primary_color }} />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Preview das Configurações</h3>
                  <p className="text-sm text-gray-500">Visualize antes de salvar</p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className={`${getDensitySpacing()} space-y-4`}>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200" style={{ backgroundColor: preferences.primary_color }}>
                  <h4 className="font-bold text-white">Header Exemplo</h4>
                </div>
                <div className={`${getDensitySpacing()}`}>
                  <p className={`text-gray-700 mb-3 ${getFontSizeClass()}`}>
                    Este é um exemplo de texto com suas configurações aplicadas. Observe o tamanho da fonte e o espaçamento.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      className={`px-4 py-2 rounded-lg text-white font-medium ${preferences.animations_enabled ? 'hover:opacity-90 transition-opacity' : ''}`}
                      style={{ backgroundColor: preferences.primary_color }}
                    >
                      Botão Primário
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg text-white font-medium ${preferences.animations_enabled ? 'hover:opacity-90 transition-opacity' : ''}`}
                      style={{ backgroundColor: preferences.secondary_color }}
                    >
                      Botão Secundário
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full" style={{ backgroundColor: preferences.primary_color + '20' }}>
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <Sparkles size={24} style={{ color: preferences.primary_color }} />
                    </div>
                  </div>
                  <div>
                    <div className={`font-semibold text-gray-900 ${getFontSizeClass()}`}>
                      Card de Exemplo
                    </div>
                    <div className="text-xs text-gray-500">
                      Densidade: {preferences.layout_density === 'compact' ? 'Compacto' : preferences.layout_density === 'normal' ? 'Normal' : 'Confortável'}
                    </div>
                  </div>
                </div>
                <p className={`text-gray-600 mb-3 ${getFontSizeClass()}`}>
                  Tamanho da fonte: {preferences.font_size === 'small' ? 'Pequeno' : preferences.font_size === 'medium' ? 'Médio' : 'Grande'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: preferences.primary_color + '20', color: preferences.primary_color }}>
                    Badge Primário
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: preferences.secondary_color + '20', color: preferences.secondary_color }}>
                    Badge Secundário
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  {preferences.theme === 'light' ? <Sun size={24} className="text-yellow-600" /> : <Moon size={24} className="text-blue-600" />}
                  <div>
                    <p className={`text-gray-800 font-semibold ${getFontSizeClass()}`}>
                      Tema: {preferences.theme === 'light' ? 'Claro' : 'Escuro'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Animações: {preferences.animations_enabled ? 'Habilitadas' : 'Desabilitadas'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full mb-2" style={{ backgroundColor: preferences.primary_color }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <Type size={20} className="text-gray-900" />
                    </div>
                  </div>
                  <p className={`font-semibold text-white ${getFontSizeClass()}`}>Item 1</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full mb-2" style={{ backgroundColor: preferences.secondary_color }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <Layout size={20} className="text-gray-900" />
                    </div>
                  </div>
                  <p className={`font-semibold text-white ${getFontSizeClass()}`}>Item 2</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full mb-2" style={{ backgroundColor: preferences.primary_color }}>
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette size={20} className="text-gray-900" />
                    </div>
                  </div>
                  <p className={`font-semibold text-gray-900 ${getFontSizeClass()}`}>Item 3</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
