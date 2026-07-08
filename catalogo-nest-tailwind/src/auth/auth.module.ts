import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [UsersModule, SupabaseModule], // Traz as ferramentas dos outros módulos
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}