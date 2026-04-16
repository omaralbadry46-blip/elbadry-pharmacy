import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// 1. رابط المشروع
const SUPABASE_URL = 'https://xdipeuppyusmxmnregwm.supabase.co';

// 2. المفتاح العام
const SUPABASE_KEY = 'sb_publishable_dFFoaBHCOWG2j552pYyP3g_wfmi1xsp';

// تهيئة العميل
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
