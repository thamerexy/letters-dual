import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://afezmnrtjgndluzmtcpv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZXptbnJ0amduZGx1em10Y3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDE0MDAsImV4cCI6MjA4ODYxNzQwMH0.gkzCRasUCa-2WAwif_K0eaG5yEasbfdn6aQnBnPD8fg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function getPasscode() {
  const { data, error } = await supabase.from('admin_passcodes').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Passcodes:', data);
}

getPasscode();
