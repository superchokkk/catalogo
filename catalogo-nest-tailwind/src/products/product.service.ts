import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto, UpdateProductDto } from './product.dto';
import { validarImagens } from './image-validation';
import { MSG } from '../common/respostas';

@Injectable()
export class ProductService {
  constructor(private supabaseService: SupabaseService) { }

  // Garante que a categoria existe e está ativa; senão 400.
  private async validarCategoria(categoriaID: string) {
    const { data, error } = await this.supabaseService.client
      .from('categorias')
      .select('id')
      .eq('id', categoriaID)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.error('Erro ao validar categoria:', error.message);
      throw new InternalServerErrorException(MSG.CATEGORIA_VALIDAR_FALHOU);
    }
    if (!data) throw new BadRequestException(MSG.CATEGORIA_INVALIDA);
  }

  async getProductsWithImages() {
    const { data, error } = await this.supabaseService.client
      .from('produtos')
      .select(`
          id, nome, descricao, preco, preco_antigo, promocao, quantidade, status,
          created_at, updated_at, created_by, updated_by,
          categorias ( nome, ativo ),
          produto_imagens (
            id,
            url_path
          )
        `)
      .eq('status', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(({ categorias, ...produto }: any) => ({
      ...produto,
      // só o nome; categoria desativada ou ausente vira null
      categoria: categorias?.ativo ? categorias.nome : null,
      produto_imagens: produto.produto_imagens.map((img) => ({
        ...img,
        url_publica: img.url_path,
      })),
    }));
  }

  async createProductWithImages(productData: CreateProductDto, files: Array<Express.Multer.File>, userId: string) {
    // Confere o conteúdo real dos arquivos antes de gravar qualquer coisa
    const tipos = validarImagens(files);

    if (productData.categoriaID) await this.validarCategoria(productData.categoriaID);

    const { data: product, error: pError } = await this.supabaseService.client
      .from('produtos')
      .insert([{
        nome: productData.nome,
        descricao: productData.descricao,
        preco: productData.preco,
        status: true,
        ...(productData.categoriaID ? { categoriaID: productData.categoriaID } : {}),
        created_by: userId,
        updated_by: userId
      }])
      .select()
      .single();

    if (pError) {
      console.error('Erro ao criar produto:', pError.message);
      throw new InternalServerErrorException('Erro ao criar produto no banco.');
    }

    //imagens
    const imageUrls: { produto_id: string; url_path: string }[] = [];

    if (files && files.length > 0) {
      for (const [i, file] of files.entries()) {
        // extensão e contentType vêm do tipo detectado, nunca do nome/mimetype enviados
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${tipos[i].ext}`;
        const filePath = `produtos/${product.id}/${fileName}`;

        const { error: uError } = await this.supabaseService.client.storage
          .from('produtos-fotos')
          .upload(filePath, file.buffer, {
            contentType: tipos[i].mime,
            upsert: true
          });

        if (uError) throw uError;

        const { data: { publicUrl } } = this.supabaseService.client.storage
          .from('produtos-fotos')
          .getPublicUrl(filePath);

        imageUrls.push({
          produto_id: product.id,
          url_path: publicUrl
        });
      }

      //salvando ref. foto
      const { error: iError } = await this.supabaseService.client
        .from('produto_imagens')
        .insert(imageUrls);

      if (iError) throw iError;
    }

    return product;
  }

  async getProductsPromotion(id: string) {
    try {
      const { data, error } = await this.supabaseService.client
        .from('produtos')
        .select()
        .eq('id', id)
        .single();

      if (!data || data.length === 0) {
        return null;
      }

      if (data.promocao === true) {
        return {
          preco: data.preco,
          preco_antigo: data.preco_antigo
        }
      } else {
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error.message);
      throw new InternalServerErrorException('Erro interno ao buscar produto.');
    }
  }

  async updateProductWithImages(id: string, productData: UpdateProductDto, files: Array<Express.Multer.File>, urlsParaManter: string[], userId: string) {
    const tipos = validarImagens(files);

    // undefined mantém a categoria; null (campo vazio) remove; UUID troca
    if (productData.categoriaID) await this.validarCategoria(productData.categoriaID);

    // 1. Atualiza os dados do produto
    const { error: updateError } = await this.supabaseService.client.from('produtos').update({
      nome: productData.nome,
      descricao: productData.descricao,
      preco: productData.preco,
      preco_antigo: productData.preco_antigo ?? null,
      promocao: productData.promocao === true,
      ...(productData.categoriaID !== undefined ? { categoriaID: productData.categoriaID } : {}),
      updated_by: userId
    }).eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar produto:', updateError.message);
      throw new InternalServerErrorException(MSG.PRODUTO_ATUALIZAR_FALHOU);
    }

    // 2. Busca as imagens atuais no banco
    const { data: imagensAtuais, error: fetchImgError } = await this.supabaseService.client
      .from('produto_imagens')
      .select('id, url_path')
      .eq('produto_id', id);

    if (fetchImgError) throw new InternalServerErrorException('Erro ao buscar imagens no banco.');

    // Filtra as imagens que devem ser apagadas
    const imagensParaDeletar = imagensAtuais?.filter(
      (img) => !urlsParaManter.includes(img.url_path)
    );

    if (imagensParaDeletar && imagensParaDeletar.length > 0) {
      const pathsParaStorage: string[] = [];

      for (const img of imagensParaDeletar) {
        // Deleta do banco de dados
        await this.supabaseService.client.from('produto_imagens').delete().eq('id', img.id);

        // EXTRAÇÃO À PROVA DE FALHAS: Pega apenas o último fragmento da URL (o nome do arquivo)
        const fileName = img.url_path.split('/').pop()?.split('?')[0];

        if (fileName) {
          // Reconstrói o caminho idêntico ao do bucket: produtos/ID/arquivo.jpeg
          const caminhoExato = `produtos/${id}/${decodeURIComponent(fileName)}`;
          pathsParaStorage.push(caminhoExato);
        }
      }

      // Deleta os arquivos físicos do Bucket
      if (pathsParaStorage.length > 0) {
        await this.supabaseService.client.storage.from('produtos-fotos').remove(pathsParaStorage);
      }
    }

    // 3. Lógica de Upload de Novas Imagens
    if (files && files.length > 0) {
      const novasRefs: { produto_id: string; url_path: string }[] = [];

      for (const [i, file] of files.entries()) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${tipos[i].ext}`;
        const filePath = `produtos/${id}/${fileName}`;

        const { error: uError } = await this.supabaseService.client.storage
          .from('produtos-fotos')
          .upload(filePath, file.buffer, {
            contentType: tipos[i].mime,
            upsert: true
          });

        if (uError) {
          console.error('Erro no upload:', uError.message);
          throw new InternalServerErrorException('Erro ao enviar imagem.');
        }

        const { data: { publicUrl } } = this.supabaseService.client.storage
          .from('produtos-fotos')
          .getPublicUrl(filePath);

        novasRefs.push({ produto_id: id, url_path: publicUrl });
      }

      await this.supabaseService.client.from('produto_imagens').insert(novasRefs);
    }
  }

  async deleteProduct(id: string): Promise<void> {
    // 1. Busca as imagens vinculadas ao produto
    const { data: imagens, error: erroImagens } = await this.supabaseService.client
        .from('produto_imagens')
        .select('id, url_path')
        .eq('produto_id', id);

    if (erroImagens) {
      console.error('Erro ao buscar imagens do produto:', erroImagens.message);
      throw new InternalServerErrorException(MSG.PRODUTO_DELETAR_FALHOU);
    }

    if (imagens && imagens.length > 0) {
      const pathsParaStorage: string[] = [];

      for (const img of imagens) {
        // Pega apenas o nome do arquivo no final da URL
        const fileName = img.url_path.split('/').pop()?.split('?')[0];

        if (fileName) {
          // Monta a string exata para o bucket
          const caminhoExato = `produtos/${id}/${decodeURIComponent(fileName)}`;
          pathsParaStorage.push(caminhoExato);
        }
      }

      // 2. Apaga todas as imagens físicas de uma vez no Storage
      if (pathsParaStorage.length > 0) {
          const { error: erroBucket } = await this.supabaseService.client
              .storage
              .from('produtos-fotos')
              .remove(pathsParaStorage);

          if (erroBucket) {
              console.error('[Delete Produto] Erro no bucket:', erroBucket.message);
              // Não vamos travar a exclusão do produto se a foto falhar
          }
      }

      // 3. Deleta as referências na tabela produto_imagens
      await this.supabaseService.client.from('produto_imagens').delete().eq('produto_id', id);
    }

    // 4. Por fim, deleta o produto da tabela produtos
    const { error } = await this.supabaseService.client
        .from('produtos')
        .delete()
        .eq('id', id);

    if (error) {
      console.error('Erro ao deletar produto:', error.message);
      throw new InternalServerErrorException(MSG.PRODUTO_DELETAR_FALHOU);
    }
  }
}
