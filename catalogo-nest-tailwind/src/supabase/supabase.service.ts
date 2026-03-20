import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  static from(arg0: string) {
      throw new Error('Method not implemented.');
  }
  public client: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY') || '';

    // Inicializa o cliente do Supabase
    this.client = createClient(supabaseUrl, supabaseKey);
  }
}