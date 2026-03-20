// controllers/productController.js
import { Controller, Get, Post, InternalServerErrorException, UseInterceptors, Body, UploadedFiles, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProductService } from './product.service';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('produtos')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Get('listagem')
    async listProducts() {
        try {
            return await this.productService.getProductsWithImages();
        } catch (error) {
            console.error('Erro no Controller:', error.message);
            throw new InternalServerErrorException('Erro interno ao buscar catálogo.');
        }
    }

    @Post('criar')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FilesInterceptor('imagens', 10, { 
        limits: {
            fileSize: 5 * 1024 * 1024
        }
    }))
    async createProduct(
        @Body() productData: any,
        @UploadedFiles() files: Array<Express.Multer.File> // Captura os binários das fotos
    ) {
        try {
            // Passamos os dados E os arquivos para o Service
            return await this.productService.createProductWithImages(productData, files);
        } catch (error) {
            console.error('Erro no Controller:', error.message);
            throw new InternalServerErrorException('Erro interno ao criar produto.');
        }
    }
}
