import { abrirModalEdicao } from './updatescript.js';
import { abrirModalConsulta } from './consultarscript.js';

let currentUserRole = null;

const statusEl = document.getElementById('mensagemStatus') || document.createElement('div');
const catalogoEl = document.getElementById('catalogo');

// --- ESTADO DA PAGINAÇÃO ---
const ITENS_POR_PAGINA = 3;
let todosOsProdutos = [];
let paginaAtual = 1;

const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const criarCard = (produto) => {
    const card = document.createElement('div');
    card.className = 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md';
    card.style.cssText = 'display: flex; flex-direction: column;';

    const imgWrapper = document.createElement('div');
    imgWrapper.style.cssText = 'height: 224px; overflow: hidden; flex-shrink: 0;';

    const imgEl = document.createElement('img');
    imgEl.src = produto.produto_imagens?.[0]?.url_publica ?? 'https://placehold.co/400x300?text=Sem+Imagem';
    imgEl.alt = produto.nome;
    imgEl.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
    imgWrapper.appendChild(imgEl);

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

    // --- LÓGICA DE PREÇO (NORMAL OU PROMOCIONAL) ---
    const priceArea = document.createElement('div');
    priceArea.className = 'mt-4 flex items-center gap-2 flex-wrap';

    if (produto.promocao) {
        // Preço atual usa a cor de texto padrão do tema (--color-text)
        const precoAtual = document.createElement('p');
        precoAtual.className = 'text-xl font-bold';
        precoAtual.style.color = 'var(--color-text)';
        precoAtual.textContent = formatarMoeda(produto.preco);
        priceArea.appendChild(precoAtual);

        if (produto.preco_antigo) {
            const desconto = Math.round((1 - produto.preco / produto.preco_antigo) * 100);
            const badge = document.createElement('span');
            badge.className = 'text-xs font-bold px-2 py-1 rounded';
            badge.style.backgroundColor = '#dcfce7'; // verde claro (fundo)
            badge.style.color = '#15803d'; // verde escuro (texto)
            badge.textContent = `-${desconto}%`;

            const precoAntigoEl = document.createElement('span');
            precoAntigoEl.className = 'text-sm line-through';
            precoAntigoEl.style.color = '#ef4444'; // vermelho
            precoAntigoEl.textContent = formatarMoeda(produto.preco_antigo);

            priceArea.appendChild(badge);
            priceArea.appendChild(precoAntigoEl);
        } else {
            // Caso seja marcado como promoção, mas sem preço antigo definido
            const badge = document.createElement('span');
            badge.className = 'text-xs font-bold px-2 py-1 rounded';
            badge.style.backgroundColor = '#dcfce7'; // verde claro (fundo)
            badge.style.color = '#15803d'; // verde escuro (texto)
            badge.textContent = `PROMOÇÃO`;
            priceArea.appendChild(badge);
        }
    } else {
        // Preço Normal
        const precoAtual = document.createElement('p');
        precoAtual.className = 'text-xl font-bold';
        precoAtual.style.color = 'var(--color-text)';
        precoAtual.textContent = formatarMoeda(produto.preco);
        priceArea.appendChild(precoAtual);
    }
    // --- FIM DA LÓGICA DE PREÇO ---

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
            const token = localStorage.getItem('token_supabase');
            const response = await fetch(`/api/produtos/${produto.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
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
    body.appendChild(priceArea); // Adiciona a área de preços
    body.appendChild(btnArea);

    card.appendChild(imgWrapper);
    card.appendChild(body);

    return card;
};

// --- LÓGICA DE PAGINAÇÃO ---

// Garante que exista um container para os controles de paginação logo após o catálogo
const obterContainerPaginacao = () => {
    let paginacaoEl = document.getElementById('paginacao');
    if (!paginacaoEl) {
        paginacaoEl = document.createElement('div');
        paginacaoEl.id = 'paginacao';
        paginacaoEl.className = 'flex items-center justify-center gap-2 flex-wrap';
        paginacaoEl.style.marginTop = '3rem'; // aplicado via style para não depender do build/purge do Tailwind
        catalogoEl.insertAdjacentElement('afterend', paginacaoEl);
    }
    return paginacaoEl;
};

const criarBotaoPagina = (label, { ativo = false, desabilitado = false, onClick = null } = {}) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = desabilitado;
    btn.className = ativo
        ? 'px-3 py-1.5 rounded-full text-sm font-semibold bg-white text-slate-900 border border-white'
        : 'px-3 py-1.5 rounded-full text-sm font-medium border border-slate-500 bg-transparent text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';
    // Obs: a distância em relação aos cards fica no container (#paginacao), não em cada botão —
    // colocar margem em cada botão individual não afasta a linha inteira dos cards, só desalinha os botões entre si.
    if (onClick && !desabilitado) {
        btn.onclick = onClick;
    }
    return btn;
};

const renderizarControlesPaginacao = (totalPaginas) => {
    const paginacaoEl = obterContainerPaginacao();
    paginacaoEl.innerHTML = '';

    if (totalPaginas <= 1) return; // Não mostra controles se só há uma página

    // Botão "Anterior"
    paginacaoEl.appendChild(
        criarBotaoPagina('Anterior', {
            desabilitado: paginaAtual === 1,
            onClick: () => irParaPagina(paginaAtual - 1),
        })
    );

    // Botões numerados (com reticências para muitas páginas)
    const paginasParaMostrar = obterPaginasVisiveis(paginaAtual, totalPaginas);
    paginasParaMostrar.forEach((item) => {
        if (item === '...') {
            const span = document.createElement('span');
            span.textContent = '…';
            span.className = 'px-2 text-slate-400 select-none';
            paginacaoEl.appendChild(span);
        } else {
            paginacaoEl.appendChild(
                criarBotaoPagina(String(item), {
                    ativo: item === paginaAtual,
                    onClick: () => irParaPagina(item),
                })
            );
        }
    });

    // Botão "Próxima"
    paginacaoEl.appendChild(
        criarBotaoPagina('Próxima', {
            desabilitado: paginaAtual === totalPaginas,
            onClick: () => irParaPagina(paginaAtual + 1),
        })
    );
};

// Monta a lista de páginas visíveis, ex: [1, '...', 4, 5, 6, '...', 12]
const obterPaginasVisiveis = (atual, total, delta = 1) => {
    const paginas = [];
    const inicio = Math.max(2, atual - delta);
    const fim = Math.min(total - 1, atual + delta);

    paginas.push(1);
    if (inicio > 2) paginas.push('...');
    for (let i = inicio; i <= fim; i++) paginas.push(i);
    if (fim < total - 1) paginas.push('...');
    if (total > 1) paginas.push(total);

    return paginas;
};

const renderizarPagina = (pagina) => {
    const totalPaginas = Math.max(1, Math.ceil(todosOsProdutos.length / ITENS_POR_PAGINA));
    paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);

    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    const fim = inicio + ITENS_POR_PAGINA;
    const produtosDaPagina = todosOsProdutos.slice(inicio, fim);

    catalogoEl.innerHTML = '';
    produtosDaPagina.forEach((produto) => catalogoEl.appendChild(criarCard(produto)));

    renderizarControlesPaginacao(totalPaginas);
    updateUI();
};

const irParaPagina = (pagina) => {
    renderizarPagina(pagina);
    // Rola suavemente até o topo do catálogo ao trocar de página
    catalogoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- FIM DA LÓGICA DE PAGINAÇÃO ---

export async function carregarCatalogo() {
    try {
        const token = localStorage.getItem('token_supabase');

        const resposta = await fetch('/api/produtos/listagem', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!resposta.ok) throw new Error(`Falha ao carregar produtos. Status: ${resposta.status}`);

        const { produtos, podeAtualizarUI } = await resposta.json();
        if (!Array.isArray(produtos) || produtos.length === 0) {
            todosOsProdutos = [];
            catalogoEl.innerHTML = '';
            obterContainerPaginacao().innerHTML = '';
            statusEl.textContent = 'Nenhum produto encontrado.';
            return;
        }

        todosOsProdutos = produtos;
        renderizarPagina(1); // Sempre volta para a primeira página ao recarregar
        statusEl.textContent = 'Produtos carregados.';

    } catch (erro) {
        console.error('ERRO GRAVE no carregarCatalogo:', erro);
        statusEl.textContent = 'Não foi possível carregar o catálogo agora.';
    }
}

carregarCatalogo();

const updateUI = () => {
    const token = localStorage.getItem('token_supabase');
    const botaoC = document.getElementById('addButton');
    const paineisU = document.querySelectorAll('.painelU');
    const paineisD = document.querySelectorAll('.painelD');
    const loginButton = document.getElementById('loginButton');

    // 1. Esconde tudo por padrão
    if (botaoC) botaoC.style.display = 'none';
    paineisU.forEach(b => b.style.display = 'none');
    paineisD.forEach(b => b.style.display = 'none');

    // 2. Se não existe token válido, reseta o botão e para por aqui
    if (!token || token === 'null' || token === 'undefined') {
        if (loginButton) loginButton.textContent = 'Login';
        return;
    }

    const payload = parseJwt(token);
    const tempoAtual = Math.floor(Date.now() / 1000);

    // 3. Se o token expirou ou é inválido, limpa do navegador
    if (!payload || !payload.exp || payload.exp <= tempoAtual) {
        localStorage.removeItem('token_supabase');
        if (loginButton) loginButton.textContent = 'Login';
        return;
    }

    if (payload.user_data?.nome) {
        if (loginButton) loginButton.textContent = `Olá, ${payload.user_data.nome}`;
    }

    // 4. Checagem blindada do nível (Evita que valores vazios sejam convertidos em 0)
    const nivel = payload.user_data?.nivel;
    if (nivel !== undefined && nivel !== null && (Number(nivel) === 0 || Number(nivel) === 1)) {
        if (botaoC) botaoC.style.display = 'inline-block';
        paineisU.forEach(b => b.style.display = 'inline-block');
        paineisD.forEach(b => b.style.display = 'inline-block');
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

        if (!result.success || response.status === 401) {
            alert("Usuário ou senha inválidos. Tente novamente.");
            fecharELimparForm('loginModal', 'loginForm');
            return;
        }

        // Login bem-sucedido
        localStorage.setItem('token_supabase', result.accessToken);
        loginButton.textContent = `Olá, ${result.user.nome}`;
        fecharELimparForm('loginModal', 'loginForm');

        statusEl.textContent = `Login bem-sucedido!`;
        statusEl.style.color = "green";

        updateUI();
        e.target.reset();

    } catch (error) {
        console.error('Erro:', error);
        statusEl.textContent = 'Falha de conexão ao tentar login.';
        statusEl.style.color = "red";
    }
});

function fecharELimparForm(modalId, formId) {
    document.getElementById(modalId).classList.add('hidden');
    document.getElementById(formId).reset();
}
window.fecharELimparForm = fecharELimparForm;

document.getElementById('imageInput').addEventListener('change', function (e) {
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
            await carregarCatalogo();
            updateUI();
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
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Erro ao ler o token:", error);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const checkbox = document.getElementById("checkPromocional");
    const field = document.getElementById("promocionalField");

    checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
            field.classList.remove("hidden");
        } else {
            field.classList.add("hidden");
        }
    });
});

function abrirModalCadastro() {
    fecharELimparForm('loginModal', 'loginForm');
    document.getElementById('cadastroModal').classList.remove('hidden');
}

function abrirEsqueciSenha() {
    alert("Função de recuperação de senha será implementada em breve.");
}