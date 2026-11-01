import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export const CAMPOS_ORDENACAO = ['preco', 'nome', 'created_at'] as const;
export const DIRECOES = ['asc', 'desc'] as const;
export const LIMITE_MAXIMO = 50;

export class ListProductsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Só produtos dessa categoria (id vindo de `GET /categorias`).' })
  @IsOptional()
  @IsUUID(undefined, { message: 'Categoria inválida.' })
  categoria?: string;

  @ApiPropertyOptional({ enum: CAMPOS_ORDENACAO, default: 'created_at', example: 'preco' })
  @IsOptional()
  @IsIn(CAMPOS_ORDENACAO, { message: 'Campo de ordenação inválido.' })
  ordenar?: (typeof CAMPOS_ORDENACAO)[number];

  @ApiPropertyOptional({ enum: DIRECOES, default: 'desc', example: 'asc' })
  @IsOptional()
  @IsIn(DIRECOES, { message: 'Direção de ordenação inválida.' })
  direcao?: (typeof DIRECOES)[number];

  @ApiPropertyOptional({ type: Number, minimum: 1, default: 1, example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Página inválida.' })
  @Min(1, { message: 'Página inválida.' })
  pagina: number = 1;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: LIMITE_MAXIMO, default: 20, example: 20 })
  @Type(() => Number)
  @IsInt({ message: 'Limite inválido.' })
  @Min(1, { message: 'Limite inválido.' })
  @Max(LIMITE_MAXIMO, { message: `O limite máximo é ${LIMITE_MAXIMO}.` })
  limite: number = 20;
}
