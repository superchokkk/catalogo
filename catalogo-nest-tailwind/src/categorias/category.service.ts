import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CategoryService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // Público: só categorias ativas, em ordem alfabética. Não existe listarTodas().
  async listarAtivas() {
    const { data, error } = await this.supabaseService.client
      .from('categorias')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) throw error;
    return data ?? [];
  }
}
