import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://fkfqnkitlhhmkdtlfnpn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZnFua2l0bGhobWtkdGxmbnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNDA1NzEsImV4cCI6MjEwMzgxNjU3MX0.rqngDCrkPGQDAMEVsZhITaX6Xak1qZKTWvT-ApbmxP4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test_dart_agent@example.com',
    password: 'password123',
    options: { data: { username: 'test_dart_agent' } }
  });
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
