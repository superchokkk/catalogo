import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { throttlerOptions } from './common/throttler.config';
import { validarEnv } from './common/env.validation';
import { OriginGuard } from './common/origin.guard';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
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
    ThrottlerModule.forRoot(throttlerOptions),
    ConfigModule.forRoot({ isGlobal: true, validate: validarEnv }),
    SupabaseModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController, AuthController, ProductController],
  providers: [AppService, AuthService, SupabaseService, JwtStrategy, ProductService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
