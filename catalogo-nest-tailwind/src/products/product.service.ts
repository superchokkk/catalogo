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

  async updateProductWithImages(id: string, productData: any, files: Array<Express.Multer.File>, imagensManter: string[], userId: string) {
    const precoAtual = parseFloat(productData.preco.toString().replace(',', '.'));
    const precoAntigo = productData.preco_antigo ? parseFloat(productData.preco_antigo.toString().replace(',', '.')) : null;
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
        console.log(`[Update Produto] Imagem marcada para deleção: ID=${img.id}, URL=${img.url_path}`);
      }

      const pathsParaDeletar = imagensParaDeletar.map(img => {
        const partes = img.url_path.split('/produtos-fotos/');
        return partes.length > 1 ? partes[1] : null;
      }).filter(p => p !== null);

      const { error: delError } = await this.supabaseService.client
        .from('produto_imagens')
        .delete()
        .in('id', idsParaDeletar); // Deleta de forma segura através de uma array de IDs

      if (delError) {
        console.error('[Update Produto] Erro ao deletar imagens antigas:', delError.message);
        throw new InternalServerErrorException(`Erro ao remover imagens antigas: ${delError.message}`);
      }

      if (pathsParaDeletar.length > 0) {
        const { error: storageError } = await this.supabaseService.client.storage
          .from('produtos-fotos')
          .remove(pathsParaDeletar);

        if (storageError) {
          console.error('[Update Produto] Erro ao remover do Storage físico:', storageError.message);
        }
      }

      // 3. Upload de novas fotos (se houver)
      if (files && files.length > 0) {
        console.log(`[Update Produto] Recebidas ${files.length} novas fotos para upload.`);

        for (const file of files) {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
          const filePath = `produtos/${id}/${fileName}`;

          const { error: uploadError } = await this.supabaseService.client.storage
            .from('produtos-fotos')
            .upload(filePath, file.buffer, { contentType: file.mimetype });

          if (uploadError) {
            console.error('[Update Produto] Erro no upload no Storage:', uploadError.message);
            throw new InternalServerErrorException(`Erro no upload da foto: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = this.supabaseService.client.storage
            .from('produtos-fotos')
            .getPublicUrl(filePath);

          const { error: insertError } = await this.supabaseService.client
            .from('produto_imagens')
            .insert([{ produto_id: id, url_path: publicUrl }]);

          if (insertError) {
            console.error('[Update Produto] Erro ao salvar URL no banco:', insertError.message);
            throw new InternalServerErrorException(`Erro ao atrelar nova foto ao produto: ${insertError.message}`);
          }
        }
      }
    }
  }
}