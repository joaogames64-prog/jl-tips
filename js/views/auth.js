const AuthView = (() => {
  let isLogin = true;

  const render = () => {
    return `
    <div class="view-container" style="max-width:400px; margin: 0 auto; padding-top: 40px;">
      <div style="text-align:center; margin-bottom: 30px;">
        <div style="font-size: 48px; margin-bottom: 10px;">🛡️</div>
        <h2>${isLogin ? 'Bem-vindo de volta' : 'Criar nova conta'}</h2>
        <p class="text-muted">Acesse suas apostas de qualquer lugar, salvas na nuvem com segurança.</p>
      </div>

      <form class="card" style="padding: 24px;" onsubmit="AuthView.handleSubmit(event)">
        <div class="form-section">
          <label class="form-label">E-mail</label>
          <input type="email" id="auth-email" class="form-input" required placeholder="seu@email.com">
        </div>
        
        <div class="form-section">
          <label class="form-label">Senha</label>
          <input type="password" id="auth-password" class="form-input" required placeholder="••••••••" minlength="6">
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;" id="auth-btn">
          ${isLogin ? 'Entrar' : 'Cadastrar'}
        </button>
        
        <div style="text-align: center; margin-top: 20px;">
          <a href="#" style="color: var(--primary); text-decoration: none; font-size: 14px;" onclick="AuthView.toggleMode(event)">
            ${isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
          </a>
        </div>
      </form>
    </div>
    `;
  };

  const toggleMode = (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    App.navigate('auth');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const btn = document.getElementById('auth-btn');
    
    btn.innerHTML = '<span style="animation: spin 1s linear infinite; display: inline-block;">⏳</span>';
    btn.disabled = true;

    try {
      if (isLogin) {
        await SupabaseClient.signIn(email, password);
        App.showToast('Login realizado com sucesso!', 'success');
        
        // Puxa os dados da nuvem para o local
        await Storage.pullFromSupabase();
      } else {
        await SupabaseClient.signUp(email, password);
        App.showToast('Conta criada! Verifique seu email ou faça login se já ativada.', 'success');
        
        // Pergunta se quer subir dados locais pro supabase
        const localBets = Storage.getBets();
        if (localBets.length > 0) {
          if (confirm('Deseja migrar suas apostas e bancas atuais do celular para sua nova conta na nuvem?')) {
            await Storage.pushAllToSupabase();
            App.showToast('Dados migrados com sucesso!', 'success');
          }
        }
        
        // Entra automaticamente após o cadastro se o Supabase permitir
        try {
          await SupabaseClient.signIn(email, password);
        } catch(e) {}
      }
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      btn.innerHTML = isLogin ? 'Entrar' : 'Cadastrar';
      btn.disabled = false;
    }
  };

  return { render, toggleMode, handleSubmit };
})();
