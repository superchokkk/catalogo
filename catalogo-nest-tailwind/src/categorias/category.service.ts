import { ConflictException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MSG } from '../common/respostas';
import { CreateCategoryDto } from './category.dto';
import { normalizarNome } from './normalizar-nome';

// Código do Postgres para violação de índice único (nome repetido, sem diferenciar caixa).
const UNIQUE_VIOLATION = '23505';

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

  async criar(dto: CreateCategoryDto, userId: string) {
    const { data, error } = await this.supabaseService.client
      .from('categorias')
      .insert([{ nome: normalizarNome(dto.nome), ativo: dto.ativo ?? true, created_by: userId }])
      .select('id, nome, ativo')
      .single();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new ConflictException(MSG.CATEGORIA_DUPLICADA);
      throw error;
    }
    return data;
  }
}
