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

  async updateProductWithImages(id: string, productData: any, files: Array<Express.Multer.File>, imagensManter: string[], userId: string) {
    const precoAtual = parseFloat(productData.preco.toString().replace(',', '.'));
    const precoAntigo = productData.preco_antigo
      ? parseFloat(productData.preco_antigo.toString().replace(',', '.'))
      : null;
    const isPromocao = productData.promocao === 'true';

    const { error: updateError } = await this.supabaseService.client.from('produtos').update({
      nome: productData.nome,
      descricao: productData.descricao,
      preco: precoAtual,
      preco_antigo: precoAntigo,
      promocao: isPromocao,
      updated_by: userId
    }).eq('id', id);

    if (updateError) {
      console.error('[Update Produto] Erro ao atualizar tabela produtos:', updateError.message);
      throw new InternalServerErrorException(`Erro ao atualizar dados do produto: ${updateError.message}`);
    }

    const { data: imagensAtuais, error: fetchImgError } = await this.supabaseService.client
      .from('produto_imagens')
      .select('id, url_path')
      .eq('produto_id', id);

    if (fetchImgError) {
      console.error('[Update Produto] Erro ao buscar imagens atuais:', fetchImgError.message);
      throw new InternalServerErrorException('Erro ao buscar imagens do produto no banco.');
    }

    // Filtra apenas as imagens que NÃO constam no array imagensManter enviado pelo frontend
    const imagensParaDeletar = imagensAtuais?.filter(
      (img) => !imagensManter.includes(img.url_path)
    );

    if (imagensParaDeletar && imagensParaDeletar.length > 0) {
      const idsParaDeletar = imagensParaDeletar.map(img => img.id);
      for (const img of imagensParaDeletar) {
        const { error: delError } = await this.supabaseService.client
          .from('produto_imagens')
          .delete()
          .eq('id', img.id);

        if (delError) {
          console.error('[Update Produto] Erro ao deletar imagens antigas:', delError.message);
          throw new InternalServerErrorException(`Erro ao remover imagens antigas: ${delError.message}`);
        }
      }
    }
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

        if (uError) {
          console.error('[Update Produto] Erro ao fazer upload:', uError.message);
          throw new InternalServerErrorException(`Erro ao enviar imagem: ${uError.message}`);
        }

        const { data: { publicUrl } } = this.supabaseService.client.storage
          .from('produtos-fotos')
          .getPublicUrl(filePath);

        novasRefs.push({ produto_id: id, url_path: publicUrl });
      }

      const { error: iError } = await this.supabaseService.client
        .from('produto_imagens')
        .insert(novasRefs);

      if (iError) {
        console.error('[Update Produto] Erro ao salvar referências de imagens:', iError.message);
        throw new InternalServerErrorException(`Erro ao salvar referências das imagens: ${iError.message}`);
      }
    }
  }

  async deleteProduct(id: string): Promise<void> {
    const { data: imagens, error: erroImagens } = await this.supabaseService.client
        .from('produto_imagens')
        .select('id, url_path')
        .eq('produto_id', id);

    if (erroImagens) throw new InternalServerErrorException(erroImagens.message);

    if (imagens && imagens.length > 0) {
      const idsParaDeletar = imagens.map(img => img.id);
      for (const img of imagens) {
        const { error: delError } = await this.supabaseService.client
          .from('produto_imagens')
          .delete()
          .eq('id', img.id);

        if (delError) {
          console.error('[Delete Produto] Erro ao deletar imagens antigas:', delError.message);
          throw new InternalServerErrorException(`Erro ao remover imagens antigas: ${delError.message}`);
        }
      }
    }

    if (imagens && imagens.length > 0) {
        const paths = imagens.map(img => img.url_path);

        const { error: erroBucket } = await this.supabaseService.client
            .storage
            .from('produtos-imagens')
            .remove(paths);

        if (erroBucket) throw new InternalServerErrorException(erroBucket.message);
    }

    // 4. Deleta o produto
    const { error } = await this.supabaseService.client
        .from('produtos')
        .delete()
        .eq('id', id);

    if (error) throw new InternalServerErrorException(error.message);
}
}