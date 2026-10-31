// Tudo em minúsculas e só a primeira letra maiúscula: "  CADEIRA gamer " → "Cadeira gamer".
// Usada na criação e na alteração, para o banco guardar sempre o mesmo formato.
export function normalizarNome(nome: string): string {
  const limpo = nome.trim().toLowerCase();
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}
