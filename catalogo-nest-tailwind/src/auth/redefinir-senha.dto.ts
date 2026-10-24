import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RedefinirSenhaDto {
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  email!: string;

  // OTP enviado por e-mail. O Supabase usa 6 dígitos por padrão e permite até 10.
  @Matches(/^\d{6,10}$/, { message: 'Código inválido.' })
  token!: string;

  @IsString({ message: 'A nova senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  @MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres.' }) // limite do bcrypt usado pelo Supabase
  novaSenha!: string;
}
