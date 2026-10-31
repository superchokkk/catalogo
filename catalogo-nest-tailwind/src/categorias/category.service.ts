import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { MSG } from '../common/respostas';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';
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

  async alterar(id: string, dto: UpdateCategoryDto) {
    const campos: { nome?: string; ativo?: boolean } = {};
    if (dto.nome !== undefined) campos.nome = normalizarNome(dto.nome);
    if (dto.ativo !== undefined) campos.ativo = dto.ativo;

    const tabela = this.supabaseService.client.from('categorias');
    // Corpo vazio: nada a gravar, só confirma que a categoria existe.
    const consulta = Object.keys(campos).length > 0 ? tabela.update(campos) : tabela.select('id, nome, ativo');
    const { data, error } = await consulta.eq('id', id).select('id, nome, ativo').maybeSingle();

    if (error) {
      if (error.code === UNIQUE_VIOLATION) throw new ConflictException(MSG.CATEGORIA_DUPLICADA);
      throw error;
    }
    if (!data) throw new NotFoundException(MSG.CATEGORIA_NAO_ENCONTRADA);
    return data;
  }

  // Confirmação antes de excluir: quantos produtos perderiam a categoria. Não altera nada.
  async contarProdutos(id: string) {
    const { data: categoria, error: cError } = await this.supabaseService.client
      .from('categorias')
      .select('id, nome')
      .eq('id', id)
      .maybeSingle();

    if (cError) throw cError;
    if (!categoria) throw new NotFoundException(MSG.CATEGORIA_NAO_ENCONTRADA);

    const { count, error } = await this.supabaseService.client
      .from('produtos')
      .select('id', { count: 'exact', head: true })
      .eq('categoriaID', id);

    if (error) throw error;
    return { categoria, produtosAfetados: count ?? 0 };
  }
}
