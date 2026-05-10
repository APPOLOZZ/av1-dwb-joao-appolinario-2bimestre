const API_BASE = 'https://www.dnd5eapi.co';

// ─── Configuração de cada categoria ──────────────────────────────────────────
const CATEGORIAS = {
  monsters: {
    titulo:   'Bestiário',
    endpoint: '/api/monsters',
    icone:    '🐉',
    getBadges: (item) => [
      item.type              && { texto: item.type,                             classe: '' },
      item.size              && { texto: item.size,                             classe: '' },
      item.challenge_rating != null && { texto: `CR ${item.challenge_rating}`, classe: 'gold' },
      item.hit_points        && { texto: `${item.hit_points} HP`,               classe: 'highlight' },
    ].filter(Boolean),
  },
  spells: {
    titulo:   'Grimório de Magias',
    endpoint: '/api/spells',
    icone:    '✨',
    getBadges: (item) => [
      item.level != null    && { texto: item.level === 0 ? 'Truque' : `Nível ${item.level}`, classe: 'gold' },
      item.school?.name     && { texto: item.school.name,                       classe: '' },
      item.casting_time     && { texto: item.casting_time,                      classe: '' },
      item.range            && { texto: item.range,                             classe: '' },
    ].filter(Boolean),
  },
  classes: {
    titulo:   'Ordens & Classes',
    endpoint: '/api/classes',
    icone:    '⚔️',
    getBadges: (item) => [
      item.hit_die          && { texto: `d${item.hit_die} Hit Die`,             classe: 'gold' },
      ...(item.proficiencies?.slice(0, 2).map(p => ({ texto: p.name, classe: '' })) ?? []),
    ].filter(Boolean),
  },
  equipment: {
    titulo:   'Arsenal & Equipamentos',
    endpoint: '/api/equipment',
    icone:    '🛡️',
    getBadges: (item) => [
      item.equipment_category?.name && { texto: item.equipment_category.name,  classe: '' },
      item.cost  && { texto: `${item.cost.quantity} ${item.cost.unit}`,        classe: 'gold' },
      item.weight && { texto: `${item.weight} lb`,                            classe: '' },
    ].filter(Boolean),
  },
};

// ─── Estado ───────────────────────────────────────────────────────────────────
const cache      = {};           // cache de itens carregados por categoria
const imgCache   = {};           // cache de imagens do Wikipedia
let favoritos    = carregarFavoritos(); // { "monsters:aboleth": { item, categoria }, ... }
let categoriaAtiva = 'monsters';
let termoBusca   = '';

// ─── Elementos DOM ────────────────────────────────────────────────────────────
const loading           = document.getElementById('loading');
const errorMsg          = document.getElementById('error');
const cardContainer     = document.getElementById('card-container');
const sectionTitle      = document.getElementById('section-title');
const sectionCount      = document.getElementById('section-count');
const tabBtns           = document.querySelectorAll('.tab-btn');
const searchInput       = document.getElementById('search-input');
const searchClear       = document.getElementById('search-clear');
const searchResultCount = document.getElementById('search-result-count');
const searchWrapper     = document.getElementById('search-wrapper');
const favCountBadge     = document.getElementById('fav-count');

// ─── Favoritos — persistência com localStorage ────────────────────────────────
function carregarFavoritos() {
  try { return JSON.parse(localStorage.getItem('dnd_favoritos') || '{}'); }
  catch { return {}; }
}

function salvarFavoritos() {
  localStorage.setItem('dnd_favoritos', JSON.stringify(favoritos));
}

function favKey(item, categoria) {
  return `${categoria}:${item.index}`;
}

function toggleFavorito(item, categoria) {
  const key = favKey(item, categoria);
  if (favoritos[key]) {
    delete favoritos[key];
  } else {
    favoritos[key] = { item, categoria };
  }
  salvarFavoritos();
  atualizarBadgeFavoritos();

  // Atualiza o ícone do botão no card visível
  const btn = document.querySelector(`[data-fav-key="${key}"]`);
  if (btn) {
    btn.textContent = favoritos[key] ? '⭐' : '☆';
    btn.classList.toggle('active', !!favoritos[key]);
    btn.title = favoritos[key] ? 'Remover dos favoritos' : 'Adicionar aos favoritos';
  }

  // Se estiver na aba de favoritos, recarrega a view
  if (categoriaAtiva === 'favorites') exibirFavoritos();
}

function atualizarBadgeFavoritos() {
  const total = Object.keys(favoritos).length;
  favCountBadge.textContent = total;
  favCountBadge.classList.toggle('d-none', total === 0);
}

// ─── Pesquisa ─────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  termoBusca = searchInput.value.trim().toLowerCase();
  searchClear.classList.toggle('d-none', !termoBusca);

  if (categoriaAtiva === 'favorites') {
    exibirFavoritos();
  } else if (cache[categoriaAtiva]) {
    filtrarEExibir(cache[categoriaAtiva], CATEGORIAS[categoriaAtiva]);
  }
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  termoBusca = '';
  searchClear.classList.add('d-none');
  searchResultCount.textContent = '';
  if (categoriaAtiva === 'favorites') {
    exibirFavoritos();
  } else if (cache[categoriaAtiva]) {
    filtrarEExibir(cache[categoriaAtiva], CATEGORIAS[categoriaAtiva]);
  }
});

// ─── Navegação por abas ───────────────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    categoriaAtiva = btn.dataset.category;

    // Limpa a busca ao trocar de aba
    searchInput.value = '';
    termoBusca = '';
    searchClear.classList.add('d-none');
    searchResultCount.textContent = '';

    if (categoriaAtiva === 'favorites') {
      // Esconde a barra de pesquisa na aba de favoritos (usaremos a mesma)
      exibirFavoritos();
    } else {
      carregarCategoria(categoriaAtiva);
    }
  });
});

// ─── Aba de Favoritos ─────────────────────────────────────────────────────────
function exibirFavoritos() {
  sectionTitle.textContent = 'Pergaminhos Favoritos';
  errorMsg.classList.add('d-none');
  cardContainer.innerHTML = '';

  let itens = Object.values(favoritos);

  // Aplica filtro de busca
  if (termoBusca) {
    itens = itens.filter(({ item }) =>
      item.name.toLowerCase().includes(termoBusca) ||
      item.index.toLowerCase().includes(termoBusca)
    );
  }

  if (itens.length === 0) {
    sectionCount.textContent = '';
    cardContainer.innerHTML = `
      <div class="col-12 fav-empty">
        <span class="fav-empty-icon">⭐</span>
        ${termoBusca
          ? `Nenhum favorito encontrado para "<strong>${termoBusca}</strong>".`
          : 'Você ainda não favoritou nenhum item.<br>Clique em ☆ nos cards para adicionar!'}
      </div>`;
    searchResultCount.textContent = termoBusca ? 'Nenhum resultado.' : '';
    return;
  }

  sectionCount.textContent = `${itens.length} favorito${itens.length > 1 ? 's' : ''}`;
  if (termoBusca) searchResultCount.textContent = `${itens.length} resultado(s) para "${termoBusca}"`;

  itens.forEach(({ item, categoria }, idx) => {
    const config = CATEGORIAS[categoria];
    cardContainer.appendChild(criarCard(item, config, idx, categoria));
  });
}

// ─── Carregamento de categoria ────────────────────────────────────────────────
async function carregarCategoria(categoria) {
  const config = CATEGORIAS[categoria];
  sectionTitle.textContent = config.titulo;
  sectionCount.textContent = '';
  cardContainer.innerHTML  = '';
  errorMsg.classList.add('d-none');
  searchResultCount.textContent = '';

  if (cache[categoria]) {
    filtrarEExibir(cache[categoria], config);
    return;
  }

  mostrarLoading(true);

  try {
    const url = `${API_BASE}${config.endpoint}`;
    console.log('Buscando lista:', url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

    const data  = await res.json();
    const lista = data.results;
    if (!lista || lista.length === 0) throw new Error('Lista vazia retornada pela API.');

    mostrarLoading(false);
    sectionCount.textContent = `Carregando ${lista.length} itens...`;

    const detalhes = await buscarEmLotes(lista, 10, config, categoria);
    cache[categoria] = detalhes;
    atualizarContagem(detalhes.length);

  } catch (erro) {
    mostrarLoading(false);
    errorMsg.classList.remove('d-none');
    errorMsg.textContent = `⚠️ Erro: ${erro.message}`;
    console.error('Erro ao carregar:', erro);
  }
}

// ─── Busca em lotes ───────────────────────────────────────────────────────────
async function buscarEmLotes(lista, tamLote, config, categoria) {
  const todos = [];

  for (let i = 0; i < lista.length; i += tamLote) {
    const lote = lista.slice(i, i + tamLote);

    const detalhes = await Promise.all(
      lote.map(item =>
        fetch(`${API_BASE}${item.url}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );

    const validos = detalhes.filter(Boolean);
    todos.push(...validos);

    // Exibe só os que passam no filtro de busca atual
    validos.forEach((item, idx) => {
      if (!termoBusca || item.name.toLowerCase().includes(termoBusca) || item.index.toLowerCase().includes(termoBusca)) {
        cardContainer.appendChild(criarCard(item, config, i + idx, categoria));
      }
    });

    sectionCount.textContent = `${todos.length} itens carregados...`;
  }

  return todos;
}

// ─── Filtra e exibe itens do cache ────────────────────────────────────────────
function filtrarEExibir(itens, config) {
  cardContainer.innerHTML = '';
  const filtrados = termoBusca
    ? itens.filter(item =>
        item.name.toLowerCase().includes(termoBusca) ||
        item.index.toLowerCase().includes(termoBusca)
      )
    : itens;

  filtrados.forEach((item, idx) => cardContainer.appendChild(criarCard(item, config, idx, categoriaAtiva)));
  atualizarContagem(filtrados.length, itens.length);
}

function atualizarContagem(visiveis, total) {
  if (total && visiveis !== total) {
    sectionCount.textContent = `${visiveis} de ${total} itens`;
    searchResultCount.textContent = `${visiveis} resultado(s) para "${termoBusca}"`;
  } else {
    sectionCount.textContent = `${visiveis} itens encontrados`;
    searchResultCount.textContent = '';
  }
}

// ─── Busca imagem em múltiplas fontes ────────────────────────────────────────
async function buscarImagem(nome) {
  if (imgCache[nome] !== undefined) return imgCache[nome];

  const nomeCodificado    = encodeURIComponent(nome);
  const nomeComContexto   = encodeURIComponent(`${nome} Dungeons Dragons`);
  const nomeComMonstro    = encodeURIComponent(`${nome} monster`);

  const fontes = [
    // 1. Forgotten Realms Wiki (Fandom) — melhor fonte para D&D
    () => fetch(`https://forgottenrealms.fandom.com/api.php?action=query&titles=${nomeCodificado}&prop=pageimages&format=json&pithumbsize=400&origin=*`)
            .then(r => r.json())
            .then(d => Object.values(d.query?.pages ?? {})[0]?.thumbnail?.source ?? null),

    // 2. D&D Beyond Wiki (Fandom alternativo)
    () => fetch(`https://www.dndbeyond.com/search?q=${nomeCodificado}`)
            .then(() => null), // Só placeholder — site não tem API de imagem pública

    // 3. DnD Wiki (community wiki)
    () => fetch(`https://dnd-wiki.org/api.php?action=query&titles=${nomeCodificado}&prop=pageimages&format=json&pithumbsize=400&origin=*`)
            .then(r => r.json())
            .then(d => Object.values(d.query?.pages ?? {})[0]?.thumbnail?.source ?? null),

    // 4. Wikipedia com contexto D&D
    () => fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${nomeComContexto}&prop=pageimages&format=json&pithumbsize=400&origin=*`)
            .then(r => r.json())
            .then(d => Object.values(d.query?.pages ?? {})[0]?.thumbnail?.source ?? null),

    // 5. Wikipedia só com o nome
    () => fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${nomeCodificado}&prop=pageimages&format=json&pithumbsize=400&origin=*`)
            .then(r => r.json())
            .then(d => Object.values(d.query?.pages ?? {})[0]?.thumbnail?.source ?? null),

    // 6. Wikipedia com "monster"
    () => fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${nomeComMonstro}&prop=pageimages&format=json&pithumbsize=400&origin=*`)
            .then(r => r.json())
            .then(d => Object.values(d.query?.pages ?? {})[0]?.thumbnail?.source ?? null),

    // 7. Open Library (para criaturas que têm livros)
    () => fetch(`https://openlibrary.org/search.json?q=${nomeComContexto}&limit=1&fields=cover_i`)
            .then(r => r.json())
            .then(d => {
              const coverId = d.docs?.[0]?.cover_i;
              return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
            }),
  ];

  for (const tentativa of fontes) {
    try {
      const src = await tentativa();
      if (src) {
        imgCache[nome] = src;
        return src;
      }
    } catch { /* tenta a próxima */ }
  }

  imgCache[nome] = null;
  return null;
}

// ─── Criação de card ──────────────────────────────────────────────────────────
function criarCard(item, config, idx, categoria) {
  const col = document.createElement('div');
  col.classList.add('col', 'card-col');
  col.style.animationDelay = `${(idx % 10) * 40}ms`;

  const key        = favKey(item, categoria);
  const isFav      = !!favoritos[key];
  const badges     = config.getBadges(item);
  const badgesHTML = badges.map(b =>
    `<span class="badge-scroll ${b.classe}">${b.texto}</span>`
  ).join('');

  const urlDetalhes = `detalhes.html?index=${item.index}&categoria=${categoria}`;

  col.innerHTML = `
    <div class="card h-100 card-clicavel">
      <div class="card-img-container">
        <div class="card-img-placeholder">${config.icone}</div>
        <img class="card-img-wiki d-none" alt="${item.name}" />
      </div>
      <div class="card-header-band">
        <span class="card-category-icon">${config.icone}</span>
        <div style="display:flex;align-items:center;gap:0.5rem">
          <span class="badge-scroll gold" style="font-size:0.65rem;opacity:0.7">${item.index}</span>
          <button
            class="btn-fav ${isFav ? 'active' : ''}"
            data-fav-key="${key}"
            title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
          >${isFav ? '⭐' : '☆'}</button>
        </div>
      </div>
      <div class="card-body">
        <h5 class="card-name">${item.name}</h5>
        <div class="card-badges">
          ${badgesHTML || '<span class="card-index">Sem detalhes</span>'}
        </div>
        <p class="card-hint">Clique para ver detalhes →</p>
      </div>
    </div>
  `;

  // Carrega a imagem do Wikipedia de forma assíncrona
  const imgEl          = col.querySelector('.card-img-wiki');
  const placeholderEl  = col.querySelector('.card-img-placeholder');

  buscarImagem(item.name).then(src => {
    if (src) {
      imgEl.src = src;
      imgEl.onload = () => {
        placeholderEl.classList.add('d-none');
        imgEl.classList.remove('d-none');
      };
      imgEl.onerror = () => { /* mantém o placeholder */ };
    }
  });

  // Abre detalhes na mesma aba ao clicar no card
  col.querySelector('.card-clicavel').addEventListener('click', () => {
    window.location.href = urlDetalhes;
  });

  // Favoritar não propaga o clique para o card
  col.querySelector('.btn-fav').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorito(item, categoria);
  });

  return col;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mostrarLoading(visivel) {
  loading.classList.toggle('d-none', !visivel);
}

// ─── Inicialização ────────────────────────────────────────────────────────────
atualizarBadgeFavoritos();
carregarCategoria('monsters');