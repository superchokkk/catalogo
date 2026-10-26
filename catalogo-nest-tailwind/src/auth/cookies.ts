import type { CookieOptions, Response } from 'express';

export const COOKIE_ACESSO = 'access_token';
export const COOKIE_REFRESH = 'refresh_token';

// O refresh token só trafega na rota que o usa.
export const PATH_REFRESH = '/api/auth/refresh';

// 30 dias: o Supabase invalida o refresh token no servidor quando a sessão expira.
const VIDA_REFRESH_MS = 30 * 24 * 60 * 60 * 1000;

// Opções comuns, usadas também ao limpar o cookie (sem as mesmas opções,
// alguns navegadores não removem o cookie).
const base = (): CookieOptions => ({
  httpOnly: true, // contra XSS
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'none',
});

export function gravarSessao(res: Response, accessToken: string, expiresInSegundos: number, refreshToken?: string) {
  res.cookie(COOKIE_ACESSO, accessToken, { ...base(), path: '/', maxAge: expiresInSegundos * 1000 });
  if (refreshToken) {
    res.cookie(COOKIE_REFRESH, refreshToken, { ...base(), path: PATH_REFRESH, maxAge: VIDA_REFRESH_MS });
  }
}

export function limparSessao(res: Response) {
  res.clearCookie(COOKIE_ACESSO, { ...base(), path: '/' });
  res.clearCookie(COOKIE_REFRESH, { ...base(), path: PATH_REFRESH });
}
