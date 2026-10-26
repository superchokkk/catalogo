import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsJWT, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@exemplo.com', maxLength: 100 })
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @MaxLength(100)
  email!: string;

  @ApiProperty({ example: 'minha-senha-123', maxLength: 72 })
  @IsString({ message: 'Preencha email e senha.' })
  @IsNotEmpty({ message: 'Preencha email e senha.' })
  @MaxLength(72)
  senha!: string;
}

export class EsqueciSenhaDto {
  @ApiProperty({ example: 'usuario@exemplo.com', maxLength: 100 })
  @IsEmail({}, { message: 'Forneça um e-mail válido.' })
  @MaxLength(100)
  email!: string;
}

export class SetSessionDto {
  @ApiProperty({ description: 'Access token (JWT) emitido pelo Supabase.' })
  @IsJWT({ message: 'Token inválido.' })
  access_token!: string;

  @ApiPropertyOptional({ description: 'Se enviado, a sessão passa a poder ser renovada em /auth/refresh.', maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refresh_token?: string;
}
