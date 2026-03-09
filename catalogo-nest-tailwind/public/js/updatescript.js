import { carregarCatalogo } from './script.js';

let produtoAtualId = null;
let imagensParaUpload = [];
let imagensExistentes = [];

export function abrirModalEdicao(produto) {
    const form = document.getElementById('upForm');

    produtoAtualId = produto.id;
    form.nome.value = produto.nome;
    form.descricao.value = produto.descricao;
    form.preco.value = produto.preco;

    imagensParaUpload = [];
    imagensExistentes = produto.imagens ? [...produto.imagens] : [produto.imagem];

    renderizarPreviews();
    document.getElementById('upModal').classList.remove('hidden');
}

function renderizarPreviews() {
    const container = document.getElementById('upPreviewContainer');
    container.innerHTML = '';
    container.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-top: 12px;';

    imagensExistentes.forEach((url, index) => {
        container.appendChild(criarMiniatura(url, () => {
            imagensExistentes.splice(index, 1);
            renderizarPreviews();
        }, true));
    });

    imagensParaUpload.forEach((file, index) => {
        const urlBlob = URL.createObjectURL(file);
        container.appendChild(criarMiniatura(urlBlob, () => {
            imagensParaUpload.splice(index, 1);
            renderizarPreviews();
        }, false));
    });
}

function criarMiniatura(src, onRemove, isExistente) {
    const div = document.createElement('div');
    div.style.cssText = 'display: block; width: 100%; height: 80px; position: relative; overflow: hidden; border-radius: 6px; margin-bottom: 8px;';

    const img = document.createElement('img');
    img.setAttribute('src', src);
    img.style.cssText = `display:block; width:100%; height:80px; object-fit:cover; border-radius:6px; border: 2px solid ${isExistente ? '#60a5fa' : '#e2e8f0'};`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Remover imagem';
    btn.textContent = '×';
    btn.style.cssText = 'position:absolute; top:4px; right:4px; width:24px; height:24px; background:red; color:white; border:none; border-radius:50%; cursor:pointer; font-size:16px; line-height:1; z-index:9999; display:flex; align-items:center; justify-content:center;';
    btn.onclick = (e) => {
        e.preventDefault();
        onRemove();
    };

    div.appendChild(img);
    div.appendChild(btn);

    return div;
}

document.getElementById('upImageInput').addEventListener('change', function (e) {
    imagensParaUpload = [...imagensParaUpload, ...Array.from(e.target.files)];
    renderizarPreviews();
    this.value = '';
});

document.getElementById('upForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('nome', this.nome.value);
    formData.append('descricao', this.descricao.value);
    formData.append('preco', this.preco.value);
    formData.append('imagensExistentes', JSON.stringify(imagensExistentes));
    imagensParaUpload.forEach(f => formData.append('imagens', f));

    try {
        const response = await fetch(`/api/products/${produtoAtualId}`, {
            method: 'PUT',
            body: formData,
        });

        if (response.ok) {
            alert('Produto atualizado com sucesso!');
            fecharELimparEdicao();
            carregarCatalogo();
        } else {
            alert('Erro ao atualizar produto.');
        }
    } catch (error) {
        console.error('Erro na conexão:', error);
    }
});

function fecharELimparEdicao() {
    document.getElementById('upModal').classList.add('hidden');
    document.getElementById('upForm').reset();
    document.getElementById('upPreviewContainer').innerHTML = '';
    imagensParaUpload = [];
    imagensExistentes = [];
    produtoAtualId = null;
}
window.fecharELimparEdicao = fecharELimparEdicao;