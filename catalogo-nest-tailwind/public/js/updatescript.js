import { carregarCatalogo } from './script.js';

let produtoAtualId = null;
let imagensParaUpload = []; // Armazena objetos File (novas fotos)
let imagensExistentes = []; // Armazena URLs (fotos que já estão no Supabase)
let activeIdx = 0; // Controla qual imagem aparece no destaque do carrossel

export function abrirModalEdicao(produto) {
    const form = document.getElementById('upForm');

    produtoAtualId = produto.id;
    form.nome.value = produto.nome;
    form.descricao.value = produto.descricao;
    form.preco.value = produto.preco;

    // Inicializa os estados do carrossel
    imagensParaUpload = [];
    // Mapeia as imagens vindas do banco de dados
    imagensExistentes = (produto.produto_imagens || []).map(img => img.url_publica || img.url_path);
    activeIdx = 0;

    renderizarPreviews();
    document.getElementById('upModal').classList.remove('hidden');
}

function renderizarPreviews() {
    const container = document.getElementById('upPreviewContainer');
    const mainImg = document.getElementById('upMainImg');
    const placeholder = document.getElementById('upMainPlaceholder');
    
    container.innerHTML = '';

    // Combina imagens existentes e novas para o carrossel
    const todasImagens = [
        ...imagensExistentes.map(url => ({ src: url, type: 'existente' })),
        ...imagensParaUpload.map(file => ({ src: URL.createObjectURL(file), type: 'nova' }))
    ];

    // Atualiza a imagem principal em destaque
    if (todasImagens.length > 0) {
        if (activeIdx >= todasImagens.length) activeIdx = 0;
        mainImg.src = todasImagens[activeIdx].src;
        mainImg.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        mainImg.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }

    // Renderiza as miniaturas (thumbnails)
    todasImagens.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = `thumb ${index === activeIdx ? 'active' : ''}`;
        div.style.cssText = 'position: relative; width: 72px; height: 72px; flex-shrink: 0; cursor: pointer;';

        const imgEl = document.createElement('img');
        imgEl.src = img.src;
        imgEl.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 8px;';
        imgEl.onclick = () => {
            activeIdx = index;
            renderizarPreviews();
        };

        // Botão de excluir imagem (X)
        const btnDelete = document.createElement('button');
        btnDelete.innerHTML = '×';
        btnDelete.type = 'button';
        btnDelete.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #dc2626; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 14px; border: none; cursor: pointer; z-index: 10;';
        
        btnDelete.onclick = (e) => {
            e.stopPropagation(); // Impede que o clique selecione a imagem antes de deletar
            
            if (img.type === 'existente') {
                imagensExistentes.splice(index, 1);
            } else {
                // Ajusta o índice para remover do array de novos uploads
                const novaIdx = index - imagensExistentes.length;
                imagensParaUpload.splice(novaIdx, 1);
            }

            // Ajusta o índice ativo se a imagem removida for a última ou a atual
            if (activeIdx >= todasImagens.length - 1) {
                activeIdx = Math.max(0, todasImagens.length - 2);
            }
            
            renderizarPreviews();
        };

        div.appendChild(imgEl);
        div.appendChild(btnDelete);
        container.appendChild(div);
    });
}

// Listener para adicionar novas imagens
document.getElementById('upImageInput').addEventListener('change', function (e) {
    const novosArquivos = Array.from(e.target.files);
    imagensParaUpload = [...imagensParaUpload, ...novosArquivos];
    renderizarPreviews();
    this.value = ''; // Limpa o input para permitir selecionar o mesmo arquivo novamente
});

document.getElementById('upForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('nome', this.nome.value);
    formData.append('descricao', this.descricao.value);
    formData.append('preco', this.preco.value);
    
    // Envia a lista de URLs que restaram (as que não foram deletadas)
    formData.append('imagensExistentes', JSON.stringify(imagensExistentes));
    
    // Adiciona os novos arquivos binários
    imagensParaUpload.forEach(file => formData.append('imagens', file));

    try {
        const token = localStorage.getItem('token_supabase');
        const response = await fetch(`/api/produtos/${produtoAtualId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
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
    activeIdx = 0;
}

window.fecharELimparEdicao = fecharELimparEdicao;