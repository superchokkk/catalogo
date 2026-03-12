import { Module } from '@nestjs/common';
import { JwtStrategy } from './auth/jwt.strategy';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { SupabaseService } from './supabase/supabase.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true })
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService, SupabaseService, JwtStrategy],
})
export class AppModule {}
