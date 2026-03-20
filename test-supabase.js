import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://afezmnrtjgndluzmtcpv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmZXptbnJ0amduZGx1em10Y3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDE0MDAsImV4cCI6MjA4ODYxNzQwMH0.gkzCRasUCa-2WAwif_K0eaG5yEasbfdn6aQnBnPD8fg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching...");
  const { data, error } = await supabase.from('questions').select('*');
  console.log("Error:", error);
  console.log("Data:", data);
}

test();
