import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  static from(arg0: string) {
      throw new Error('Method not implemented.');
  }
  public client: SupabaseClient;
  private readonly supabaseUrl: string;
  private readonly anonKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_PRIVATE_KEY') || '';
    this.anonKey = this.configService.get<string>('SUPABASE_ANON_KEY') || '';

    // Client administrativo (service_role), compartilhado. NUNCA use-o em operações
    // que gravam sessão (signIn*, verifyOtp, signUp): a sessão ficaria guardada nele
    // e as próximas consultas ao banco passariam a ir com o token daquele usuário.
    this.client = createClient(this.supabaseUrl, supabaseKey);
  }

  // Client DESCARTÁVEL para fluxos de autenticação. Crie um por operação e deixe-o
  // ser coletado: a sessão que ele guardar morre junto, sem vazar para outras requisições.
  // O que isola é ser um objeto novo; persistSession:false sozinho não isola.
  criarClienteAuth(): SupabaseClient {
    if (!this.anonKey) {
      throw new Error('SUPABASE_ANON_KEY não definida: não é possível criar o client de autenticação.');
    }
    return createClient(this.supabaseUrl, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}