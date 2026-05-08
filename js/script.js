const API_BASE = 'https://www.dnd5eapi.co/api';

// ─── Configuração de cada categoria ───────────────────────────────────────────
const CATEGORIAS = {
  monsters: {
    titulo:   'Bestiário',
    endpoint: '/monsters',
    icone:    '🐉',
    // Quais campos do objeto detalhe queremos exibir como badges
    getBadges: (item) => [
      item.type         && { texto: item.type,                       classe: '' },
      item.size         && { texto: item.size,                       classe: '' },
      item.challenge_rating != null && { texto: `CR ${item.challenge_rating}`, classe: 'gold' },
      item.hit_points   && { texto: `${item.hit_points} HP`,         classe: 'highlight' },
    ].filter(Boolean),
    detalhe: true,
  },
  spells: {
    titulo:   'Grimório de Magias',
    endpoint: '/spells',
    icone:    '✨',
    getBadges: (item) => [
      item.level != null && { texto: item.level === 0 ? 'Truque' : `Nível ${item.level}`, classe: 'gold' },
      item.school?.name  && { texto: item.school.name,               classe: '' },
      item.casting_time  && { texto: item.casting_time,               classe: '' },
      item.range         && { texto: item.range,                      classe: '' },
    ].filter(Boolean),
    detalhe: true,
  },
  classes: {
    titulo:   'Ordens & Classes',
    endpoint: '/classes',
    icone:    '⚔️',
    getBadges: (item) => [
      item.hit_die && { texto: `d${item.hit_die} Hit Die`,            classe: 'gold' },
      ...(item.proficiencies?.slice(0, 2).map(p => ({ texto: p.name, classe: '' })) ?? []),
    ].filter(Boolean),
    detalhe: true,
  },
  equipment: {
    titulo:   'Arsenal & Equipamentos',
    endpoint: '/equipment',
    icone:    '🛡️',
    getBadges: (item) => [
      item.equipment_category?.name && { texto: item.equipment_category.name, classe: '' },
      item.cost && { texto: `${item.cost.quantity} ${item.cost.unit}`,         classe: 'gold' },
      item.weight && { texto: `${item.weight} lb`,                             classe: '' },
    ].filter(Boolean),
    detalhe: true,
  },
};

// ─── Estado da aplicação ──────────────────────────────────────────────────────
// Cache para não refazer requests já feitos
const cache = {};
let categoriaAtiva = 'monsters';

// ─── Elementos DOM ────────────────────────────────────────────────────────────
const loading        = document.getElementById('loading');
const errorMsg       = document.getElementById('error');
const cardContainer  = document.getElementById('card-container');
const sectionTitle   = document.getElementById('section-title');
const sectionCount   = document.getElementById('section-count');
const tabBtns        = document.querySelectorAll('.tab-btn');

// ─── Navegação por abas ───────────────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    categoriaAtiva = btn.dataset.category;
    carregarCategoria(categoriaAtiva);
  });
});

// ─── Carregamento principal ───────────────────────────────────────────────────
async function carregarCategoria(categoria) {
  const config = CATEGORIAS[categoria];

  // Atualiza título
  sectionTitle.textContent = config.titulo;
  sectionCount.textContent = '';
  cardContainer.innerHTML  = '';
  errorMsg.classList.add('d-none');

  // Usa cache se já carregou antes
  if (cache[categoria]) {
    exibirCards(cache[categoria], config);
    return;
  }

  mostrarLoading(true);

  try {
    // 1. Busca a lista de itens da categoria
    const res  = await fetch(`${API_BASE}${config.endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const lista = data.results; // [ { index, name, url }, ... ]

    mostrarLoading(false);
    sectionCount.textContent = `${lista.length} itens encontrados`;

    // 2. Busca detalhes de cada item em paralelo (em lotes para não sobrecarregar)
    const detalhes = await buscarEmLotes(lista, 10);

    // Salva no cache
    cache[categoria] = detalhes;
    exibirCards(detalhes, config);

  } catch (erro) {
    mostrarLoading(false);
    errorMsg.classList.remove('d-none');
    console.error('Erro ao carregar categoria:', categoria, erro);
  }
}

// ─── Busca em lotes (evita sobrecarregar a API) ───────────────────────────────
async function buscarEmLotes(lista, tamLote) {
  const resultados = [];

  for (let i = 0; i < lista.length; i += tamLote) {
    const lote = lista.slice(i, i + tamLote);

    const detalhes = await Promise.all(
      lote.map(item =>
        fetch(`https://www.dnd5eapi.co${item.url}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    );

    // Adiciona ao DOM assim que o lote chega (feedback progressivo!)
    const validos = detalhes.filter(Boolean);
    resultados.push(...validos);
    exibirCardsProgressivo(validos, CATEGORIAS[categoriaAtiva], i);
  }

  return resultados;
}

// ─── Exibição dos cards (progressiva — lote por lote) ─────────────────────────
function exibirCardsProgressivo(itens, config, offset) {
  itens.forEach((item, idx) => {
    const col = criarCard(item, config, offset + idx);
    cardContainer.appendChild(col);
  });
  // Atualiza contagem
  sectionCount.textContent = `${cardContainer.children.length} itens carregados...`;
}

// Exibe tudo de uma vez (usado ao carregar do cache)
function exibirCards(itens, config) {
  cardContainer.innerHTML = '';
  itens.forEach((item, idx) => cardContainer.appendChild(criarCard(item, config, idx)));
  sectionCount.textContent = `${itens.length} itens encontrados`;
}

// ─── Criação de um card ───────────────────────────────────────────────────────
function criarCard(item, config, idx) {
  const col    = document.createElement('div');
  col.classList.add('col', 'card-col');
  col.style.animationDelay = `${(idx % 10) * 40}ms`;

  const badges = config.getBadges(item);
  const badgesHTML = badges.map(b =>
    `<span class="badge-scroll ${b.classe}">${b.texto}</span>`
  ).join('');

  col.innerHTML = `
    <div class="card h-100">
      <div class="card-header-band">
        <span class="card-category-icon">${config.icone}</span>
        <span class="badge-scroll gold" style="font-size:0.65rem;opacity:0.7">${item.index}</span>
      </div>
      <div class="card-body">
        <h5 class="card-name">${item.name}</h5>
        <div class="card-badges">${badgesHTML || '<span class="card-index">—</span>'}</div>
      </div>
    </div>
  `;

  return col;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mostrarLoading(visivel) {
  loading.classList.toggle('d-none', !visivel);
}

// ─── Inicialização ────────────────────────────────────────────────────────────
carregarCategoria('monsters');