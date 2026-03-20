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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }

    async createProductWithImages(productData: any, files: Array<Express.Multer.File>) {
        // 1. Criar o Produto
        const { data: product, error: pError } = await this.supabaseService.client
        .from('produtos')
        .insert([{
            nome: productData.nome,
            descricao: productData.descricao,
            preco: parseFloat(productData.preco.toString().replace(',', '.'))
        }])
        .select()
        .single();
        console.log("Produto criado:", product);

        if (pError) {
          console.error('Erro ao criar produto:', pError.message);
          throw new InternalServerErrorException('Erro ao criar produto no banco.');
        }

        // 2. Upload das Imagens
        // Definimos o tipo explicitamente para evitar o erro de 'never'
        const imageUrls: { produto_id: string; url_path: string }[] = [];

        if (files && files.length > 0) {
          console.log(`Iniciando upload de ${files.length} arquivos para o produto ID ${product.id}`);
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
            produto_id: product.id, // Agora o TS reconhece o 'product' aqui
            url_path: publicUrl
            });
            console.log(`Arquivo ${file.originalname} enviado com sucesso. URL pública: ${publicUrl}`);
        }

        // 3. Salvar referências das imagens
        const { error: iError } = await this.supabaseService.client
            .from('produto_imagens')
            .insert(imageUrls);

        if (iError) throw iError;
        }
        console.log("Produto criado com sucesso e imagens associadas:", product);

        return product;
  }
}