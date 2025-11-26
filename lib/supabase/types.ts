import { ActionType } from '../models-config';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          telegram_username: string;
          telegram_id: number | null;
          telegram_first_name: string | null;
          telegram_last_name: string | null;
          telegram_photo_url: string | null;
          created_at: string;
          last_login: string;
          is_active: boolean;
          credits: number;
          role: 'user' | 'admin';
        };
        Insert: {
          id?: string;
          telegram_username: string;
          telegram_id?: number | null;
          telegram_first_name?: string | null;
          telegram_last_name?: string | null;
          telegram_photo_url?: string | null;
          created_at?: string;
          last_login?: string;
          is_active?: boolean;
          credits?: number;
          role?: 'user' | 'admin';
        };
        Update: {
          id?: string;
          telegram_username?: string;
          telegram_id?: number | null;
          telegram_first_name?: string | null;
          telegram_last_name?: string | null;
          telegram_photo_url?: string | null;
          created_at?: string;
          last_login?: string;
          is_active?: boolean;
          credits?: number;
          role?: 'user' | 'admin';
        };
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          action: ActionType;
          model_id: string;
          model_name: string;
          replicate_model: string;
          prompt: string | null;
          input_image_url: string | null;
          settings: Json;
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          output_urls: string[] | null;
          replicate_prediction_id: string | null;
          replicate_token_index: number | null;
          processing_time_ms: number | null;
          error_message: string | null;
          cost_credits: number;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          viewed: boolean;
          viewed_at: string | null;
          replicate_input: Json | null;
          replicate_output: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: ActionType;
          model_id: string;
          model_name: string;
          replicate_model: string;
          prompt?: string | null;
          input_image_url?: string | null;
          settings?: Json;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          output_urls?: string[] | null;
          replicate_prediction_id?: string | null;
          replicate_token_index?: number | null;
          processing_time_ms?: number | null;
          error_message?: string | null;
          cost_credits?: number;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          replicate_input?: Json | null;
          replicate_output?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: ActionType;
          model_id?: string;
          model_name?: string;
          replicate_model?: string;
          prompt?: string | null;
          input_image_url?: string | null;
          settings?: Json;
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
          output_urls?: string[] | null;
          replicate_prediction_id?: string | null;
          replicate_token_index?: number | null;
          processing_time_ms?: number | null;
          error_message?: string | null;
          cost_credits?: number;
          created_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          replicate_input?: Json | null;
          replicate_output?: Json | null;
        };
      };
      replicate_tokens: {
        Row: {
          id: number;
          token: string;
          is_active: boolean;
          last_used_at: string | null;
          request_count: number;
          error_count: number;
          last_error: string | null;
          last_error_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          token: string;
          is_active?: boolean;
          last_used_at?: string | null;
          request_count?: number;
          error_count?: number;
          last_error?: string | null;
          last_error_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          token?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          request_count?: number;
          error_count?: number;
          last_error?: string | null;
          last_error_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      get_next_replicate_token: {
        Args: {};
        Returns: Array<{
          id: number;
          token: string;
        }>;
      };
    };
    Enums: {};
  };
}

