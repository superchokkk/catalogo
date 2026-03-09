import { Injectable } from '@nestjs/common';
import { console } from 'inspector';

@Injectable()
export class AuthService {
  login(nome: string, email: string, senha: string) {
    console.log(nome, email, senha)
    const nomeLimpo = (nome ?? '').trim();
    const emailLimpo = (email ?? '').trim();
    const senhaLimpa = senha ?? '';

    if (!nomeLimpo || !emailLimpo || !senhaLimpa) {
      return {
        success: false,
        message: 'Preencha nome, email e senha.',
      };
    }

    if (!emailLimpo.includes('@')) {
      return {
        success: false,
        message: 'Email inválido.',
      };
    }

    //encriptografar
    if (email == "samuel@gmail.com" && senha == "senha") {
      console.log("admin")
      return {
        success: true,
        message: `Bem-vindo, ${nomeLimpo}!`,
        user: {
          nome: nomeLimpo,
          email: emailLimpo,
          role: 1
        },
      };
    }
    else {
      return {
        success: true,
        message: `Bem-vindo, ${nomeLimpo}!`,
        user: {
          nome: nomeLimpo,
          email: emailLimpo,
          role: 2
        },
      };
    }

  }
}