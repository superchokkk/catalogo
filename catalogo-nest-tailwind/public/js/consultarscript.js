/* ─────────────────────────────────────────
   Estado
───────────────────────────────────────── */
let consultaImages   = [];
let consultaActiveIdx = 0;
let produtoAtualConsulta = null;
const zap = '5545999650583';

const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

/* ─────────────────────────────────────────
   Renderiza bloco de preço no modal
───────────────────────────────────────── */
function renderizarPreco(produto) {
    const wrapper = document.getElementById('descPrecoWrapper');
    wrapper.innerHTML = '';

    // Mudar de oldprice para preco_antigo
    if (produto.preco_antigo != null) {
        const topRow = document.createElement('div');
        topRow.className = 'desc-preco-top-row';

        const antigo = document.createElement('span');
        antigo.className = 'desc-preco-antigo';
        antigo.style.color = '#ef4444'; // vermelho (sobrescreve qualquer cor definida no CSS da classe)
        antigo.textContent = formatarMoeda(produto.preco_antigo);

        const desconto = Math.round((1 - produto.preco / produto.preco_antigo) * 100);
        const badge = document.createElement('span');
        badge.className = 'desc-preco-badge';
        badge.style.backgroundColor = '#dcfce7'; // verde claro (fundo)
        badge.style.color = '#15803d'; // verde escuro (texto)
        badge.textContent = `-${desconto}%`;

        topRow.appendChild(antigo);
        topRow.appendChild(badge);
        wrapper.appendChild(topRow);
    }

    const atual = document.createElement('p');
    atual.className = 'desc-preco-atual';
    // Preço atual sempre usa a cor de texto padrão do tema, com ou sem promoção
    atual.style.color = 'var(--color-text)';
    atual.textContent = formatarMoeda(produto.preco);
    wrapper.appendChild(atual);
}

/* ─────────────────────────────────────────
   Abrir — preenche com dados do produto
───────────────────────────────────────── */
export function abrirModalConsulta(produto) {
    produtoAtualConsulta = produto;

    document.getElementById('descNome').value      = produto.nome      || '';
    document.getElementById('descDescricao').value = produto.descricao || '';

    renderizarPreco(produto);
    const imagens = Array.isArray(produto.produto_imagens)
        ? produto.produto_imagens
        : [];

    consultaImages    = imagens.map(img => ({ url: img.url_publica }));
    consultaActiveIdx = 0;
    consultaRenderThumbs();
    consultaUpdateMainImage();

    document.getElementById('descModal').classList.add('open');
}

/* ─────────────────────────────────────────
   Fechar e limpar
───────────────────────────────────────── */
export function fecharModalConsulta() {
    document.getElementById('descModal').classList.remove('open');
    document.getElementById('descNome').value      = '';
    document.getElementById('descDescricao').value = '';
    document.getElementById('descPrecoWrapper').innerHTML = '';
    consultaImages    = [];
    consultaActiveIdx = 0;
    consultaRenderThumbs();
    consultaUpdateMainImage();
}
window.fecharModalConsulta = fecharModalConsulta;

/* ─────────────────────────────────────────
   Imagem principal
───────────────────────────────────────── */
function consultaUpdateMainImage() {
    const mainImg     = document.getElementById('descMainImg');
    const placeholder = document.getElementById('descMainPlaceholder');

    if (consultaImages.length > 0) {
        mainImg.src               = consultaImages[consultaActiveIdx].url;
        mainImg.style.display     = 'block';
        placeholder.style.display = 'none';
    } else {
        mainImg.style.display     = 'none';
        placeholder.style.display = 'flex';
    }
}

/* ─────────────────────────────────────────
   Miniaturas
───────────────────────────────────────── */
function consultaRenderThumbs() {
    const container = document.getElementById('descThumbsContainer');
    container.innerHTML = '';

    if (consultaImages.length === 0) {
        [2, 3, 4].forEach(n => {
            const div = document.createElement('div');
            div.className = 'thumb';
            div.innerHTML = `<div class="thumb-placeholder">Img ${n}</div>`;
            container.appendChild(div);
        });
        return;
    }

    consultaImages.forEach((img, i) => {
        const div = document.createElement('div');
        div.className = 'thumb' + (i === consultaActiveIdx ? ' active' : '');
        div.innerHTML = `<img src="${img.url}" alt="Miniatura ${i + 1}" />`;
        div.addEventListener('click', () => {
            consultaActiveIdx = i;
            consultaUpdateMainImage();
            consultaRenderThumbs();
        });
        container.appendChild(div);
    });
}

/* ─────────────────────────────────────────
   Scroll do carrossel
───────────────────────────────────────── */
document.getElementById('descScrollRight').addEventListener('click', () => {
    consultaActiveIdx = (consultaActiveIdx + 1) % consultaImages.length;

    consultaUpdateMainImage();
    consultaRenderThumbs();
    const container = document.getElementById('descThumbsContainer');
    const thumbAtiva = container.children[consultaActiveIdx];
    if (thumbAtiva) {
        thumbAtiva.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
});

/* ─────────────────────────────────────────
   Fechar clicando no backdrop
───────────────────────────────────────── */
document.getElementById('descModal').addEventListener('click', function (e) {
    if (e.target === this) fecharModalConsulta();
});

/* ─────────────────────────────────────────
   Init
───────────────────────────────────────── */
consultaRenderThumbs();

/* ─────────────────────────────────────────
   chamar no zap
───────────────────────────────────────── */
const btnConsult = document.getElementById('btnConsult');
btnConsult.addEventListener('click', () => {
    const nome = loginButton.textContent;
    let frase = "";
    if (nome === "Login") {
        frase = "";
    } else if (nome.startsWith("Olá,")) {
        const usuario = nome.replace("Olá, ", "").trim();
        frase = `Me chamo ${usuario}. `;
    }

    const vlrAtualFormatado = formatarMoeda(produtoAtualConsulta.preco);
    let vlrProduto = "";
    if (produtoAtualConsulta.promocao) {
        if (produtoAtualConsulta.preco_antigo) {
            const vlrAntigoFormatado = formatarMoeda(produtoAtualConsulta.preco_antigo);
            vlrProduto = 'que esta em promoção, de ' + vlrAntigoFormatado + ' por ' + vlrAtualFormatado;
        } else {
            vlrProduto = 'que esta em promoção, no valor de ' + vlrAtualFormatado;
        }
    } else {
        vlrProduto = 'no valor de ' + vlrAtualFormatado;
    }

    const nomeProduto = document.getElementById('descNome').value;
    const mensagem = `Olá! ${frase}Tenho interesse no produto: ${nomeProduto}, ${vlrProduto}.\nGostaria de mais informações.`;
    const textoCodificado = encodeURIComponent(mensagem);
    const urlWhatsApp = `https://wa.me/${zap}?text=${textoCodificado}`;
    window.open(urlWhatsApp, '_blank');
});