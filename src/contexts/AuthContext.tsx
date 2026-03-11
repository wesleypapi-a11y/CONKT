import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { JWTManager } from '../utils/jwtManager';

interface Profile {
  id: string;
  email: string;
  nome_completo: string;
  funcao?: string | null;
  telefone?: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, nome: string, userType: 'administrador' | 'colaborador' | 'cliente', avatarFile?: File) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (data: {
    nome_completo: string;
    funcao?: string;
    telefone?: string;
  }, avatarFile?: File) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
  prepareAuthHeader: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeout: NodeJS.Timeout;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    timeout = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 3000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const filePath = `${userId}/avatar-${timestamp}.${fileExt}`;

      const oldAvatarUrl = profile?.avatar_url;
      if (oldAvatarUrl) {
        try {
          const oldPath = oldAvatarUrl.split('/avatars/').pop();
          if (oldPath) {
            await supabase.storage.from('avatars').remove([oldPath]);
          }
        } catch (err) {
          console.warn('Could not delete old avatar:', err);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, nome: string, userType: 'administrador' | 'colaborador' | 'cliente', avatarFile?: File) => {
    const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return { error: signUpError };
    }

    if (newUser) {
      let avatarUrl = null;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile, newUser.id);
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUser.id,
          email,
          nome_completo: nome,
          funcao: userType === 'colaborador' ? 'Colaborador' : userType === 'administrador' ? 'Administrador' : 'Cliente',
          role: userType === 'administrador' ? 'admin' : 'user',
          avatar_url: avatarUrl,
          is_active: true,
        });

      if (profileError) {
        return { error: profileError };
      }
    }

    return { error: null };
  };

  const updateProfile = async (data: {
    nome_completo: string;
    funcao?: string;
    telefone?: string;
  }, avatarFile?: File) => {
    if (!user) return { error: new Error('Usuário não autenticado') };

    try {
      let avatarUrl = profile?.avatar_url;

      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar(avatarFile, user.id);
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl;
        } else {
          return { error: new Error('Erro ao fazer upload da foto. Tente novamente.') };
        }
      }

      const updateData: any = {
        nome_completo: data.nome_completo,
        updated_at: new Date().toISOString(),
      };

      if (data.funcao !== undefined) updateData.funcao = data.funcao;
      if (data.telefone !== undefined) updateData.telefone = data.telefone;
      if (avatarFile && avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }

      await fetchProfile(user.id);
      return { error: null };
    } catch (err: any) {
      console.error('Unexpected error in updateProfile:', err);
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const getValidToken = async (): Promise<string | null> => {
    return await JWTManager.getValidToken();
  };

  const prepareAuthHeader = async (): Promise<string | null> => {
    return await JWTManager.prepareAuthHeader();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, updateProfile, refreshProfile, getValidToken, prepareAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
