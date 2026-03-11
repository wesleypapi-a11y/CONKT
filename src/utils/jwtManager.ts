import { supabase } from '../lib/supabase';

interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string;
}

export class JWTManager {
  private static TOKEN_REFRESH_THRESHOLD = 5 * 60; // 5 minutos antes de expirar
  private static refreshPromise: Promise<string | null> | null = null;

  /**
   * Valida se um token JWT tem formato válido (xxx.yyy.zzz)
   */
  static isValidFormat(token: string | null | undefined): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Remove prefixo "Bearer " se presente
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

    // JWT deve ter exatamente 3 partes separadas por ponto
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Cada parte deve ter conteúdo
    return parts.every(part => part.length > 0);
  }

  /**
   * Decodifica o payload de um JWT (sem validar assinatura)
   */
  static decodePayload(token: string): JWTPayload | null {
    try {
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
      const parts = cleanToken.split('.');

      if (parts.length !== 3) {
        return null;
      }

      // Decodifica a parte do payload (segunda parte)
      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('[JWTManager] Erro ao decodificar token:', error);
      return null;
    }
  }

  /**
   * Verifica se um token está expirado ou próximo de expirar
   */
  static isExpiredOrExpiring(token: string, thresholdSeconds?: number): boolean {
    const payload = this.decodePayload(token);

    if (!payload || !payload.exp) {
      console.warn('[JWTManager] Token sem campo exp');
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    const threshold = thresholdSeconds ?? this.TOKEN_REFRESH_THRESHOLD;

    // Retorna true se já expirou OU se vai expirar em menos de X segundos
    return payload.exp <= (now + threshold);
  }

  /**
   * Verifica se o token ainda não é válido (nbf - not before)
   */
  static isNotYetValid(token: string): boolean {
    const payload = this.decodePayload(token);

    if (!payload) {
      return false;
    }

    // Se não tem nbf, considera válido
    if (!payload.iat && !payload.exp) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    // Verifica se o token foi emitido no futuro (problema de clock)
    if (payload.iat && payload.iat > now + 60) {
      console.error('[JWTManager] Token emitido no futuro! Problema de clock detectado.');
      return true;
    }

    return false;
  }

  /**
   * Obtém informações sobre o token
   */
  static getTokenInfo(token: string): {
    isValid: boolean;
    isExpired: boolean;
    expiresIn?: number;
    expiresAt?: Date;
    userId?: string;
  } {
    if (!this.isValidFormat(token)) {
      return { isValid: false, isExpired: true };
    }

    const payload = this.decodePayload(token);

    if (!payload) {
      return { isValid: false, isExpired: true };
    }

    const now = Math.floor(Date.now() / 1000);
    const isExpired = payload.exp ? payload.exp <= now : false;
    const expiresIn = payload.exp ? payload.exp - now : undefined;
    const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;

    return {
      isValid: true,
      isExpired,
      expiresIn,
      expiresAt,
      userId: payload.sub
    };
  }

  /**
   * Obtém o token atual da sessão do Supabase
   */
  static async getCurrentToken(): Promise<string | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[JWTManager] Erro ao obter sessão:', error);
        return null;
      }

      if (!session || !session.access_token) {
        console.warn('[JWTManager] Nenhuma sessão ativa');
        return null;
      }

      return session.access_token;
    } catch (error) {
      console.error('[JWTManager] Erro ao obter token:', error);
      return null;
    }
  }

  /**
   * Força refresh do token
   */
  static async refreshToken(): Promise<string | null> {
    // Se já existe um refresh em andamento, retorna a mesma promise
    if (this.refreshPromise) {
      console.log('[JWTManager] Refresh já em andamento, aguardando...');
      return this.refreshPromise;
    }

    this.refreshPromise = this._doRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  private static async _doRefresh(): Promise<string | null> {
    try {
      console.log('[JWTManager] Iniciando refresh do token...');

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('[JWTManager] Erro ao fazer refresh:', error);

        // Se o refresh falhar, limpa a sessão
        await this.clearInvalidSession();
        return null;
      }

      if (!data.session || !data.session.access_token) {
        console.warn('[JWTManager] Refresh não retornou sessão válida');
        await this.clearInvalidSession();
        return null;
      }

      console.log('[JWTManager] ✅ Token renovado com sucesso');
      return data.session.access_token;
    } catch (error) {
      console.error('[JWTManager] Erro inesperado ao fazer refresh:', error);
      await this.clearInvalidSession();
      return null;
    }
  }

  /**
   * Limpa sessão inválida e força novo login
   */
  static async clearInvalidSession(): Promise<void> {
    console.warn('[JWTManager] Limpando sessão inválida...');

    try {
      await supabase.auth.signOut();

      // Limpa storage manualmente também
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();

      console.log('[JWTManager] Sessão limpa. Usuário precisa fazer login novamente.');
    } catch (error) {
      console.error('[JWTManager] Erro ao limpar sessão:', error);
    }
  }

  /**
   * Obtém token válido (faz refresh se necessário)
   */
  static async getValidToken(): Promise<string | null> {
    const currentToken = await this.getCurrentToken();

    if (!currentToken) {
      console.warn('[JWTManager] Nenhum token disponível');
      return null;
    }

    // Valida formato
    if (!this.isValidFormat(currentToken)) {
      console.error('[JWTManager] Token com formato inválido');
      await this.clearInvalidSession();
      return null;
    }

    // Verifica se está próximo de expirar
    if (this.isExpiredOrExpiring(currentToken)) {
      console.log('[JWTManager] Token expirado ou próximo de expirar, fazendo refresh...');
      return await this.refreshToken();
    }

    // Verifica problema de clock
    if (this.isNotYetValid(currentToken)) {
      console.error('[JWTManager] Token ainda não válido (problema de clock)');
      await this.clearInvalidSession();
      return null;
    }

    return currentToken;
  }

  /**
   * Formata token com prefixo Bearer
   */
  static formatAuthHeader(token: string): string {
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    return `Bearer ${cleanToken}`;
  }

  /**
   * Valida e prepara token para uso em requisição
   */
  static async prepareAuthHeader(): Promise<string | null> {
    const token = await this.getValidToken();

    if (!token) {
      return null;
    }

    return this.formatAuthHeader(token);
  }
}
