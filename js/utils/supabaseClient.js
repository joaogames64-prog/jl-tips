const SUPABASE_URL = 'https://gnyzehzmakxunyktxoqa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G_uRLoO3CjpGrxGt2w87pg_8WR2V1CG';

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
