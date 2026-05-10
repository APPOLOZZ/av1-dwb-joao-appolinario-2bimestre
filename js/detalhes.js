const API_BASE = 'https://www.dnd5eapi.co';

// ─── Lê os parâmetros da URL ──────────────────────────────────────────────────
// Exemplo: detalhes.html?index=aboleth&categoria=monsters
const params    = new URLSearchParams(window.location.search);
const index     = params.get('index');
const categoria = params.get('categoria');

// ─── Elementos DOM ────────────────────────────────────────────────────────────
const loading   = document.getElementById('loading');
const errorEl   = document.getElementById('error');
const container = document.getElementById('detalhe-container');

// ─── Ícones por categoria ─────────────────────────────────────────────────────
const ICONES = {
  monsters:  '🐉',
  spells:    '✨',
  classes:   '⚔️',
  equipment: '🛡️',
};

// ─── Favoritos (mesmo localStorage do index.html) ─────────────────────────────
function carregarFavoritos() {
  try { return JSON.parse(localStorage.getItem('dnd_favoritos') || '{}'); }
  catch { return {}; }
}

function favKey(itemIndex, cat) {
  return `${cat}:${itemIndex}`;
}

function toggleFavorito(item) {
  const favs = carregarFavoritos();
  const key  = favKey(item.index, categoria);

  if (favs[key]) {
    delete favs[key];
  } else {
    favs[key] = { item, categoria };
  }

  localStorage.setItem('dnd_favoritos', JSON.stringify(favs));

  // Atualiza o botão na tela
  const btn = document.getElementById('btn-fav-detalhe');
  const isFav = !!favs[key];
  btn.textContent = isFav ? '⭐ Favoritado' : '☆ Favoritar';
  btn.classList.toggle('fav-ativo', isFav);
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

// ─── Inicialização ────────────────────────────────────────────────────────────
if (!index || !categoria) {
  mostrarErro('Parâmetros inválidos na URL. Volte ao compêndio e clique em um item.');
} else {
  carregarDetalhes();
}

// ─── Busca o item na API ──────────────────────────────────────────────────────
async function carregarDetalhes() {
  try {
    const url = `${API_BASE}/api/${categoria}/${index}`;
    console.log('Buscando detalhes:', url);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);

    const item = await res.json();

    // Atualiza o título da aba do navegador
    document.title = `${item.name} — D&D 5e Compêndio`;

    loading.classList.add('d-none');
    container.classList.remove('d-none');

    // Renderiza de acordo com a categoria
    switch (categoria) {
      case 'monsters':  renderMonster(item);   break;
      case 'spells':    renderSpell(item);     break;
      case 'classes':   renderClass(item);     break;
      case 'equipment': renderEquipment(item); break;
      default:          renderGenerico(item);
    }

  } catch (erro) {
    mostrarErro(`Não foi possível carregar: ${erro.message}`);
    console.error(erro);
  }
}

// ─── MONSTROS ─────────────────────────────────────────────────────────────────
function renderMonster(m) {
  const mod = v => Math.floor((v - 10) / 2);
  const sinal = v => (v >= 0 ? `+${v}` : `${v}`);

  const stats = [
    { nome: 'FOR', val: m.strength },
    { nome: 'DES', val: m.dexterity },
    { nome: 'CON', val: m.constitution },
    { nome: 'INT', val: m.intelligence },
    { nome: 'SAB', val: m.wisdom },
    { nome: 'CAR', val: m.charisma },
  ];

  container.innerHTML = `
    ${headerHTML(m, '🐉')}

    <!-- Atributos principais -->
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📋 Atributos Gerais</h3>
      <div class="atributos-grid">
        ${atrib('Tipo',        m.type)}
        ${atrib('Tamanho',     m.size)}
        ${atrib('Alinhamento', m.alignment)}
        ${atrib('CR',          m.challenge_rating)}
        ${atrib('XP',          m.xp?.toLocaleString('pt-BR') ?? '—')}
        ${atrib('HP',          `${m.hit_points} (${m.hit_points_roll ?? '—'})`)}
        ${atrib('CA',          m.armor_class?.[0]?.value ?? m.armor_class ?? '—')}
        ${atrib('Vel.',        m.speed?.walk ?? '—')}
      </div>
    </div>

    <!-- Stats -->
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">💪 Atributos de Combate</h3>
      <div class="stats-grid">
        ${stats.map(s => `
          <div class="stat-box">
            <span class="stat-name">${s.nome}</span>
            <span class="stat-value">${s.val ?? '—'}</span>
            <span class="stat-modifier">${s.val != null ? sinal(mod(s.val)) : ''}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Imunidades / Resistências -->
    ${m.damage_immunities?.length ? secaoLista('🛡️ Imunidades a Dano', m.damage_immunities) : ''}
    ${m.damage_resistances?.length ? secaoLista('⚡ Resistências a Dano', m.damage_resistances) : ''}
    ${m.condition_immunities?.length ? secaoLista('✨ Imunidades a Condição', m.condition_immunities.map(c => c.name)) : ''}

    <!-- Sentidos / Idiomas -->
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">👁️ Sentidos & Idiomas</h3>
      <div class="atributos-grid">
        ${Object.entries(m.senses ?? {}).map(([k,v]) => atrib(k.replace(/_/g,' '), v)).join('')}
        ${atrib('Idiomas', m.languages || 'Nenhum')}
      </div>
    </div>

    <!-- Habilidades especiais -->
    ${m.special_abilities?.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">✨ Habilidades Especiais</h3>
      ${m.special_abilities.map(a => `
        <div class="acao-item">
          <p class="acao-nome">${a.name}</p>
          <p class="acao-desc">${a.desc}</p>
        </div>`).join('')}
    </div>` : ''}

    <!-- Ações -->
    ${m.actions?.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">⚔️ Ações</h3>
      ${m.actions.map(a => `
        <div class="acao-item">
          <p class="acao-nome">${a.name}</p>
          <p class="acao-desc">${a.desc}</p>
        </div>`).join('')}
    </div>` : ''}

    <!-- Ações lendárias -->
    ${m.legendary_actions?.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">👑 Ações Lendárias</h3>
      ${m.legendary_actions.map(a => `
        <div class="acao-item">
          <p class="acao-nome">${a.name}</p>
          <p class="acao-desc">${a.desc}</p>
        </div>`).join('')}
    </div>` : ''}
  `;
}

// ─── MAGIAS ───────────────────────────────────────────────────────────────────
function renderSpell(s) {
  const nivel = s.level === 0 ? 'Truque' : `Nível ${s.level}`;
  const desc  = Array.isArray(s.desc) ? s.desc : [s.desc ?? ''];

  container.innerHTML = `
    ${headerHTML(s, '✨')}

    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📋 Informações da Magia</h3>
      <div class="atributos-grid">
        ${atrib('Nível',             nivel)}
        ${atrib('Escola',            s.school?.name ?? '—')}
        ${atrib('Tempo de Conjuração', s.casting_time ?? '—')}
        ${atrib('Alcance',           s.range ?? '—')}
        ${atrib('Duração',           s.duration ?? '—')}
        ${atrib('Concentração',      s.concentration ? 'Sim' : 'Não')}
        ${atrib('Ritual',            s.ritual ? 'Sim' : 'Não')}
        ${atrib('Componentes',       s.components?.join(', ') ?? '—')}
      </div>
      ${s.material ? `<p class="mt-2" style="font-size:0.9rem;color:var(--ink);font-style:italic">
        <strong>Material:</strong> ${s.material}</p>` : ''}
    </div>

    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📜 Descrição</h3>
      <div class="detalhe-desc">
        ${desc.map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>

    ${s.higher_level?.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">⬆️ Em Níveis Superiores</h3>
      <div class="detalhe-desc">
        ${s.higher_level.map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>` : ''}

    ${s.classes?.length ? secaoLista('⚔️ Classes que Usam', s.classes.map(c => c.name)) : ''}
  `;
}

// ─── CLASSES ──────────────────────────────────────────────────────────────────
function renderClass(c) {
  container.innerHTML = `
    ${headerHTML(c, '⚔️')}

    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📋 Informações da Classe</h3>
      <div class="atributos-grid">
        ${atrib('Dado de Vida', `d${c.hit_die}`)}
        ${atrib('Magias', c.spellcasting ? 'Sim' : 'Não')}
      </div>
    </div>

    ${c.proficiencies?.length ? secaoLista('🎓 Proficiências', c.proficiencies.map(p => p.name)) : ''}
    ${c.saving_throws?.length ? secaoLista('🛡️ Testes de Resistência', c.saving_throws.map(s => s.name)) : ''}

    ${c.proficiency_choices?.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">🎯 Escolhas de Proficiência</h3>
      ${c.proficiency_choices.map(choice => `
        <div class="acao-item">
          <p class="acao-nome">Escolha ${choice.choose} de:</p>
          <ul class="detalhe-lista" style="margin-top:0.4rem">
            ${choice.from?.options?.map(o => `<li>${o.item?.name ?? o.string ?? JSON.stringify(o)}</li>`).join('') ?? ''}
          </ul>
        </div>`).join('')}
    </div>` : ''}

    ${c.starting_equipment?.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">🎒 Equipamento Inicial</h3>
      <ul class="detalhe-lista">
        ${c.starting_equipment.map(e => `<li>${e.equipment.name} ×${e.quantity}</li>`).join('')}
      </ul>
    </div>` : ''}
  `;
}

// ─── EQUIPAMENTOS ─────────────────────────────────────────────────────────────
function renderEquipment(e) {
  const desc = Array.isArray(e.desc) ? e.desc : (e.desc ? [e.desc] : []);

  container.innerHTML = `
    ${headerHTML(e, '🛡️')}

    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📋 Informações do Item</h3>
      <div class="atributos-grid">
        ${atrib('Categoria',  e.equipment_category?.name ?? '—')}
        ${atrib('Custo',      e.cost ? `${e.cost.quantity} ${e.cost.unit}` : '—')}
        ${atrib('Peso',       e.weight ? `${e.weight} lb` : '—')}
        ${e.damage ? atrib('Dano', `${e.damage.damage_dice} ${e.damage.damage_type?.name ?? ''}`) : ''}
        ${e.armor_class ? atrib('CA Base', e.armor_class.base) : ''}
        ${e.range ? atrib('Alcance', `${e.range.normal}/${e.range.long ?? '—'} ft`) : ''}
        ${e.speed ? atrib('Velocidade', `${e.speed.quantity} ${e.speed.unit}`) : ''}
        ${e.capacity ? atrib('Capacidade', e.capacity) : ''}
      </div>
    </div>

    ${e.properties?.length ? secaoLista('⚙️ Propriedades', e.properties.map(p => p.name)) : ''}

    ${desc.length ? `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📜 Descrição</h3>
      <div class="detalhe-desc">
        ${desc.map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>` : ''}
  `;
}

// ─── GENÉRICO (fallback) ──────────────────────────────────────────────────────
function renderGenerico(item) {
  container.innerHTML = `
    ${headerHTML(item, ICONES[categoria] ?? '📄')}
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">📋 Dados</h3>
      <pre style="color:var(--ink);font-size:0.85rem;white-space:pre-wrap">${JSON.stringify(item, null, 2)}</pre>
    </div>
  `;
}

// ─── Helpers de HTML ──────────────────────────────────────────────────────────
function headerHTML(item, icone) {
  const favs  = carregarFavoritos();
  const key   = favKey(item.index, categoria);
  const isFav = !!favs[key];

  setTimeout(() => {
    // Botão favoritar
    const btn = document.getElementById('btn-fav-detalhe');
    if (btn) btn.addEventListener('click', () => toggleFavorito(item));

    // Imagem do Wikipedia (carrega após o header estar no DOM)
    buscarImagem(item.name).then(src => {
      const imgEl      = document.getElementById('detalhe-img');
      const wrapperEl  = document.getElementById('detalhe-img-wrapper');
      if (src && imgEl && wrapperEl) {
        imgEl.src = src;
        imgEl.onload = () => wrapperEl.classList.remove('d-none');
      }
    });
  }, 0);

  return `
    <div class="detalhe-header text-md-start">
      <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
        <div>
          <span class="detalhe-icone">${icone}</span>
          <h2 class="detalhe-nome">${item.name}</h2>
          <span class="detalhe-index">${item.index} · ${categoria}</span>
        </div>
        <button
          id="btn-fav-detalhe"
          class="btn-fav-detalhe ${isFav ? 'fav-ativo' : ''}"
          title="${isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}"
        >${isFav ? '⭐ Favoritado' : '☆ Favoritar'}</button>
      </div>
      <!-- Imagem carregada do Wikipedia -->
      <div id="detalhe-img-wrapper" class="detalhe-img-wrapper d-none">
        <img id="detalhe-img" class="detalhe-img" alt="${item.name}" />
      </div>
    </div>
  `;
}

function atrib(label, valor) {
  return `
    <div class="atributo-item">
      <span class="atributo-label">${label}</span>
      <span class="atributo-valor">${valor ?? '—'}</span>
    </div>
  `;
}

function secaoLista(titulo, itens) {
  return `
    <div class="detalhe-section">
      <h3 class="detalhe-section-title">${titulo}</h3>
      <ul class="detalhe-lista">
        ${itens.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>
  `;
}

// ─── Erro ─────────────────────────────────────────────────────────────────────
function mostrarErro(msg) {
  loading.classList.add('d-none');
  errorEl.classList.remove('d-none');
  errorEl.textContent = `⚠️ ${msg}`;
}