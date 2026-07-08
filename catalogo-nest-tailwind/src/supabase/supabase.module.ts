import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Module({
  providers: [SupabaseService],
  exports: [SupabaseService], // Permite que outros módulos usem este serviço
})
export class SupabaseModule {}