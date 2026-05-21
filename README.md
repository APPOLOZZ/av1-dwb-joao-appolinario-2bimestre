# D&D 5e — Compêndio

Aplicação web que consome a [D&D 5e API](https://www.dnd5eapi.co) para exibir dados do universo de Dungeons & Dragons 5ª Edição.

## Funcionalidades

### Página de Listagem (`index.html`)
- 4 categorias navegáveis por abas: Monstros, Magias, Classes e Equipamentos
- Carregamento progressivo em lotes via `fetch` + `async/await`
- Cache por categoria (evita refazer requisições)
- Barra de pesquisa em tempo real
- Sistema de favoritos com persistência via `localStorage`
- Feedback de carregamento animado
- Tratamento de erros de requisição

### Página de Detalhes (`detalhes.html`)
- Acesso via clique em qualquer card (abre em nova aba)
- Parâmetros de URL com `URLSearchParams` (`?index=aboleth&categoria=monsters`)
- Nova requisição à API para buscar todos os dados do item
- Renderização específica por categoria:
  - **Monstros**: atributos, stats de combate, ações, habilidades especiais, ações lendárias
  - **Magias**: escola, componentes, descrição, usos em níveis superiores
  - **Classes**: proficiências, dados de vida, equipamento inicial
  - **Equipamentos**: custo, peso, dano, propriedades

## Tecnologias
- HTML5 semântico
- CSS3 com variáveis e animações
- Bootstrap 5 (layout responsivo)
- JavaScript puro — `fetch` + `async/await` + `URLSearchParams`

## Estrutura
```
giapi/
├── index.html
├── detalhes.html
├── css/
│   ├── style.css
│   └── detalhes.css
├── js/
│   ├── script.js
│   └── detalhes.js
└── README.md
```

## Como rodar
Abra o `index.html` com Live Server no VS Code.

## API utilizada
https://www.dnd5eapi.co/api