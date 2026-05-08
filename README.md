# D&D 5e — Compêndio

Aplicação web que consome a [D&D 5e API](https://www.dnd5eapi.co) para exibir dados do universo de Dungeons & Dragons 5ª Edição.

## Categorias disponíveis
- 🐉 **Monstros** — tipo, tamanho, CR, HP
- ✨ **Magias** — nível, escola, tempo de conjuração, alcance
- ⚔️ **Classes** — dado de vida, proficiências
- 🛡️ **Equipamentos** — categoria, custo, peso

## Tecnologias
- HTML5 semântico
- CSS3 com variáveis e animações
- Bootstrap 5 (layout responsivo)
- JavaScript puro — `fetch` + `async/await`

## Funcionalidades
- Carregamento progressivo em lotes (sem travar)
- Cache por categoria (evita refazer requisições)
- Feedback de carregamento animado
- Tratamento de erros de requisição
- Visual temático medieval/fantasia

## Como rodar
Abra o arquivo `index.html` no navegador. Nenhuma instalação necessária.

## Estrutura
```
av1-dwb-nome-sobrenome-2bimestre/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
└── README.md
```

## API utilizada
https://www.dnd5eapi.co/api