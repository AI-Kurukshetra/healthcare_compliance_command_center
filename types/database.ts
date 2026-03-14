import type {
  AppRole,
  AssessmentResponseStatus,
  AssessmentStatus,
  IncidentStatus,
  PolicyStatus,
  RiskStatusKey,
  RiskSeverity,
  TrainingProgressStatus
} from "@/types/compliance";

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
      assessment_templates: {
        Row: BaseRow & {
          slug: string;
          title: string;
          framework: string;
          version: number;
          description: string;
          questions: Json;
          max_score: number;
          is_active: boolean;
        };
        Insert: BaseInsert & {
          slug: string;
          title: string;
          framework?: string;
          version?: number;
          description: string;
          questions?: Json;
          max_score: number;
          is_active?: boolean;
        };
        Update: BaseUpdate & {
          slug?: string;
          title?: string;
          framework?: string;
          version?: number;
          description?: string;
          questions?: Json;
          max_score?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      assessment_responses: {
        Row: BaseRow & {
          template_id: string;
          user_id: string;
          status: AssessmentResponseStatus;
          submitted_at: string;
          answers: Json;
        };
        Insert: BaseInsert & {
          template_id: string;
          user_id: string;
          status: AssessmentResponseStatus;
          submitted_at?: string;
          answers?: Json;
        };
        Update: BaseUpdate & {
          template_id?: string;
          user_id?: string;
          status?: AssessmentResponseStatus;
          submitted_at?: string;
          answers?: Json;
        };
        Relationships: [];
      };
      assessment_results: {
        Row: BaseRow & {
          template_id: string;
          response_id: string;
          assessment_id: string | null;
          score: number;
          compliant_count: number;
          partial_count: number;
          non_compliant_count: number;
          summary: string;
          gap_analysis: Json;
          recommendations: Json;
          domain_scores: Json;
        };
        Insert: BaseInsert & {
          template_id: string;
          response_id: string;
          assessment_id?: string | null;
          score: number;
          compliant_count?: number;
          partial_count?: number;
          non_compliant_count?: number;
          summary: string;
          gap_analysis?: Json;
          recommendations?: Json;
          domain_scores?: Json;
        };
        Update: BaseUpdate & {
          template_id?: string;
          response_id?: string;
          assessment_id?: string | null;
          score?: number;
          compliant_count?: number;
          partial_count?: number;
          non_compliant_count?: number;
          summary?: string;
          gap_analysis?: Json;
          recommendations?: Json;
          domain_scores?: Json;
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
      risk_levels: {
        Row: {
          id: string;
          organization_id: string | null;
          key: RiskSeverity;
          label: string;
          description: string;
          weight: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          key: RiskSeverity;
          label: string;
          description: string;
          weight: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          key?: RiskSeverity;
          label?: string;
          description?: string;
          weight?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      risk_status: {
        Row: {
          id: string;
          organization_id: string | null;
          key: RiskStatusKey;
          label: string;
          description: string;
          sort_order: number;
          is_threat: boolean;
          is_closed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          key: RiskStatusKey;
          label: string;
          description: string;
          sort_order: number;
          is_threat?: boolean;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          key?: RiskStatusKey;
          label?: string;
          description?: string;
          sort_order?: number;
          is_threat?: boolean;
          is_closed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      risk_items: {
        Row: BaseRow & {
          title: string;
          description: string;
          level_id: string;
          status_id: string;
          owner_name: string | null;
          source: string;
          identified_on: string;
          target_resolution_date: string | null;
          last_reviewed_at: string | null;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: BaseInsert & {
          title: string;
          description: string;
          level_id: string;
          status_id: string;
          owner_name?: string | null;
          source?: string;
          identified_on?: string;
          target_resolution_date?: string | null;
          last_reviewed_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: BaseUpdate & {
          title?: string;
          description?: string;
          level_id?: string;
          status_id?: string;
          owner_name?: string | null;
          source?: string;
          identified_on?: string;
          target_resolution_date?: string | null;
          last_reviewed_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
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
      training_assignments: {
        Row: BaseRow & {
          course_id: string;
          user_id: string;
          assigned_by_user_id: string | null;
          due_at: string;
          reminder_sent_at: string | null;
          reminder_count: number;
        };
        Insert: BaseInsert & {
          course_id: string;
          user_id: string;
          assigned_by_user_id?: string | null;
          due_at: string;
          reminder_sent_at?: string | null;
          reminder_count?: number;
        };
        Update: BaseUpdate & {
          course_id?: string;
          user_id?: string;
          assigned_by_user_id?: string | null;
          due_at?: string;
          reminder_sent_at?: string | null;
          reminder_count?: number;
        };
        Relationships: [];
      };
      training_progress: {
        Row: BaseRow & {
          assignment_id: string;
          course_id: string;
          user_id: string;
          status: TrainingProgressStatus;
          progress_percentage: number;
          started_at: string | null;
          completed_at: string | null;
          updated_by_user_id: string | null;
        };
        Insert: BaseInsert & {
          assignment_id: string;
          course_id: string;
          user_id: string;
          status?: TrainingProgressStatus;
          progress_percentage?: number;
          started_at?: string | null;
          completed_at?: string | null;
          updated_by_user_id?: string | null;
        };
        Update: BaseUpdate & {
          assignment_id?: string;
          course_id?: string;
          user_id?: string;
          status?: TrainingProgressStatus;
          progress_percentage?: number;
          started_at?: string | null;
          completed_at?: string | null;
          updated_by_user_id?: string | null;
        };
        Relationships: [];
      };
      policy_templates: {
        Row: {
          id: string;
          organization_id: string | null;
          slug: string;
          title: string;
          category: string;
          framework: string;
          description: string;
          summary: string;
          content: string;
          recommended_review_days: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          slug: string;
          title: string;
          category: string;
          framework: string;
          description: string;
          summary: string;
          content: string;
          recommended_review_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          slug?: string;
          title?: string;
          category?: string;
          framework?: string;
          description?: string;
          summary?: string;
          content?: string;
          recommended_review_days?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_policies: {
        Row: BaseRow & {
          template_id: string | null;
          name: string;
          slug: string;
          status: PolicyStatus;
          owner_name: string;
          approver_name: string | null;
          review_frequency_days: number;
          effective_date: string | null;
          version: string;
          summary: string;
          content: string;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: BaseInsert & {
          template_id?: string | null;
          name: string;
          slug: string;
          status: PolicyStatus;
          owner_name: string;
          approver_name?: string | null;
          review_frequency_days?: number;
          effective_date?: string | null;
          version?: string;
          summary: string;
          content: string;
          created_by?: string | null;
          updated_by?: string | null;
        };
        Update: BaseUpdate & {
          template_id?: string | null;
          name?: string;
          slug?: string;
          status?: PolicyStatus;
          owner_name?: string;
          approver_name?: string | null;
          review_frequency_days?: number;
          effective_date?: string | null;
          version?: string;
          summary?: string;
          content?: string;
          created_by?: string | null;
          updated_by?: string | null;
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
