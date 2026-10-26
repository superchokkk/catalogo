import { detectarImagem, validarImagens } from './image-validation';

const arquivo = (buffer: Buffer) => ({ buffer }) as Express.Multer.File;

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const GIF = Buffer.from('GIF89a......', 'latin1');
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);

describe('detectarImagem', () => {
  it.each([
    ['jpeg', JPEG, 'image/jpeg', 'jpg'],
    ['png', PNG, 'image/png', 'png'],
    ['gif', GIF, 'image/gif', 'gif'],
    ['webp', WEBP, 'image/webp', 'webp'],
  ])('reconhece %s pelos bytes', (_n, buf, mime, ext) => {
    expect(detectarImagem(buf)).toEqual({ mime, ext });
  });

  it.each([
    ['SVG com script', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
    ['HTML', Buffer.from('<html><script>alert(1)</script></html>')],
    ['executável', Buffer.from('MZ\x90\x00\x03\x00', 'latin1')],
    ['RIFF que não é WebP (WAV)', Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WAVEfmt ')])],
    ['vazio', Buffer.alloc(0)],
  ])('rejeita %s', (_n, buf) => {
    expect(detectarImagem(buf)).toBeNull();
  });
});

describe('validarImagens', () => {
  it('devolve o tipo de cada arquivo, na ordem', () => {
    expect(validarImagens([arquivo(PNG), arquivo(JPEG)]).map((t) => t.ext)).toEqual(['png', 'jpg']);
  });

  it('aceita ausência de arquivos', () => {
    expect(validarImagens(undefined)).toEqual([]);
  });

  it('rejeita o lote inteiro com 400 se um arquivo não for imagem', () => {
    expect(() => validarImagens([arquivo(PNG), arquivo(Buffer.from('<svg/>'))])).toThrow(
      expect.objectContaining({ status: 400 }),
    );
  });
});
