import type { AppRole, AssessmentStatus, IncidentStatus, RiskSeverity } from "@/types/compliance";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type BaseRow = {
  id: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

type BaseInsert = {
  id?: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
};

type BaseUpdate = {
  id?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: BaseRow & {
          name: string;
          description: string;
        };
        Insert: BaseInsert & {
          name: string;
          description: string;
        };
        Update: BaseUpdate & {
          name?: string;
          description?: string;
        };
        Relationships: [];
      };
      permissions: {
        Row: BaseRow & {
          name: string;
          description: string;
        };
        Insert: BaseInsert & {
          name: string;
          description: string;
        };
        Update: BaseUpdate & {
          name?: string;
          description?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: BaseRow & {
          role_id: string;
          permission_id: string;
        };
        Insert: BaseInsert & {
          role_id: string;
          permission_id: string;
        };
        Update: BaseUpdate & {
          role_id?: string;
          permission_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: BaseRow & {
          user_id: string;
          role_id: string;
        };
        Insert: BaseInsert & {
          user_id: string;
          role_id: string;
        };
        Update: BaseUpdate & {
          user_id?: string;
          role_id?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: BaseRow & {
          name: string;
          plan: string | null;
          created_by: string | null;
        };
        Insert: BaseInsert & {
          name: string;
          plan?: string | null;
          created_by?: string | null;
        };
        Update: BaseUpdate & {
          name?: string;
          plan?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: AppRole;
          role_id: string;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: AppRole;
          role_id?: string;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: AppRole;
          role_id?: string;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: BaseRow & {
          email: string;
          first_name: string | null;
          last_name: string | null;
          role: AppRole;
        };
        Insert: BaseInsert & {
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          role: AppRole;
        };
        Update: BaseUpdate & {
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: AppRole;
        };
        Relationships: [];
      };
      assessments: {
        Row: BaseRow & {
          status: AssessmentStatus;
          score: number | null;
        };
        Insert: BaseInsert & {
          status: AssessmentStatus;
          score?: number | null;
        };
        Update: BaseUpdate & {
          status?: AssessmentStatus;
          score?: number | null;
        };
        Relationships: [];
      };
      risks: {
        Row: BaseRow & {
          severity: RiskSeverity;
          description: string;
        };
        Insert: BaseInsert & {
          severity: RiskSeverity;
          description: string;
        };
        Update: BaseUpdate & {
          severity?: RiskSeverity;
          description?: string;
        };
        Relationships: [];
      };
      incidents: {
        Row: BaseRow & {
          severity: RiskSeverity;
          status: IncidentStatus;
          description: string;
        };
        Insert: BaseInsert & {
          severity: RiskSeverity;
          status: IncidentStatus;
          description: string;
        };
        Update: BaseUpdate & {
          severity?: RiskSeverity;
          status?: IncidentStatus;
          description?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: BaseRow & {
          user_id: string | null;
          action: string;
          entity: string;
          entity_id: string;
          details: Json | null;
        };
        Insert: BaseInsert & {
          user_id?: string | null;
          action: string;
          entity: string;
          entity_id: string;
          details?: Json | null;
        };
        Update: BaseUpdate & {
          user_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string;
          details?: Json | null;
        };
        Relationships: [];
      };
      vendors: {
        Row: BaseRow & {
          name: string;
          risk_score: number | null;
        };
        Insert: BaseInsert & {
          name: string;
          risk_score?: number | null;
        };
        Update: BaseUpdate & {
          name?: string;
          risk_score?: number | null;
        };
        Relationships: [];
      };
      documents: {
        Row: BaseRow & {
          name: string;
          version: string | null;
        };
        Insert: BaseInsert & {
          name: string;
          version?: string | null;
        };
        Update: BaseUpdate & {
          name?: string;
          version?: string | null;
        };
        Relationships: [];
      };
      training_courses: {
        Row: BaseRow & {
          title: string;
          mandatory: boolean;
        };
        Insert: BaseInsert & {
          title: string;
          mandatory?: boolean;
        };
        Update: BaseUpdate & {
          title?: string;
          mandatory?: boolean;
        };
        Relationships: [];
      };
      questionnaires: {
        Row: BaseRow & {
          title: string;
        };
        Insert: BaseInsert & {
          title: string;
        };
        Update: BaseUpdate & {
          title?: string;
        };
        Relationships: [];
      };
      responses: {
        Row: {
          id: string;
          questionnaire_id: string;
          user_id: string;
          organization_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          questionnaire_id: string;
          user_id: string;
          organization_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          questionnaire_id?: string;
          user_id?: string;
          organization_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
