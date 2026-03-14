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
      organizations: {
        Row: BaseRow & {
          name: string;
          plan: string | null;
        };
        Insert: BaseInsert & {
          name: string;
          plan?: string | null;
        };
        Update: BaseUpdate & {
          name?: string;
          plan?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: BaseRow & {
          email: string;
          role: AppRole;
        };
        Insert: BaseInsert & {
          email: string;
          role: AppRole;
        };
        Update: BaseUpdate & {
          email?: string;
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
