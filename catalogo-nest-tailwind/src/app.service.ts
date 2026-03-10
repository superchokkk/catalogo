import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getProducts() {
    return [
      {
        id: 1,
        nome: 'Tênis Urban Pro',
        descricao: 'Tênis casual com acabamento premium para uso diário.',
        preco: 299.9,
        oldPrice: 399.9,
        imagem:
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 2,
        nome: 'Mochila Voyager',
        descricao: 'Mochila versátil com compartimento para notebook de 15”.',
        preco: 189.9,
        imagem:
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 3,
        nome: 'Relógio Horizon',
        descricao: 'Design minimalista com pulseira em aço escovado.',
        preco: 459.9,
        imagem:
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 4,
        nome: 'Jaqueta Alpine',
        descricao: 'Jaqueta leve e resistente para meia-estação.',
        preco: 349.9,
        imagem:
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 5,
        nome: 'Headphone Wave',
        descricao: 'Som imersivo com cancelamento de ruído ativo.',
        preco: 799.9,
        imagem:
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 6,
        nome: 'Smart Lamp One',
        descricao: 'Luminária inteligente com controle por app e voz.',
        preco: 229.9,
        imagem:
          'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=600&q=80',
      },
    ];
  }
}
