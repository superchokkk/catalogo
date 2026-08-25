import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return { 
      status: 'online', 
      message: 'API do Catálogo de Produtos funcionando perfeitamente!' 
    };
  }
}