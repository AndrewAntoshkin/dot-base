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

// Workspace member roles
export type WorkspaceMemberRole = 'owner' | 'admin' | 'member';

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
          workspace_id: string | null;
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
          workspace_id?: string | null;
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
          workspace_id?: string | null;
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
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          created_by: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
          created_by?: string | null;
          is_active?: boolean;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: WorkspaceMemberRole;
          joined_at: string;
          invited_by: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: WorkspaceMemberRole;
          joined_at?: string;
          invited_by?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: WorkspaceMemberRole;
          joined_at?: string;
          invited_by?: string | null;
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
      is_workspace_member: {
        Args: { p_workspace_id: string; p_user_id: string };
        Returns: boolean;
      };
      get_workspace_role: {
        Args: { p_workspace_id: string; p_user_id: string };
        Returns: string | null;
      };
      get_user_workspaces: {
        Args: { p_user_id: string };
        Returns: Array<{
          workspace_id: string;
          workspace_name: string;
          workspace_slug: string;
          member_role: WorkspaceMemberRole;
          member_count: number;
        }>;
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

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  is_active: boolean;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  joined_at: string;
  invited_by: string | null;
}

// Workspace with member info
export interface WorkspaceWithRole extends Workspace {
  member_role: WorkspaceMemberRole;
  member_count: number;
}

// Generation with user info (for workspace view)
export interface GenerationWithUser {
  id: string;
  user_id: string;
  workspace_id: string | null;
  action: ActionType;
  model_id: string;
  model_name: string;
  prompt: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  output_urls: string[] | null;
  created_at: string;
  viewed: boolean;
  is_favorite: boolean;
  error_message: string | null;
  // User info
  user?: {
    email: string | null;
    telegram_first_name: string | null;
  };
}

