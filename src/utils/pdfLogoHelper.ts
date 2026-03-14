import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

const DEFAULT_LOGO_PATH = '/Sem_titulo-removebg-previewsemf.png';

export async function getCurrentUserEmpresaId(): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('empresa_id')
      .eq('id', user.id)
      .maybeSingle();

    return profile?.empresa_id || null;
  } catch (error) {
    console.error('Erro ao buscar empresa_id do usuário:', error);
    return null;
  }
}

export async function getCompanyLogo(empresaId: string | null | undefined): Promise<string> {
  if (!empresaId) {
    return DEFAULT_LOGO_PATH;
  }

  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('logo_menu')
      .eq('id', empresaId)
      .maybeSingle();

    if (error) throw error;

    return data?.logo_menu || DEFAULT_LOGO_PATH;
  } catch (error) {
    console.error('Erro ao buscar logo da empresa:', error);
    return DEFAULT_LOGO_PATH;
  }
}

export async function addLogoToPdf(
  doc: jsPDF,
  x: number = 15,
  y: number = 10,
  width: number = 60,
  height: number = 20
): Promise<void> {
  try {
    const empresaId = await getCurrentUserEmpresaId();
    const logoPath = await getCompanyLogo(empresaId);

    const logoBase64 = await fetch(logoPath)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));

    doc.addImage(logoBase64, 'PNG', x, y, width, height);
  } catch (error) {
    console.error('Erro ao adicionar logo ao PDF:', error);

    try {
      const fallbackLogo = await fetch(DEFAULT_LOGO_PATH)
        .then(res => res.blob())
        .then(blob => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }));

      doc.addImage(fallbackLogo, 'PNG', x, y, width, height);
    } catch (fallbackError) {
      console.error('Erro ao carregar logo fallback:', fallbackError);
    }
  }
}
