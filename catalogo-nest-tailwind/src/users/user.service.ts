import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { MSG } from '../common/respostas';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private supabaseService: SupabaseService) { }

  // Nome e nível vêm da tabela public.users (consultada com a service_role), e não de
  // claims do JWT: assim o nível não depende de como o hook do Supabase preenche o token.
  async buscarPerfil(userId: string): Promise<{ nome?: string; nivel?: number } | null> {
    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('nome, nivel')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar perfil do usuário:', error.message);
      return null;
    }
    return data;
  }

  async createUser(email: string, senha: string, nome: string) {
    //criar no auth.users (client descartável: o signUp pode devolver uma sessão, e ela
    //não pode ficar guardada no client administrativo compartilhado)
    const auth = this.supabaseService.criarClienteAuth();
    const { data: authData, error: authError } = await auth.auth.signUp({
      email: email,
      password: senha,
    });

    if (authError) {
      console.error('Erro ao criar usuário no auth:', authError.message);
      throw new BadRequestException(MSG.USUARIO_CRIAR_FALHOU);
    }

    if (!authData.user) {
      throw new Error('Falha ao gerar o ID do usuário na autenticação.');
    }

    const userId = authData.user.id;

    // A linha em public.users já é criada pelo trigger on_auth_user_created
    // (handle_new_user, com nivel 99 e nome 'user'). Aqui só preenchemos o nome:
    // um INSERT colidiria com a linha do trigger (23505) e disparava o rollback.
    const { data: publicData, error: publicError } = await this.supabaseService.client
      .from('users')
      .update({ nome })
      .eq('id', userId)
      .select('id, nome, email')
      .single();

    if (publicError) {
      console.error('Erro ao gravar usuário em public.users:', publicError.message);
      // desfaz o registro no auth para não deixar conta sem perfil
      await this.supabaseService.client.auth.admin.deleteUser(userId);
      await this.supabaseService.client.from('users').delete().eq('id', userId);
      throw new BadRequestException(MSG.USUARIO_CRIAR_FALHOU);
    }

    return publicData;
  }
}
