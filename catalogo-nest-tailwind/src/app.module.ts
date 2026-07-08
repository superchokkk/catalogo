import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtStrategy } from './auth/jwt.strategy';
import { AppController } from './app.controller';
import { AuthController } from './auth/auth.controller';
import { ProductController } from './products/product.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { ProductService } from './products/product.service';
import { SupabaseService } from './supabase/supabase.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000, 
      limit: 10,
    }]),
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController, AuthController, ProductController],
  providers: [AppService, AuthService, SupabaseService, JwtStrategy, ProductService],
})
export class AppModule {}
