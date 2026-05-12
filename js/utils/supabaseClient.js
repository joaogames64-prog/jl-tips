const SUPABASE_URL = 'https://gnyzehzmakxunyktxoqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdueXplaHptYWt4dW55a3R4b3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MDc1MjgsImV4cCI6MjA5NDE4MzUyOH0.hTfYstjfplu9WJjll42UGFUfdaF5OUQ7JkS0cEdoYZo';

const SupabaseClient = (() => {
  // Create Supabase client instance (avoids name collision with global 'supabase')
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let currentUser = null;

  const init = async () => {
    const { data: { session } } = await client.auth.getSession();
    currentUser = session ? session.user : null;
    
    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session ? session.user : null;
      if (_event === 'SIGNED_IN') {
        App.navigate('dashboard');
      } else if (_event === 'SIGNED_OUT') {
        App.navigate('auth');
      }
    });
  };

  const getUser = () => currentUser;

  const signUp = async (email, password) => {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await client.auth.signOut();
  };

  return { supabase: client, init, getUser, signUp, signIn, signOut };
})();
