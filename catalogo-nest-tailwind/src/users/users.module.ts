import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule], // Importa para usar o SupabaseService internamente
  providers: [UserService],
  exports: [UserService], // Exporta para o AuthController conseguir usá-lo
})
export class UsersModule {}