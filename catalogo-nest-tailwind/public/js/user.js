document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginButton = document.getElementById('loginButton');
    const formData = new FormData(e.target);
    const dadosCadastro = {
        nome: formData.get('nome'),
        email: formData.get('email'),
        senha: formData.get('senha'),
        confirmarSenha: formData.get('confirmarSenha'),
    };

    if (dadosCadastro.senha !== dadosCadastro.confirmarSenha) {
        alert("As senhas digitadas não são iguais!");
        return;
    }

    try {
        const responseCadastro = await fetch('/api/auth/cadastro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosCadastro),
        });
        const resultCadastro = await responseCadastro.json();

        if (!resultCadastro.success || responseCadastro.status === 401) {
            alert("Erro ao criar conta.");
            fecharELimparForm('loginModal', 'loginForm');
            return;
        }

        const responseLogin = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: userData.email,
                senha: userData.senha
            }),
        });

        const resultLogin = await responseLogin.json();
        if (!responseLogin.ok || !resultLogin.success) {
            alert("Conta criada, mas faça o login manualmente.");
            fecharELimparForm('cadastroModal', 'cadastroForm');
            return;
        }
        
        localStorage.setItem('token_supabase', resultLogin.accessToken);
        const nomeUsuario = resultLogin.user?.nome || userData.nome;
        loginButton.textContent = `Olá, ${nomeUsuario}`;
        
        if (statusEl) {
            statusEl.textContent = `Login bem-sucedido!`;
            statusEl.style.color = "green";
        }

        fecharELimparForm('cadastroModal', 'cadastroForm');
        if (typeof updateUI === 'function') updateUI();
        e.target.reset();

    } catch (error) {
        console.error('Erro:', error);
        statusEl.textContent = 'Falha de conexão ao tentar login.';
        statusEl.style.color = "red";
    }
});