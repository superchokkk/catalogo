import { normalizarNome } from './normalizar-nome';

describe('normalizarNome', () => {
  it.each([
    ['CADEIRA gamer', 'Cadeira gamer'],
    ['cadeira', 'Cadeira'],
    ['MESA', 'Mesa'],
    ['  mesa de jantar  ', 'Mesa de jantar'],
    ['ÁRVORE', 'Árvore'],
    ['a', 'A'],
  ])('%p vira %p', (entrada, esperado) => {
    expect(normalizarNome(entrada)).toBe(esperado);
  });
});
