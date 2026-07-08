import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome!: string;

  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres.' })
  senha!: string;

  @IsNotEmpty({ message: 'A confirmação de senha é obrigatória.' })
  confirmarSenha!: string;
}