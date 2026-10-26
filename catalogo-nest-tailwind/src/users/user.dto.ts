import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @ApiProperty()
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsNotEmpty()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres.' })
  senha!: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória.' })
  confirmarSenha!: string;
}