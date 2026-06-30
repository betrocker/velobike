export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      booking_requests: {
        Row: {
          id: string;
          tenant_id: string;
          client_name: string;
          client_phone: string;
          vehicle: Database['public']['Enums']['vehicle_type'];
          problem_description: string | null;
          preferred_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_name: string;
          client_phone: string;
          vehicle: Database['public']['Enums']['vehicle_type'];
          problem_description?: string | null;
          preferred_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_name?: string;
          client_phone?: string;
          vehicle?: Database['public']['Enums']['vehicle_type'];
          problem_description?: string | null;
          preferred_date?: string | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'booking_requests_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      inventory: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          price: number;
          stock_quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          price?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          price?: number;
          stock_quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      job_items: {
        Row: {
          id: string;
          job_id: string;
          service_id: string | null;
          name: string;
          price: number;
        };
        Insert: {
          id?: string;
          job_id: string;
          service_id?: string | null;
          name: string;
          price?: number;
        };
        Update: {
          id?: string;
          job_id?: string;
          service_id?: string | null;
          name?: string;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'job_items_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_items_service_id_fkey';
            columns: ['service_id'];
            isOneToOne: false;
            referencedRelation: 'service_catalog';
            referencedColumns: ['id'];
          },
        ];
      };
      job_parts: {
        Row: {
          id: string;
          job_id: string;
          part_id: string | null;
          name: string;
          quantity: number;
          price_at_sale: number;
        };
        Insert: {
          id?: string;
          job_id: string;
          part_id?: string | null;
          name: string;
          quantity?: number;
          price_at_sale?: number;
        };
        Update: {
          id?: string;
          job_id?: string;
          part_id?: string | null;
          name?: string;
          quantity?: number;
          price_at_sale?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'job_parts_job_id_fkey';
            columns: ['job_id'];
            isOneToOne: false;
            referencedRelation: 'jobs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'job_parts_part_id_fkey';
            columns: ['part_id'];
            isOneToOne: false;
            referencedRelation: 'inventory';
            referencedColumns: ['id'];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          tenant_id: string;
          client_name: string;
          client_phone: string | null;
          vehicle: Database['public']['Enums']['vehicle_type'];
          status: string;
          total_amount: number;
          paid_amount: number;
          debt_amount: number;
          assigned_to: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          client_name: string;
          client_phone?: string | null;
          vehicle: Database['public']['Enums']['vehicle_type'];
          status?: string;
          total_amount?: number;
          paid_amount?: number;
          debt_amount?: number;
          assigned_to?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          client_name?: string;
          client_phone?: string | null;
          vehicle?: Database['public']['Enums']['vehicle_type'];
          status?: string;
          total_amount?: number;
          paid_amount?: number;
          debt_amount?: number;
          assigned_to?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'jobs_assigned_to_fkey';
            columns: ['assigned_to'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'jobs_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          role: Database['public']['Enums']['user_role'];
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          tenant_id: string;
          role?: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          role?: Database['public']['Enums']['user_role'];
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      service_catalog: {
        Row: {
          id: string;
          tenant_id: string;
          zone_id: string;
          name: string;
          base_price: number;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          zone_id: string;
          name: string;
          base_price?: number;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          zone_id?: string;
          name?: string;
          base_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'service_catalog_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'service_catalog_zone_id_fkey';
            columns: ['zone_id'];
            isOneToOne: false;
            referencedRelation: 'zones';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_settings: {
        Row: {
          tenant_id: string;
          comes_to_client: boolean;
          company_name: string | null;
          company_address: string | null;
          company_phone: string | null;
          currency: string;
          app_language: string;
          vehicle_types: Database['public']['Enums']['vehicle_type'][];
          updated_at: string;
        };
        Insert: {
          tenant_id: string;
          comes_to_client?: boolean;
          company_name?: string | null;
          company_address?: string | null;
          company_phone?: string | null;
          currency?: string;
          app_language?: string;
          vehicle_types?: Database['public']['Enums']['vehicle_type'][];
          updated_at?: string;
        };
        Update: {
          tenant_id?: string;
          comes_to_client?: boolean;
          company_name?: string | null;
          company_address?: string | null;
          company_phone?: string | null;
          currency?: string;
          app_language?: string;
          vehicle_types?: Database['public']['Enums']['vehicle_type'][];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_settings_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenants';
            referencedColumns: ['id'];
          },
        ];
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          public_slug: string;
          booking_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          public_slug?: string;
          booking_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          public_slug?: string;
          booking_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      zones: {
        Row: {
          id: string;
          vehicle: Database['public']['Enums']['vehicle_type'];
          name: string;
          identifier: string;
        };
        Insert: {
          id?: string;
          vehicle: Database['public']['Enums']['vehicle_type'];
          name: string;
          identifier: string;
        };
        Update: {
          id?: string;
          vehicle?: Database['public']['Enums']['vehicle_type'];
          name?: string;
          identifier?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_booking_request: {
        Args: {
          p_public_slug: string;
          p_client_name: string;
          p_client_phone: string;
          p_vehicle: Database['public']['Enums']['vehicle_type'];
          p_problem_description?: string | null;
          p_preferred_date?: string | null;
        };
        Returns: string;
      };
      convert_booking_request_to_job: {
        Args: {
          p_booking_request_id: string;
        };
        Returns: string;
      };
      get_public_tenant_by_slug: {
        Args: {
          p_public_slug: string;
        };
        Returns: {
          id: string;
          name: string;
          public_slug: string;
          comes_to_client: boolean;
          vehicle_types: Database['public']['Enums']['vehicle_type'][];
        }[];
      };
      list_public_tenants: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          public_slug: string;
        }[];
      };
      assign_job_to_team_member: {
        Args: {
          p_job_id: string;
          p_assigned_to?: string | null;
        };
        Returns: Database['public']['Tables']['jobs']['Row'];
      };
      get_tenant_team_members: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          tenant_id: string;
          role: Database['public']['Enums']['user_role'];
          full_name: string | null;
          created_at: string;
        }[];
      };
      get_tenant_jobs: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['jobs']['Row'][];
      };
      get_tenant_settings: {
        Args: Record<string, never>;
        Returns: {
          tenant_id: string;
          comes_to_client: boolean;
          company_name: string | null;
          company_address: string | null;
          company_phone: string | null;
          currency: string;
          app_language: string;
          vehicle_types: Database['public']['Enums']['vehicle_type'][];
          updated_at: string;
        }[];
      };
      update_tenant_settings: {
        Args: {
          p_company_name?: string | null;
          p_company_address?: string | null;
          p_company_phone?: string | null;
          p_currency?: string;
          p_app_language?: string;
          p_comes_to_client?: boolean;
          p_vehicle_types?: Database['public']['Enums']['vehicle_type'][];
        };
        Returns: Database['public']['Tables']['tenant_settings']['Row'];
      };
      update_tenant_invite_code: {
        Args: {
          p_invite_code: string;
        };
        Returns: Database['public']['Tables']['tenants']['Row'];
      };
    };
    Enums: {
      user_role: 'admin' | 'staff';
      vehicle_type: 'bike' | 'scooter' | 'moto';
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
