import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min, Max, MinLength } from 'class-validator';

// Aceita número ou texto no formato BR ("1.299,90", "19,90") ou US ("19.90").
// Valor inválido vira NaN, que o @IsNumber rejeita.
export function parsePreco(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor !== 'string') return NaN;

  let texto = valor.trim();
  if (!/^\d[\d.,]*$/.test(texto)) return NaN;
  texto = texto.includes(',') ? texto.replace(/\./g, '').replace(',', '.') : texto;
  return Number(texto);
}

// Campos de formulário multipart chegam como texto.
const paraBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
};

// O front envia a lista como string JSON; JSON inválido segue como texto e falha no @IsArray.
const paraLista = ({ value }: { value: unknown }) => {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') return value;
  try {
    const lista = JSON.parse(value);
    return typeof lista === 'string' ? [lista] : lista;
  } catch {
    return value;
  }
};

const PRECO_MAXIMO = 10_000_000;

export class CreateProductDto {
  @ApiProperty({ example: 'Cadeira Gamer', minLength: 1, maxLength: 200 })
  @IsString({ message: 'O nome é obrigatório.' })
  @MinLength(1, { message: 'O nome é obrigatório.' })
  @MaxLength(200, { message: 'O nome deve ter no máximo 200 caracteres.' })
  nome!: string;

  @ApiPropertyOptional({ maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000, { message: 'A descrição deve ter no máximo 5000 caracteres.' })
  descricao?: string;

  @ApiProperty({ type: String, example: '1.299,90', description: 'Número ou texto no formato BR/US. Entre 0 e 10.000.000.' })
  @Transform(({ value }) => parsePreco(value))
  @IsNumber({}, { message: 'Preço inválido.' })
  @Min(0, { message: 'O preço não pode ser negativo.' })
  @Max(PRECO_MAXIMO, { message: 'Preço acima do permitido.' })
  preco!: number;
}

export class UpdateProductDto extends CreateProductDto {
  @ApiPropertyOptional({ type: String, example: '1.599,90', description: 'Preço antes da promoção.' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : parsePreco(value)))
  @IsNumber({}, { message: 'Preço antigo inválido.' })
  @Min(0, { message: 'O preço antigo não pode ser negativo.' })
  @Max(PRECO_MAXIMO, { message: 'Preço antigo acima do permitido.' })
  preco_antigo?: number;

  @ApiPropertyOptional({ type: String, enum: ['true', 'false'], description: 'Em multipart chega como texto.' })
  @IsOptional()
  @Transform(paraBoolean)
  @IsBoolean({ message: 'Valor de promoção inválido.' })
  promocao?: boolean;

  @ApiPropertyOptional({ type: String, example: '["https://.../foto1.jpg"]', description: 'JSON (texto) com as URLs das imagens a manter; as demais são apagadas.' })
  @IsOptional()
  @Transform(paraLista)
  @IsArray({ message: 'Lista de imagens inválida.' })
  @ArrayMaxSize(50)
  @IsString({ each: true })
  imagensExistentes?: string[];
}
