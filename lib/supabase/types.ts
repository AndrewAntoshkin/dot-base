import { ActionType } from '../models-config';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// User roles
export type UserRole = 'user' | 'admin' | 'super_admin';

// Admin stats view
export interface AdminStats {
  total_users: number;
  active_today: number;
  total_generations: number;
  generations_today: number;
  completed_generations: number;
  failed_generations: number;
  processing_generations: number;
  total_credits_spent: number;
  avg_processing_time_ms: number;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          telegram_username: string;
          telegram_id: number | null;
          telegram_first_name: string | null;
          telegram_last_name: string | null;
          telegram_photo_url: string | null;
          created_at: string;
          last_login: string;
          is_active: boolean;
          credits: number;
          role: UserRole;
        };
        Insert: {
          id?: string;
          email?: string | null;
          telegram_username: string;
          telegram_id?: number | null;
          telegram_first_name?: string | null;
          telegram_last_name?: string | null;
          telegram_photo_url?: string | null;
          created_at?: string;
          last_login?: string;
          is_active?: boolean;
          credits?: number;
          role?: UserRole;
        };
        Update: {
          id?: string;
          email?: string | null;
          telegram_username?: string;
          telegram_id?: number | null;
          telegram_first_name?: string | null;
          telegram_last_name?: string | null;
          telegram_photo_url?: string | null;
          created_at?: string;
          last_login?: string;
          is_active?: boolean;
          credits?: number;
          role?: UserRole;
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
          is_favorite: boolean;
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
    Views: {
      admin_stats: {
        Row: AdminStats;
      };
    };
    Functions: {
      get_next_replicate_token: {
        Args: Record<string, never>;
        Returns: Array<{
          id: number;
          token: string;
        }>;
      };
      is_admin_or_super: {
        Args: { user_email: string };
        Returns: boolean;
      };
      is_super_admin: {
        Args: { user_email: string };
        Returns: boolean;
      };
      get_user_role: {
        Args: { user_email: string };
        Returns: string;
      };
    };
    Enums: {};
  };
}

// Helper type for user with generation count
export interface UserWithStats {
  id: string;
  email: string | null;
  telegram_username: string;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  created_at: string;
  last_login: string;
  is_active: boolean;
  credits: number;
  role: UserRole;
  generations_count?: number;
  total_credits_spent?: number;
}

