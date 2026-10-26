import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ok } from './common/respostas';

@ApiTags('Status')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Status da API' })
  @Get()
  getHello() {
    return ok('API do Catálogo de Produtos funcionando perfeitamente!', { status: 'online' });
  }
}