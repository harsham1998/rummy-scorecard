import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://fwykhpjucubpbrbqcmgi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3eWtocGp1Y3VicGJyYnFjbWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1Njc5MTQsImV4cCI6MjA4OTE0MzkxNH0.7W1Hz6lbjJBSRsnszeNkIDcwkphYmvLatZCqZoz8XMA'
);
