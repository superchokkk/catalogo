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

        // Correção 1: Checamos se a requisição HTTP falhou (response.ok), pois o backend não envia 'success'
        if (!responseCadastro.ok) {
            alert(`Erro ao criar conta: ${resultCadastro.message || 'Verifique os dados.'}`);
            return;
        }

        // Tenta fazer o login automaticamente
        const responseLogin = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // Correção 2: Usar 'dadosCadastro' ao invés de 'userData'
                email: dadosCadastro.email,
                senha: dadosCadastro.senha
            }),
        });

        const resultLogin = await responseLogin.json();
        if (!responseLogin.ok || !resultLogin.success) {
            alert("Conta criada com sucesso, mas faça o login manualmente.");
            fecharELimparForm('cadastroModal', 'cadastroForm');
            return;
        }
        
        localStorage.setItem('token_supabase', resultLogin.accessToken);
        
        // Correção 3: Usar 'dadosCadastro' ao invés de 'userData'
        const nomeUsuario = resultLogin.user?.nome || dadosCadastro.nome;
        if (loginButton) loginButton.textContent = `Olá, ${nomeUsuario}`;
        
        // Pega o elemento de status diretamente do DOM, caso ele não esteja no escopo global
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = `Login bem-sucedido!`;
            statusEl.style.color = "green";
        }

        fecharELimparForm('cadastroModal', 'cadastroForm');
        
        // Chama o updateUI global, se existir (ele vem do script.js)
        if (typeof updateUI === 'function') updateUI();
        
    } catch (error) {
        console.error('Erro:', error);
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = 'Falha de conexão ao tentar registrar/logar.';
            statusEl.style.color = "red";
        }
    }
});