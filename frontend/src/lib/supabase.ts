import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Appraiser {
  id: string;
  appraiser_id: string;
  name: string;
  photo: string;
  created_at: string;
  updated_at: string;
}

export interface Appraisal {
  id: string;
  appraiser_id: string;
  customer_front_image: string;
  customer_side_image: string;
  rbi_overall_image?: string;
  rbi_compliance_timestamp?: string;
  purity_test_method?: string;
  purity_test_image?: string;
  purity_test_notes?: string;
  appraisal_timestamp: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface JewelleryItem {
  id: string;
  appraisal_id: string;
  item_number: number;
  image: string;
  captured_at: string;
  created_at: string;
}

export interface AuditTrail {
  id: string;
  appraisal_id?: string;
  step_name: string;
  action: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}
