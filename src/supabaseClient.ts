import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rvuanricjnhrkqpmkhwf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2dWFucmljam5ocmtxcG1raHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTA5NTQsImV4cCI6MjA4ODUyNjk1NH0.TrGmJHbelH8VlPGO03vyB5RFrzaNjBizgbNu3mmc5hg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'wb-supabase-auth',
  },
});
