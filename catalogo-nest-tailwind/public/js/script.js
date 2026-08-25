import { abrirModalEdicao } from './updatescript.js';
import { abrirModalConsulta } from './consultarscript.js';

// ==========================================
// 1. VARIÁVEIS DE ESTADO E ELEMENTOS GLOBAIS
// ==========================================
let currentUser = null;
let todosOsProdutos = [];
let paginaAtual = 1;
const ITENS_POR_PAGINA = 3;

const statusEl = document.getElementById('mensagemStatus') || document.createElement('div');
const catalogoEl = document.getElementById('catalogo');
const loginButton = document.getElementById('loginButton');

const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

// ==========================================
// 2. AUTENTICAÇÃO E SESSÃO
// ==========================================
async function verificarSessao() {
    try {
        const resposta = await fetch('/api/auth/me');
        if (resposta.ok) {
            currentUser = await resposta.json();
        } else {
            currentUser = null;
        }
    } catch (erro) {
        console.error('Erro ao verificar sessão:', erro);
        currentUser = null;
    } finally {
        updateUI(); 
    }
}

async function realizarLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        currentUser = null;
        window.location.reload(); 
    } catch (erro) {
        console.error('Erro ao tentar deslogar:', erro);
    }
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            alert("Usuário ou senha inválidos. Tente novamente.");
            fecharELimparForm('loginModal', 'loginForm');
            return;
        }

        statusEl.textContent = `Login bem-sucedido!`;
        statusEl.style.color = "green";
        fecharELimparForm('loginModal', 'loginForm');
        
        await verificarSessao(); 
        
        // Atualiza os cards para mostrar os botões de edição após logar
        if (todosOsProdutos.length > 0) {
            renderizarPagina(paginaAtual);
        }

    } catch (error) {
        console.error('Erro:', error);
        statusEl.textContent = 'Falha de conexão ao tentar login.';
        statusEl.style.color = "red";
    }
});

// ==========================================
// 3. ATUALIZAÇÃO DE INTERFACE (UI)
// ==========================================
const updateUI = () => {
    const containerAcoesProduto = document.getElementById('containerAcoesProduto');
    
    // Reset do container de adicionar produto
    if (containerAcoesProduto) containerAcoesProduto.innerHTML = ''; 

    // Estado Deslogado
    if (!currentUser) {
        if (loginButton) {
            loginButton.textContent = 'Login';
            loginButton.onclick = () => document.getElementById('loginModal').classList.remove('hidden');
        }
        const btnLogoutExistente = document.getElementById('btnSairDinamico');
        if (btnLogoutExistente) btnLogoutExistente.remove();
        return;
    }

    // Estado Logado
    if (loginButton) {
        loginButton.textContent = `Olá, ${currentUser.nome || 'Usuário'}`;
        loginButton.onclick = null; 
    }

    if (!document.getElementById('btnSairDinamico')) {
        const btnLogout = document.createElement('button');
        btnLogout.id = 'btnSairDinamico';
        btnLogout.className = 'ml-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm transition-colors shadow-sm';
        btnLogout.style.backgroundColor = '#dc2626';
        btnLogout.style.color = '#ffffff';
        btnLogout.textContent = 'Sair';
        btnLogout.onclick = realizarLogout;
        
        if (loginButton && loginButton.parentNode) {
            loginButton.parentNode.insertBefore(btnLogout, loginButton.nextSibling);
        }
    }

    // Injeção de Botões (Apenas Administradores)
    const isAdmin = currentUser.nivel === 0 || currentUser.nivel === 1;
    
    if (isAdmin && containerAcoesProduto) {
        const btnCadastrar = document.createElement('button');
        btnCadastrar.className = 'painelC mb-6'; 
        btnCadastrar.textContent = 'Adicionar Produto';
        btnCadastrar.onclick = () => document.getElementById('addModal').classList.remove('hidden');
        containerAcoesProduto.appendChild(btnCadastrar);
    }
};

// ==========================================
// 4. CATÁLOGO E CARDS DE PRODUTO
// ==========================================
export async function carregarCatalogo() {
    try {
        const resposta = await fetch('/api/produtos/listagem');
        if (!resposta.ok) throw new Error(`Status: ${resposta.status}`);

        const data = await resposta.json();
        // Proteção extra: verifica se o backend devolveu o array diretamente ou dentro de { produtos: [] }
        const produtosArray = Array.isArray(data) ? data : data.produtos;
        
        if (!Array.isArray(produtosArray) || produtosArray.length === 0) {
            todosOsProdutos = [];
            catalogoEl.innerHTML = '';
            obterContainerPaginacao().innerHTML = '';
            statusEl.textContent = 'Nenhum produto encontrado.';
            return;
        }

        todosOsProdutos = produtosArray;
        renderizarPagina(1);
        statusEl.textContent = ''; // Limpa mensagem de status

    } catch (erro) {
        console.error('ERRO no carregarCatalogo:', erro);
        statusEl.textContent = 'Não foi possível carregar o catálogo agora.';
    }
}

const criarCard = (produto) => {
    const card = document.createElement('div');
    card.className = 'overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md flex flex-col';

    // Imagem
    const imgWrapper = document.createElement('div');
    imgWrapper.style.cssText = 'height: 224px; overflow: hidden; flex-shrink: 0;';
    const imgEl = document.createElement('img');
    imgEl.src = produto.produto_imagens?.[0]?.url_publica ?? 'https://placehold.co/400x300?text=Sem+Imagem';
    imgEl.alt = produto.nome;
    imgEl.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block;';
    imgWrapper.appendChild(imgEl);

    // Corpo do Card
    const body = document.createElement('div');
    body.className = 'p-4 flex flex-col flex-1';

    const nome = document.createElement('h2');
    nome.className = 'text-lg font-semibold';
    nome.textContent = produto.nome;

    const descricao = document.createElement('p');
    descricao.className = 'mt-2 text-sm text-slate-600 flex-1';
    descricao.textContent = produto.descricao;

    // Área de Preço
    const priceArea = document.createElement('div');
    priceArea.className = 'mt-4 flex items-center gap-2 flex-wrap';
    
    if (produto.promocao) {
        const precoAtual = document.createElement('p');
        precoAtual.className = 'text-xl font-bold';
        precoAtual.style.color = 'var(--color-text)';
        precoAtual.textContent = formatarMoeda(produto.preco);
        priceArea.appendChild(precoAtual);

        if (produto.preco_antigo) {
            const desconto = Math.round((1 - produto.preco / produto.preco_antigo) * 100);
            const badge = document.createElement('span');
            badge.className = 'text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-800';
            badge.textContent = `-${desconto}%`;

            const precoAntigoEl = document.createElement('span');
            precoAntigoEl.className = 'text-sm line-through text-red-500';
            precoAntigoEl.textContent = formatarMoeda(produto.preco_antigo);

            priceArea.appendChild(badge);
            priceArea.appendChild(precoAntigoEl);
        } else {
            const badge = document.createElement('span');
            badge.className = 'text-xs font-bold px-2 py-1 rounded bg-green-100 text-green-800';
            badge.textContent = `PROMOÇÃO`;
            priceArea.appendChild(badge);
        }
    } else {
        const precoAtual = document.createElement('p');
        precoAtual.className = 'text-xl font-bold';
        precoAtual.style.color = 'var(--color-text)';
        precoAtual.textContent = formatarMoeda(produto.preco);
        priceArea.appendChild(precoAtual);
    }

    // Botões de Ação Dinâmicos
    const btnArea = document.createElement('div');
    btnArea.className = 'mt-4 flex gap-2';

    const isAdmin = currentUser && (currentUser.nivel === 0 || currentUser.nivel === 1);

    if (isAdmin) {
        const btnEditar = document.createElement('button');
        btnEditar.className = 'painelU bg-yellow-500 hover:bg-yellow-600 text-white py-1 px-3 rounded text-sm';
        btnEditar.textContent = 'Editar';
        btnEditar.onclick = () => abrirModalEdicao(produto);

        const btnExcluir = document.createElement('button');
        btnExcluir.className = 'painelD bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm';
        btnExcluir.textContent = 'Excluir';
        btnExcluir.onclick = async () => {
            if (!confirm(`Excluir "${produto.nome}"?`)) return;
            try {
                const response = await fetch(`/api/produtos/${produto.id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
                carregarCatalogo();
            } catch (error) {
                statusEl.textContent = 'Erro ao excluir produto.';
            }
        };

        btnArea.appendChild(btnEditar);
        btnArea.appendChild(btnExcluir);
    }

    const btnConsultar = document.createElement('button');
    btnConsultar.className = 'publicS bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm';
    btnConsultar.textContent = 'Consultar';
    btnConsultar.onclick = () => abrirModalConsulta(produto);
    
    btnArea.appendChild(btnConsultar);

    // Montagem final do card
    body.appendChild(nome);
    body.appendChild(descricao);
    body.appendChild(priceArea);
    body.appendChild(btnArea);

    card.appendChild(imgWrapper);
    card.appendChild(body);

    return card;
};

// ==========================================
// 5. PAGINAÇÃO
// ==========================================
const obterContainerPaginacao = () => {
    let paginacaoEl = document.getElementById('paginacao');
    if (!paginacaoEl) {
        paginacaoEl = document.createElement('div');
        paginacaoEl.id = 'paginacao';
        paginacaoEl.className = 'flex items-center justify-center gap-2 flex-wrap';
        paginacaoEl.style.marginTop = '3rem';
        if(catalogoEl) catalogoEl.insertAdjacentElement('afterend', paginacaoEl);
    }
    return paginacaoEl;
};

const criarBotaoPagina = (label, { ativo = false, desabilitado = false, onClick = null } = {}) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = desabilitado;
    btn.className = ativo
        ? 'px-3 py-1.5 rounded-full text-sm font-semibold bg-white text-slate-900 border border-white'
        : 'px-3 py-1.5 rounded-full text-sm font-medium border border-slate-500 bg-transparent text-slate-200 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';
    if (onClick && !desabilitado) btn.onclick = onClick;
    return btn;
};

const renderizarControlesPaginacao = (totalPaginas) => {
    const paginacaoEl = obterContainerPaginacao();
    paginacaoEl.innerHTML = '';
    if (totalPaginas <= 1) return;

    paginacaoEl.appendChild(criarBotaoPagina('Anterior', { desabilitado: paginaAtual === 1, onClick: () => irParaPagina(paginaAtual - 1) }));

    const paginasParaMostrar = obterPaginasVisiveis(paginaAtual, totalPaginas);
    paginasParaMostrar.forEach((item) => {
        if (item === '...') {
            const span = document.createElement('span');
            span.textContent = '…';
            span.className = 'px-2 text-slate-400 select-none';
            paginacaoEl.appendChild(span);
        } else {
            paginacaoEl.appendChild(criarBotaoPagina(String(item), { ativo: item === paginaAtual, onClick: () => irParaPagina(item) }));
        }
    });

    paginacaoEl.appendChild(criarBotaoPagina('Próxima', { desabilitado: paginaAtual === totalPaginas, onClick: () => irParaPagina(paginaAtual + 1) }));
};

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

    if(catalogoEl) {
        catalogoEl.innerHTML = '';
        produtosDaPagina.forEach((produto) => catalogoEl.appendChild(criarCard(produto)));
    }

    renderizarControlesPaginacao(totalPaginas);
};

const irParaPagina = (pagina) => {
    renderizarPagina(pagina);
    catalogoEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ==========================================
// 6. MANIPULAÇÃO DE MODAIS E EVENTOS
// ==========================================
function fecharELimparForm(modalId, formId) {
    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    if(modal) modal.classList.add('hidden');
    if(form) form.reset();
}
window.fecharELimparForm = fecharELimparForm;

function fecharELimparFormFotos(modalId, formId) {
    fecharELimparForm(modalId, formId);
    const previewContainer = document.getElementById('previewContainer');
    if (previewContainer) previewContainer.innerHTML = '';
}
window.fecharELimparFormFotos = fecharELimparFormFotos;

window.abrirModalCadastro = function() {
    fecharELimparForm('loginModal', 'loginForm');
    document.getElementById('cadastroModal').classList.remove('hidden');
}

document.getElementById('imageInput')?.addEventListener('change', function (e) {
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

document.getElementById('addForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const response = await fetch('/api/produtos/criar', {
            method: 'POST',
            body: new FormData(e.target),
        });
        if (response.ok) {
            alert('Produto adicionado com sucesso!');
            fecharELimparFormFotos('addModal', 'addForm');
            await carregarCatalogo();
        } else {
            alert('Erro ao salvar produto.');
        }
    } catch (error) {
        console.error('Erro na conexão:', error);
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    const checkbox = document.getElementById("checkPromocional");
    const field = document.getElementById("promocionalField");

    if (checkbox && field) {
        checkbox.addEventListener("change", () => {
            field.classList.toggle("hidden", !checkbox.checked);
        });
    }

    // Fluxo de Inicialização
    await verificarSessao();
    await carregarCatalogo();
});