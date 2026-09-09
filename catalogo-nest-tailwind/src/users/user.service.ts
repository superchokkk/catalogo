import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private supabaseService: SupabaseService) { }

  async createUser(email: string, senha: string, nome: string) {
    //criar no auth.users
    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email: email,
      password: senha,
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    if (!authData.user) {
      throw new Error('Falha ao gerar o ID do usuário na autenticação.');
    }

    const userId = authData.user.id;

    //criar no public.users
    const { data: publicData, error: publicError } = await this.supabaseService.client
      .from('users')
      .upsert([{
        id: userId,
        email: email,
        nome: nome
      }])
      .select()
      .single();

    if (publicError) {
      throw new BadRequestException(publicError.message);
    }

    return publicData;
  }



  /*async registrarNoBanco(nome: string, email: string, senha: string) {
    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email: email,
      password: senha,
    });
  
    if (authError) {
      throw new BadRequestException(`Erro no Supabase Auth: ${authError.message}`);
    } if (!authData.user) {
      throw new BadRequestException('Não foi possível gerar o usuário no Auth.');
    }
  
    const { data: dbData, error: dbError } = await this.supabaseService.client
      .from('users')
      .upsert([
        {
          id: authData.user.id,
          nome: nome,
          email: email,
          nivel: 99,
        },
      ])
      .select()
      .single();
  
    if (dbError) {
      throw new BadRequestException(`Erro ao salvar perfil público: ${dbError.message}`);
    }
  
    return {
      message: 'Usuário criado com sucesso!',
      user: dbData,
    };
  }*/
}