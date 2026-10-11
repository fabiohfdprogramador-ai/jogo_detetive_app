# Rastro: Agência Meridiano

Jogo de investigação e geografia para navegador (computador, tablet e celular). Você é agente de uma agência fictícia e tem dois modos de jogo:

- **🌍 Perseguição (modo principal):** um tesouro foi roubado e o(a) culpado(a) foge pelo mundo. Em cada cidade você ouve testemunhas no banco, no aeroporto, na biblioteca e em outros lugares. As pistas sobre moeda, idioma, bandeira, pontos turísticos e comida indicam o próximo destino, e algumas revelam como o suspeito é. Voe pelo mapa-múndi real, emita o mandado na Central de Dados e faça a prisão antes do prazo. As missões são geradas a cada partida, e você sobe de patente a cada captura.
- **📁 Casos especiais:** cinco investigações narrativas mais longas, com cena do crime, álibis e perfil do autor.

Tudo tem efeitos sonoros e música originais, sintetizados pelo próprio jogo.

> **Nome provisório.** "Rastro" e "Agência Meridiano" são nomes de trabalho. Antes de publicar, é preciso verificar marcas (INPI e bases internacionais) e domínios. Nenhuma verificação legal foi feita.

## Estrutura do projeto

```
jogo_detetive_app/
├── frontend/   → o jogo (Next.js 15 + React 19 + TypeScript estrito + Tailwind 4)
└── backend/    → API Node opcional para sincronizar o progresso (node:http + zod)
```

O jogo funciona **somente com o frontend**: por padrão o progresso fica no navegador (localStorage). O backend é opcional e serve para guardar o progresso num servidor (ver "Salvamento").

## Requisitos

| Ferramenta | Versão recomendada |
| --- | --- |
| Node.js | 20 LTS ou 22 LTS (testado com 22.17) |
| npm | 10+ |
| Git | qualquer versão recente |

Não é preciso Docker. O projeto roda no macOS (inclusive Intel, como um MacBook Pro 2012 com Ventura), no Windows e no Linux.

## Instalação

No terminal (zsh no macOS, ou Git Bash/PowerShell no Windows), dentro da pasta `jogo_detetive_app`:

```bash
npm run install:all
```

Esse comando instala as dependências do frontend e do backend. Para rodar os testes de ponta a ponta, instale também o navegador do Playwright (uma vez só, cerca de 150 MB):

```bash
npx --prefix frontend playwright install chromium
```

## Abrir no VS Code

```bash
code .
```

O VS Code vai sugerir as extensões recomendadas (ESLint, Tailwind CSS, Vitest e Playwright).

## Executar

```bash
npm run dev
```

Depois, abra **http://localhost:3000** no navegador. Para testar no celular na mesma rede Wi-Fi, use o endereço "Network" que o Next.js mostra no terminal.

Para rodar a versão de produção:

```bash
npm --prefix frontend run build
```

```bash
npm --prefix frontend run start
```

### Backend (opcional)

```bash
npm run dev:backend
```

A API sobe em http://localhost:4000. Para o jogo salvar no backend, crie o arquivo `frontend/.env.local` com:

```
NEXT_PUBLIC_SAVE_BACKEND=api
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Reinicie o `npm run dev` depois de criar o arquivo. As variáveis do backend estão em `backend/.env.example` (`PORT`, `CORS_ORIGIN`, `SAVES_DIR`).

## Testes

| Comando | O que verifica |
| --- | --- |
| `npm test` | Testes unitários e de integração do frontend (84) e do backend (5) |
| `npm run test:e2e` | Playwright, em computador e celular: uma perseguição inteira até a captura e a promoção, o caso especial 1 inteiro e a ausência de rolagem horizontal |
| `npm run typecheck` | TypeScript estrito nos dois projetos |
| `npm run lint` | ESLint com as regras do Next.js |
| `npm run build` | Compilação de produção dos dois projetos |

Os testes cobrem: início de caso, ações válidas e inválidas, consumo de tempo, evidências condicionais, estados dos suspeitos, mandado (correto, incorreto, palpite sem evidências, requisitos formais, tentativas esgotadas), captura, dicas, pontuação e penalidades, máquina de estados, salvamento e carregamento, dados corrompidos, migração de versão e sincronização com o backend. Também há uma **verificação de consistência dos 5 casos**: referências válidas, todos os locais e evidências alcançáveis, culpado distinguível pelo perfil, cada característica do culpado revelada por uma evidência confiável e um roteiro que resolve cada caso dentro do tempo.

## Como jogar os casos especiais

1. **Início → Caso especial.** O primeiro caso tem um tutorial (que pode ser revisto em Configurações).
2. **Ações:** cada ação mostra o custo em tempo antes de ser executada. Entrevistas abrem diálogos, e as evidências novas vão para o arquivo.
3. **Mapa:** mostra só os locais já identificados. Novos destinos aparecem quando as pistas apontam para eles.
4. **Suspeitos:** compare características, álibis e motivos. Álibis podem ser confirmados por ações, e você pode descartar suspeitos.
5. **Mandado:** monte o perfil do autor, escolha o suspeito e cite as evidências. Um pedido negado custa tempo e pontos, e a resposta nunca revela qual requisito falhou. Acertar só no palpite não basta: as evidências obrigatórias precisam ter sido coletadas.
6. **Captura:** com o mandado, vá até onde o suspeito está e execute a captura. Errar o local custa caro.

### Modo Perseguição

| Elemento | Como funciona |
| --- | --- |
| Cidades | 30 cidades reais em 6 continentes (`frontend/data/world/cities.ts`) |
| Suspeitos | 12 membros fictícios da **Rede Mariposa** 🦋, cada um com sexo, cabelo, passatempo, marca registrada e veículo |
| Pistas | Cada testemunha dá uma pista do próximo destino. A categoria depende do lugar: o banco fala da moeda, o aeroporto da bandeira e o mercado da comida. Pistas que não diferenciam o destino dos despistes (por exemplo, "euros" quando outro destino também usa euro) nunca são usadas. |
| Despistes | Em cada cidade há 2 ou 3 voos errados. Nas cidades erradas ninguém viu nada, e é preciso voltar. |
| Tempo | Visitas custam 2, 3 e 4 h. Voos custam 1 h a cada 800 km (mínimo 2 h). Das 23h às 7h o agente dorme. O prazo vai de sábado 17h a domingo 17h, conforme a patente. |
| Mandado | Na Central de Dados, marque as características até sobrar um suspeito. Sem mandado ele escapa; com o mandado errado, a pessoa errada é presa. |
| Patentes | Recruta → Investigador(a) Júnior → Detetive → Inspetor(a) → Agente Especial → Diretor(a) de Campo. Rotas mais longas e prazos ajustados a cada nível. |

Os prazos foram calibrados por simulação (`tests/unit/chase.test.ts`): um "robô" resolve 200 missões de cada patente visitando todos os lugares. Nas patentes iniciais ele também vence errando um voo.

### Campanha dos casos especiais

| # | Caso | Dificuldade | Estrutura |
| --- | --- | --- | --- |
| 1 | O Astrolábio do Solar (Salvador) | Fácil | Cena única + pista de destino. Tem tutorial. |
| 2 | Selos que Não Existem (Porto Alegre → Uruguai) | Fácil | Análise documental. A pista decisiva vem de cruzar duas evidências. |
| 3 | Projeto Colibri (Campinas → Lisboa) | Intermediário | Pistas indiretas, álibis e uma viagem legítima que serve de despiste. Dois destinos plausíveis. |
| 4 | O Retrato da Viúva Azul (Paris ↔ Recife) | Intermediário | Começa no destino e reconstrói a cadeia de custódia. Características ocultas até a ordem de serviço. |
| 5 | Três Versões de Uma Noite (Cartagena → Panamá) | Avançado | Depoimentos contraditórios, testemunha enganada, reserva plantada (rota falsa), três características obrigatórias. |

Cada caso é liberado quando o responsável do anterior é identificado.

## Arquitetura (frontend)

```
frontend/
├── app/                 Rotas (App Router): início, casos, dossiê, investigação, relatório, desempenho, configurações
├── components/
│   ├── game/            Central de investigação, painéis, mandado, relatório, provedor de estado
│   ├── map/             Mapa SVG original ligado ao estado do jogo
│   ├── evidence/        Arquivo de evidências (filtros, marcação, relações)
│   ├── suspects/        Fichas e retratos ilustrados gerados (sem imagens de terceiros)
│   ├── dialogs/         Confirmações, resultado de ação, dicas
│   ├── layout/ ui/      Cabeçalho, navegação, botões, modal acessível, notificações
├── data/cases/          Os 5 casos (um arquivo por caso) + index.ts
├── lib/
│   ├── game/            Motor PURO: engine.ts, selectors.ts, scoring.ts, state-machine.ts, validation.ts, case-loader.ts
│   ├── persistence/     schema.ts (zod), save-manager.ts (migração/estatísticas), storage.ts (repositórios)
│   └── i18n/            Textos pt-BR e função t()
├── types/               case.ts, evidence.ts, suspect.ts, game.ts
└── tests/               unit/, integration/, e2e/, fixtures/ (roteiros de solução, fora do bundle)
```

**Decisões principais**

- **Motor puro e testável.** `lib/game/engine.ts` recebe a definição do caso e a sessão e devolve uma nova sessão, sem acessar o navegador. A interface só chama essas funções (`startCase`, `performAction`, `travelTo`, `requestWarrant`, `attemptCapture`, `revealHint`…), e o mesmo motor pode rodar no servidor no futuro.
- **Máquina de estados explícita** (`state-machine.ts`): `investigando → mandado_autorizado → concluido`, com saídas para `fracasso` e `parcial`. Transições inválidas lançam erro.
- **Persistência isolada.** A interface `SaveRepository` tem duas implementações: localStorage (padrão) e API. O save tem versão, é validado com zod e passa por migrações. Dados ilegíveis nunca são apagados em silêncio: o jogo avisa, não sobrescreve e oferece guardar uma cópia antes de recomeçar.
- **Mapa estilizado original em SVG**, em vez de Leaflet: não depende de chaves nem de termos de provedores e é acessível por teclado.
- **Sem fontes externas**: tipografia do sistema, então nada é baixado no carregamento e nenhum dado vai a terceiros.

## Som e música

`frontend/lib/audio/sound.ts` gera todos os sons com a Web Audio API: máquina de escrever, pistas, voo, pouso, carimbo do mandado, sirene e fanfarra, além de uma trilha original em lá menor. Não há arquivos de áudio de terceiros. Os navegadores só liberam som após o primeiro clique. Em **Configurações → Som** dá para ligar e desligar efeitos e música, ajustar o volume e testar.

## Mapa e dados geográficos

- Contornos dos países: pacote `world-atlas` (licença ISC), derivado do **Natural Earth**, de domínio público. O arquivo fica em `frontend/public/maps/countries-110m.json` e carrega localmente, sem internet, chaves de API ou serviços pagos.
- Projeção e rotas: `d3-geo` (ISC). Os voos seguem a rota de grande círculo, e o avião é animado (a animação é desligada se o sistema pedir movimento reduzido).
- Bandeiras: `country-flag-icons` (MIT), em SVG, porque emojis de bandeira não aparecem no Windows.

## Salvamento

- Salvamento automático após cada ação, viagem, anotação, pedido de mandado ou dica.
- Chave `rastro:save` no localStorage, com `version: 2`. Saves das versões 0 e 1 são migrados automaticamente, sem perder o progresso dos casos. Saves de versões mais novas são preservados e o jogador é avisado.
- Se o save estiver corrompido, aparece um aviso no topo. O botão "Guardar cópia e começar do zero" grava uma cópia em `rastro:save:backup:<data>` antes de criar um progresso novo.
- Em **Configurações** dá para reiniciar a campanha inteira (com confirmação). No dossiê de cada caso dá para reiniciar só aquele caso.
- No backend, cada jogador é um arquivo `backend/data/saves/<id>.json`, com a versão anterior guardada como `.bak`. O id é anônimo e gerado no navegador.

> O progresso local pode ser editado pelo próprio jogador. Ele **não** serve como prova de resultado para rankings ou recompensas. Uma versão competitiva precisa validar as partidas no servidor.

## Adicionar um novo caso

1. Copie um arquivo de `frontend/data/cases/` (por exemplo `caso-02-selos.ts`) e mude ids, textos e dados. Use um prefixo próprio nos ids, como `c6-`.
2. Registre o caso em `frontend/data/cases/index.ts`.
3. Em `frontend/tests/fixtures/walkthroughs.ts`, adicione um roteiro que resolva o caso.
4. Rode `npm test`. A validação aponta referências quebradas, evidências inalcançáveis, suspeitos indistinguíveis do culpado, características sem evidência que as revele e uma `rewardPoints` diferente da pontuação máxima.

Campos importantes: `solution` (culpado, evidências obrigatórias, características obrigatórias, local de captura), `completionRules` (custos e limites), `hiddenUntil` (locais e suspeitos que aparecem depois), `requires` (ações desbloqueadas por pistas) e `reveals` (metadado interno que diz qual característica a evidência permite deduzir).

## Alterar a pontuação

A fórmula está documentada no topo de `frontend/lib/game/scoring.ts`. Os valores padrão ficam em `DEFAULT_SCORING`, e cada caso pode sobrescrever qualquer item em `scoringRules`. Resumo:

```
+ identificação + captura
+ evidências relevantes encontradas (proporcional)
+ qualidade da dedução (evidências citadas no mandado)
+ tempo restante (só com captura)
+ objetivos secundários
− dicas − mandados negados − capturas erradas − ações desnecessárias
total limitado entre 0 e o máximo do caso
```

Classificações: Dossiê inconclusivo (sem captura), Agente em formação (< 55%), Agente de campo (≥ 55%) e Agente Meridiano de elite (≥ 80%). Se mudar os pesos, ajuste a `rewardPoints` dos casos (o teste avisa).

## Solução de problemas

| Problema | Solução |
| --- | --- |
| `npm run dev` diz que a porta 3000 está em uso | `npm --prefix frontend run dev -- -p 3001` |
| O progresso sumiu | Janelas anônimas e "limpar dados do site" apagam o localStorage. Use uma janela normal. |
| Aviso de progresso ilegível | Os dados originais não foram apagados. Use "Guardar cópia e começar do zero" ou restaure a chave `rastro:save:backup:*`. |
| `playwright test` reclama de navegador ausente | `npx --prefix frontend playwright install chromium` |
| Erro de memória no build em máquinas antigas | `NODE_OPTIONS=--max-old-space-size=2048 npm --prefix frontend run build` |
| Backend recusa chamadas (CORS) | Ajuste `CORS_ORIGIN` para a URL exata do frontend |

## Privacidade e segurança

- Sem cadastro, sem coleta de dados pessoais, sem GPS, câmera ou microfone. A localização é sempre a do caso fictício.
- Sem chamadas a serviços de terceiros, sem anúncios, sem telemetria. A telemetria do Next.js pode ser desativada com `NEXT_TELEMETRY_DISABLED=1`.
- Nenhum HTML de terceiros é renderizado. Todo o conteúdo dos casos é texto puro.
- A API valida identificador, formato e tamanho (até 1 MB) e não recebe dados pessoais.

## Limitações conhecidas

- O progresso local pode ser manipulado pelo jogador. Rankings e recompensas exigiriam validação no servidor.
- O backend guarda saves em arquivos JSON, sem autenticação: o id anônimo funciona como "senha". Antes de produção, isso precisa de autenticação, banco de dados e limite de requisições.
- Só há o idioma pt-BR. A estrutura de traduções (`lib/i18n`) existe, mas os textos dos casos ainda estão nos arquivos de dados.
- Os retratos são ilustrações geradas (silhuetas com iniciais). Arte final exigiria ilustrações próprias ou licenciadas.
- O modo Perseguição tem 30 cidades. Para mais variedade, basta acrescentar cidades em `data/world/cities.ts` (os testes validam cada nova entrada).
- O ícone do app é SVG. Lojas e alguns sistemas exigem PNGs em vários tamanhos.

## O que falta para uma publicação comercial

1. Pesquisa e registro de marca e domínio do nome definitivo.
2. Direção de arte final (retratos, ilustrações dos locais, logotipo profissional) e áudio original.
3. PWA completa (service worker, ícones PNG) ou empacotamento com Capacitor para Google Play e App Store.
4. Contas de usuário, backend com banco de dados, autenticação e validação das partidas no servidor.
5. Política de privacidade e termos de uso, e, se houver analytics, consentimento conforme a LGPD.
6. Mais casos, um editor de casos e testes com jogadores reais para calibrar dificuldade e pontuação.
7. Auditoria de acessibilidade com leitores de tela (VoiceOver e TalkBack) e testes em dispositivos reais.
