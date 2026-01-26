// Database types generated from schema
// These types match the Supabase schema in 001_initial_schema.sql

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    industry: string
                    line_channel_id: string | null
                    line_channel_secret: string | null
                    line_channel_access_token: string | null
                    settings: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    industry?: string
                    line_channel_id?: string | null
                    line_channel_secret?: string | null
                    line_channel_access_token?: string | null
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    industry?: string
                    line_channel_id?: string | null
                    line_channel_secret?: string | null
                    line_channel_access_token?: string | null
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            users: {
                Row: {
                    id: string
                    org_id: string
                    role: 'owner' | 'manager' | 'staff' | 'system_admin'
                    email: string | null
                    display_name: string
                    line_user_id: string | null
                    phone: string | null
                    is_active: boolean
                    settings: Json
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    role: 'owner' | 'manager' | 'staff' | 'system_admin'
                    email?: string | null
                    display_name: string
                    line_user_id?: string | null
                    phone?: string | null
                    is_active?: boolean
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    role?: 'owner' | 'manager' | 'staff' | 'system_admin'
                    email?: string | null
                    display_name?: string
                    line_user_id?: string | null
                    phone?: string | null
                    is_active?: boolean
                    settings?: Json
                    created_at?: string
                    updated_at?: string
                }
            }
            conversations: {
                Row: {
                    id: string
                    org_id: string
                    employee_id: string
                    subject: string | null
                    status: 'open' | 'pending' | 'resolved' | 'closed'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    employee_id: string
                    subject?: string | null
                    status?: 'open' | 'pending' | 'resolved' | 'closed'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    employee_id?: string
                    subject?: string | null
                    status?: 'open' | 'pending' | 'resolved' | 'closed'
                    created_at?: string
                    updated_at?: string
                }
            }
            messages: {
                Row: {
                    id: string
                    org_id: string
                    conversation_id: string
                    sender_id: string
                    direction: 'employee_to_owner' | 'owner_to_employee' | 'system'
                    original_text: string | null
                    translated_text: string
                    is_confirmed: boolean
                    is_read: boolean
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    conversation_id: string
                    sender_id: string
                    direction: 'employee_to_owner' | 'owner_to_employee' | 'system'
                    original_text?: string | null
                    translated_text: string
                    is_confirmed?: boolean
                    is_read?: boolean
                    metadata?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    conversation_id?: string
                    sender_id?: string
                    direction?: 'employee_to_owner' | 'owner_to_employee' | 'system'
                    original_text?: string | null
                    translated_text?: string
                    is_confirmed?: boolean
                    is_read?: boolean
                    metadata?: Json
                    created_at?: string
                }
            }
            documents: {
                Row: {
                    id: string
                    org_id: string
                    title: string
                    doc_type: 'employment_rules' | 'salary_rules' | 'leave_policy' | 'other'
                    file_path: string | null
                    content: string | null
                    is_active: boolean
                    uploaded_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    title: string
                    doc_type: 'employment_rules' | 'salary_rules' | 'leave_policy' | 'other'
                    file_path?: string | null
                    content?: string | null
                    is_active?: boolean
                    uploaded_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    title?: string
                    doc_type?: 'employment_rules' | 'salary_rules' | 'leave_policy' | 'other'
                    file_path?: string | null
                    content?: string | null
                    is_active?: boolean
                    uploaded_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            document_chunks: {
                Row: {
                    id: string
                    org_id: string
                    document_id: string
                    chunk_index: number
                    content: string
                    embedding: number[] | null
                    metadata: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    document_id: string
                    chunk_index: number
                    content: string
                    embedding?: number[] | null
                    metadata?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    document_id?: string
                    chunk_index?: number
                    content?: string
                    embedding?: number[] | null
                    metadata?: Json
                    created_at?: string
                }
            }
            document_acknowledgments: {
                Row: {
                    id: string
                    org_id: string
                    document_id: string
                    user_id: string
                    acknowledged_at: string
                    ip_address: string | null
                    user_agent: string | null
                }
                Insert: {
                    id?: string
                    org_id: string
                    document_id: string
                    user_id: string
                    acknowledged_at?: string
                    ip_address?: string | null
                    user_agent?: string | null
                }
                Update: {
                    id?: string
                    org_id?: string
                    document_id?: string
                    user_id?: string
                    acknowledged_at?: string
                    ip_address?: string | null
                    user_agent?: string | null
                }
            }
            announcements: {
                Row: {
                    id: string
                    org_id: string
                    sender_id: string
                    title: string
                    original_text: string | null
                    translated_text: string
                    is_published: boolean
                    published_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    sender_id: string
                    title: string
                    original_text?: string | null
                    translated_text: string
                    is_published?: boolean
                    published_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    sender_id?: string
                    title?: string
                    original_text?: string | null
                    translated_text?: string
                    is_published?: boolean
                    published_at?: string | null
                    created_at?: string
                }
            }
            announcement_reads: {
                Row: {
                    id: string
                    org_id: string
                    announcement_id: string
                    user_id: string
                    read_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    announcement_id: string
                    user_id: string
                    read_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    announcement_id?: string
                    user_id?: string
                    read_at?: string
                }
            }
            payslips: {
                Row: {
                    id: string
                    org_id: string
                    user_id: string
                    year_month: string
                    data: Json
                    file_path: string | null
                    is_read: boolean
                    read_at: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    user_id: string
                    year_month: string
                    data: Json
                    file_path?: string | null
                    is_read?: boolean
                    read_at?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    user_id?: string
                    year_month?: string
                    data?: Json
                    file_path?: string | null
                    is_read?: boolean
                    read_at?: string | null
                    created_at?: string
                }
            }
            shifts: {
                Row: {
                    id: string
                    org_id: string
                    user_id: string
                    shift_date: string
                    start_time: string | null
                    end_time: string | null
                    status: 'draft' | 'confirmed' | 'requested'
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    org_id: string
                    user_id: string
                    shift_date: string
                    start_time?: string | null
                    end_time?: string | null
                    status?: 'draft' | 'confirmed' | 'requested'
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    org_id?: string
                    user_id?: string
                    shift_date?: string
                    start_time?: string | null
                    end_time?: string | null
                    status?: 'draft' | 'confirmed' | 'requested'
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            match_documents: {
                Args: {
                    query_embedding: number[]
                    match_threshold: number
                    match_count: number
                    p_org_id: string
                }
                Returns: {
                    id: string
                    document_id: string
                    content: string
                    metadata: Json
                    similarity: number
                }[]
            }
        }
        Enums: {
            [_ in never]: never
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
