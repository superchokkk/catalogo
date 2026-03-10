/* ─────────────────────────────────────────
   Estado
───────────────────────────────────────── */
let consultaImages   = [];
let consultaActiveIdx = 0;

const formatarMoeda = (valor) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

/* ─────────────────────────────────────────
   Renderiza bloco de preço no modal
───────────────────────────────────────── */
function renderizarPreco(produto) {
    const wrapper = document.getElementById('descPrecoWrapper');
    wrapper.innerHTML = '';

    if (produto.oldprice != null) {
        const topRow = document.createElement('div');
        topRow.className = 'desc-preco-top-row';

        const antigo = document.createElement('span');
        antigo.className = 'desc-preco-antigo';
        antigo.textContent = formatarMoeda(produto.oldprice);

        const desconto = Math.round((1 - produto.preco / produto.oldprice) * 100);
        const badge = document.createElement('span');
        badge.className = 'desc-preco-badge';
        badge.textContent = `-${desconto}%`;

        topRow.appendChild(antigo);
        topRow.appendChild(badge);
        wrapper.appendChild(topRow);
    }

    const atual = document.createElement('p');
    atual.className = 'desc-preco-atual';
    atual.textContent = formatarMoeda(produto.preco);
    wrapper.appendChild(atual);
}

/* ─────────────────────────────────────────
   Abrir — preenche com dados do produto
───────────────────────────────────────── */
export function abrirModalConsulta(produto) {
    document.getElementById('descNome').value      = produto.nome      || '';
    document.getElementById('descDescricao').value = produto.descricao || '';

    renderizarPreco(produto);

    const urls = Array.isArray(produto.imagens)
        ? produto.imagens
        : produto.imagem ? [produto.imagem] : [];

    consultaImages    = urls.map(url => ({ url }));
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
    document.getElementById('descThumbsContainer').scrollBy({ left: 100, behavior: 'smooth' });
});

/* ─────────────────────────────────────────
   Botão Consulte-nos
───────────────────────────────────────── */
document.getElementById('btnConsult').addEventListener('click', () => {
    const nome = document.getElementById('descNome').value || 'este produto';
    alert(`Obrigado pelo interesse em "${nome}"! Entraremos em contato.`);
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