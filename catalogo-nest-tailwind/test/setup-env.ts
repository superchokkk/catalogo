// Variáveis mínimas para o AppModule validar a configuração ao ser importado
// (ConfigModule.forRoot roda no momento do import, antes de qualquer beforeAll).
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_PRIVATE_KEY = 'chave-de-teste';
process.env.SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_JWT_SECRET = 'segredo-de-teste';
process.env.FRONTEND_URL = 'http://localhost:5173';
