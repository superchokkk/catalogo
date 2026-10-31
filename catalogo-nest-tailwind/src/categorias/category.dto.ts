import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const aparar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// A capitalização do nome (minúsculas + inicial maiúscula) é feita no CategoryService, não aqui.
export class CreateCategoryDto {
  @ApiProperty({ example: 'Cadeiras', maxLength: 100, description: 'Salvo com tudo em minúsculas e só a inicial maiúscula.' })
  @Transform(aparar)
  @IsString({ message: 'O nome é obrigatório.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome!: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Categorias inativas somem do filtro público.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso.' })
  ativo?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Mesas', maxLength: 100, description: 'Salvo com tudo em minúsculas e só a inicial maiúscula.' })
  @IsOptional()
  @Transform(aparar)
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome não pode ser vazio.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'O campo ativo deve ser verdadeiro ou falso.' })
  ativo?: boolean;
}
