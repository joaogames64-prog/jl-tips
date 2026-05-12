const SUPABASE_URL = 'https://gnyzehzmakxunyktxoqa.supabase.co';
const SUPABASE_KEY = 'sb_publishable_G_uRLoO3CjpGrxGt2w87pg_8WR2V1CG';

// Create Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const SupabaseClient = (() => {
  let currentUser = null;

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session ? session.user : null;
    
    supabase.auth.onAuthStateChange((_event, session) => {
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { supabase, init, getUser, signUp, signIn, signOut };
})();
