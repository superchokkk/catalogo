import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'Maria', maxLength: 100 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O nome é obrigatório.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres.' })
  nome!: string;

  @ApiProperty({ example: 'usuario@exemplo.com', maxLength: 100 })
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @MaxLength(100)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString({ message: 'A senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres.' }) // limite do bcrypt usado pelo Supabase
  senha!: string;

  @ApiProperty({ description: 'Deve ser igual a `senha`.' })
  @IsString({ message: 'A confirmação de senha é obrigatória.' })
  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória.' })
  confirmarSenha!: string;
}
