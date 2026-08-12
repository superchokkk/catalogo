import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProductService {
  constructor(private supabaseService: SupabaseService) { }

  async getProductsWithImages() {
    const { data, error } = await this.supabaseService.client
      .from('produtos')
      .select(`
          *,
          produto_imagens (
            id,
            url_path
          )
        `)
      .eq('status', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    //const { data: buckets } = await this.supabaseService.client.storage.listBuckets();
    return data.map((produto) => ({
      ...produto,
      produto_imagens: produto.produto_imagens.map((img) => ({
        ...img,
        url_publica: img.url_path,
      })),
    }));
  }

  async createProductWithImages(productData: any, files: Array<Express.Multer.File>, userId: string) {

    const { data: product, error: pError } = await this.supabaseService.client
      .from('produtos')
      .insert([{
        nome: productData.nome,
        descricao: productData.descricao,
        preco: parseFloat(productData.preco.toString().replace(',', '.')),
        status: true,
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
      for (const file of files) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `produtos/${product.id}/${fileName}`;

        const { error: uError } = await this.supabaseService.client.storage
          .from('produtos-fotos')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
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

  async updateProductWithImages(id: string, productData: any, files: Array<Express.Multer.File>, imagensManter: string[] | string, userId: string) {
    const precoAtual = parseFloat(productData.preco.toString().replace(',', '.'));
    const precoAntigo = productData.preco_antigo
      ? parseFloat(productData.preco_antigo.toString().replace(',', '.'))
      : null;
    const isPromocao = productData.promocao === 'true';

    // 1. Atualiza os dados do produto
    const { error: updateError } = await this.supabaseService.client.from('produtos').update({
      nome: productData.nome,
      descricao: productData.descricao,
      preco: precoAtual,
      preco_antigo: precoAntigo,
      promocao: isPromocao,
      updated_by: userId
    }).eq('id', id);

    if (updateError) {
      throw new InternalServerErrorException(`Erro ao atualizar dados: ${updateError.message}`);
    }

    // 2. Busca as imagens atuais no banco
    const { data: imagensAtuais, error: fetchImgError } = await this.supabaseService.client
      .from('produto_imagens')
      .select('id, url_path')
      .eq('produto_id', id);

    if (fetchImgError) throw new InternalServerErrorException('Erro ao buscar imagens no banco.');

    // Garante que imagensManter seja um array
    const urlsParaManter = Array.isArray(imagensManter) ? imagensManter : (imagensManter ? [imagensManter] : []);

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
        console.log('[DEBUG UPDATE] Apagando do Storage:', pathsParaStorage);
        await this.supabaseService.client.storage.from('produtos-fotos').remove(pathsParaStorage);
      }
    }

    // 3. Lógica de Upload de Novas Imagens
    if (files && files.length > 0) {
      const novasRefs: { produto_id: string; url_path: string }[] = [];

      for (const file of files) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `produtos/${id}/${fileName}`;

        const { error: uError } = await this.supabaseService.client.storage
          .from('produtos-fotos')
          .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (uError) throw new InternalServerErrorException(`Erro no upload: ${uError.message}`);

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

    if (erroImagens) throw new InternalServerErrorException(erroImagens.message);

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
          console.log('[DEBUG DELETE] Apagando do Storage:', pathsParaStorage);
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

    if (error) throw new InternalServerErrorException(error.message);
  }
}