// إعدادات اتصال Supabase

// 1. رابط المشروع الخاص بك (استنتجته من الرابط اللي في الصورة)
const SUPABASE_URL = 'https://xdipeuppyusmxmnregwm.supabase.co';

// 2. المفتاح العام (Publishable key) - ستحتاج لنسخه من الصفحة التي قمت بتصويرها ولصقه هنا بدلاً من هذه الجملة
const SUPABASE_KEY = 'sb_publishable_dFFoaBHCOWG2j552pYyP3g_wfmi1xsp';

// تهيئة العميل
export const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
