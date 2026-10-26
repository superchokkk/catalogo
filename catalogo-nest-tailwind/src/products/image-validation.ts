import { BadRequestException } from '@nestjs/common';
import { MSG } from '../common/respostas';

export const MAX_IMAGENS = 10;
export const MAX_TAMANHO_IMAGEM = 5 * 1024 * 1024;

export const MIMES_IMAGEM = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type TipoImagem = { mime: string; ext: string };

// Identifica o tipo pelos primeiros bytes do arquivo (assinatura / "magic bytes"),
// ignorando o mimetype e o nome informados pelo cliente, que são falsificáveis.
export function detectarImagem(buf: Buffer): TipoImagem | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  if (buf.length >= 6 && ['GIF87a', 'GIF89a'].includes(buf.subarray(0, 6).toString('latin1'))) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}

// Filtro do multer: rejeita cedo o que o cliente já declara como não-imagem.
// A verificação que vale é a dos bytes, feita em validarImagens.
export function filtroDeImagem(_req: unknown, file: Express.Multer.File, cb: (err: Error | null, aceitar: boolean) => void) {
  if (!MIMES_IMAGEM.includes(file.mimetype)) {
    return cb(new BadRequestException(MSG.SOMENTE_IMAGENS), false);
  }
  cb(null, true);
}

export const opcoesUploadImagem = {
  limits: { fileSize: MAX_TAMANHO_IMAGEM, files: MAX_IMAGENS },
  fileFilter: filtroDeImagem,
};

// Confere o conteúdo real de todos os arquivos ANTES de qualquer escrita no banco ou no
// storage. Devolve o tipo detectado de cada um, na mesma ordem.
export function validarImagens(files: Express.Multer.File[] | undefined): TipoImagem[] {
  return (files ?? []).map((file) => {
    const tipo = detectarImagem(file.buffer);
    if (!tipo) {
      throw new BadRequestException(MSG.SOMENTE_IMAGENS);
    }
    return tipo;
  });
}
