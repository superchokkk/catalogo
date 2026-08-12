import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserService {
  constructor(private supabaseService: SupabaseService) { }

  async createUser(userData: any) {
    const { data, error } = await this.supabaseService.client
      .from('users')
      .insert([userData]);
    if (error) throw error;

    return data;
  }

  async registrarNoBanco(nome: string, email: string, senha: string) {
    const { data: authData, error: authError } = await this.supabaseService.client.auth.signUp({
      email: email,
      password: senha,
    });

    if (authError) {
      throw new BadRequestException(`Erro no Supabase Auth: ${authError.message}`);
    }if (!authData.user) {
      throw new BadRequestException('Não foi possível gerar o usuário no Auth.');
    }

   const { data: dbData, error: dbError } = await this.supabaseService.client
      .from('usuarios')
      .insert([
        {
          id: authData.user.id,
          nome: nome,
          email: email,
          nivel: 0,
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
  }
}