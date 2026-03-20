import { abrirModalEdicao } from './updatescript.js';
import { abrirModalConsulta } from './consultarscript.js';

let currentUserRole = null;

const statusEl = document.getElementById('mensagemStatus') || document.createElement('div');
const catalogoEl = document.getElementById('catalogo');

const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const criarCard = (produto) => {
    const card = document.createElement('div');
    card.className = 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md';
    card.style.cssText = 'display: flex; flex-direction: column;';

    const imgWrapper = document.createElement('div');
    imgWrapper.style.cssText = 'height: 224px; overflow: hidden; flex-shrink: 0;';

    const img = document.createElement('img');
    img.setAttribute('src', produto.imagem);
    img.setAttribute('alt', produto.nome);
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
    imgWrapper.appendChild(img);

    const body = document.createElement('div');
    body.className = 'p-4';
    body.style.cssText = 'display: flex; flex-direction: column; flex: 1;';

    const nome = document.createElement('h2');
    nome.className = 'text-lg font-semibold';
    nome.textContent = produto.nome;

    const descricao = document.createElement('p');
    descricao.className = 'mt-2 text-sm text-slate-600';
    descricao.style.flex = '1';
    descricao.textContent = produto.descricao;

    const preco = document.createElement('p');
    preco.className = 'mt-4 text-xl font-bold text-slate-900';
    preco.textContent = formatarMoeda(produto.preco);

    const btnArea = document.createElement('div');
    btnArea.className = 'mt-4 flex gap-2';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'painelU';
    btnEditar.textContent = 'Editar';
    btnEditar.style.display = 'none';
    btnEditar.onclick = () => abrirModalEdicao(produto);

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'painelD';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.style.display = 'none';
    btnExcluir.onclick = async () => {
        if (!confirm(`Excluir "${produto.nome}"?`)) return;
        try {
            await fetch(`/api/products/${produto.id}`, { method: 'DELETE' });
            carregarCatalogo();
        } catch (error) {
            statusEl.textContent = 'Erro ao excluir produto.';
        }
    };

    const btnConsultar = document.createElement('button');
    btnConsultar.className = 'publicS';
    btnConsultar.textContent = 'Consultar';
    btnConsultar.style.display = 'block';
    btnConsultar.onclick = () => abrirModalConsulta(produto);

    btnArea.appendChild(btnEditar);
    btnArea.appendChild(btnExcluir);
    btnArea.appendChild(btnConsultar);

    body.appendChild(nome);
    body.appendChild(descricao);
    body.appendChild(preco);
    body.appendChild(btnArea);

    card.appendChild(imgWrapper);
    card.appendChild(body);

    return card;
};

export async function carregarCatalogo() {
    try {
        const resposta = await fetch('/api/products');
        if (!resposta.ok) throw new Error('Falha ao carregar produtos.');

        const produtos = await resposta.json();
        catalogoEl.innerHTML = '';
        produtos.forEach((produto) => catalogoEl.appendChild(criarCard(produto)));
        produtos.forEach((produto) => {
            catalogoEl.appendChild(criarCard(produto));
        });
        statusEl.textContent = 'Produtos carregados.';

        if (currentUserRole) updateUI();
    } catch (erro) {
        statusEl.textContent = 'Não foi possível carregar o catálogo agora.';
    }
}

carregarCatalogo();

const updateUI = () => {
    const token = localStorage.getItem('token_supabase');
    console.log("2. Token existe no localStorage?", !!token);
    const botaoC = document.getElementById('addButton');
    const paineisU = document.querySelectorAll('.painelU');
    const paineisD = document.querySelectorAll('.painelD');

    let nivelUsuario = null;


    // Se o token existe, abrir e verificar se é válido
    if (token) {
        const payload = parseJwt(token);

        console.log("2. Token existe no localStorage?", payload);
        const tempoAtual = Math.floor(Date.now() / 1000);
        if (payload && payload.exp && payload.exp > tempoAtual) {
            nivelUsuario = payload.user_data?.nivel;
            const nome = payload.user_data?.nome || 'Usuário';
            console.log(`4. Usuário logado: ${nome}, Nível: ${nivelUsuario}`);
        } else {
            console.warn("Token expirado ou inválido. Limpando...");
            localStorage.removeItem('token_supabase');
        }
    }
    const nivelNum = nivelUsuario !== null && nivelUsuario !== undefined ? Number(nivelUsuario) : null;

    if (nivelNum === 0 || nivelNum === 1) {
        if (botaoC) botaoC.style.display = 'inline-block';
        paineisU.forEach(b => b.style.display = 'inline-block');
        paineisD.forEach(b => b.style.display = 'inline-block');
    } else {
        if (botaoC) botaoC.style.display = 'none';
        paineisU.forEach(b => b.style.display = 'none');
        paineisD.forEach(b => b.style.display = 'none');
    }
};

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginButton = document.getElementById('loginButton');
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        senha: formData.get('senha'),
    };

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        const result = await response.json();

        if (!result.success) {
            statusEl.textContent = `Erro no login: ${result.message}`;
            return;
        }

        localStorage.setItem('token_supabase', result.accessToken);
        loginButton.textContent = `Olá, ${result.user.nome}`;
        fecharELimparForm('loginModal', 'loginForm');
        statusEl.textContent = `Login bem-sucedido! ${result.nivel}`;
        updateUI();
        e.target.reset();
    } catch (error) {
        statusEl.textContent = 'Falha de conexão ao tentar login.';
    }
});

function fecharELimparForm(modalId, formId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(formId).reset();
}
window.fecharELimparForm = fecharELimparForm;

document.getElementById('imageInput').addEventListener('change', function(e) {
    const container = document.getElementById('previewContainer');
    container.innerHTML = '';

    Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.className = "w-full h-24 object-cover rounded-md border border-slate-200";
            container.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem('token_supabase');

        console.log("2. Token existe no localStorage?", payload);
        const response = await fetch('/api/produtos/criar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}` 
            },
            body: new FormData(e.target),
        });
        if (response.ok) {
            alert('Produto adicionado com sucesso!');
            document.getElementById('addModal').classList.add('hidden');
            e.target.reset();
            document.getElementById('previewContainer').innerHTML = '';
            carregarCatalogo();
        } else {
            alert('Erro ao salvar produto.');
        }
    } catch (error) {
        console.error('Erro na conexão:', error);
    }
});

function fecharELimparFormFotos(modalId, formId) {
    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    modal.classList.add('hidden');
    form.reset();
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
}
window.fecharELimparFormFotos = fecharELimparFormFotos;

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        // Ajusta os caracteres do Base64Url para Base64 padrão
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // Decodifica lidando com caracteres especiais (UTF-8)
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Erro ao ler o token:", error);
        return null;
    }
}