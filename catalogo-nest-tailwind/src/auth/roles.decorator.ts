import { SetMetadata } from '@nestjs/common';
import { Nivel } from './nivel.enum';

export const ROLES_KEY = 'roles';

// Níveis que podem acessar a rota. Use junto com SupabaseAuthGuard e RolesGuard.
export const Roles = (...niveis: Nivel[]) => SetMetadata(ROLES_KEY, niveis);
