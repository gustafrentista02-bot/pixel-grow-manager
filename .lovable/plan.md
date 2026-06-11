# CONTROLE DE LEADS — Pixel Marketing

CRM web moderno em TanStack Start + Lovable Cloud. Tema escuro corporativo, verde #0F5132, logo Pixel Marketing. Construção completa numa entrega.

## Decisões confirmadas
- **Perfil:** primeiro cadastro vira **Gerente Geral**; demais viram **Vendedor**. Gerente pode promover/rebaixar nas Configurações.
- **Escopo:** entrega completa (núcleo + dashboards + CSV + follow-up + automações).
- **Exclusão 24h:** verificação no carregamento do app (sem cron real).
- **Foto de perfil:** fica para depois.

## Identidade visual
- Tokens em `src/styles.css` (oklch): fundo preto `#121212`, primário verde escuro `#0F5132`, verdes secundários, branco para contraste. Botões arredondados, ícones discretos (lucide).
- Logo enviada vira asset Lovable (`lovable-assets`), usada em Login, Cadastro, sidebar e cabeçalho.
- Português (pt-BR) em toda a interface.

## Backend (Lovable Cloud)
Habilitar Cloud e criar schema com migrations + GRANTs + RLS.

**Enums:** `app_role` (`gerente`,`vendedor`); `lead_stage` (`lead_novo`,`conversando`,`reuniao`,`proposta`,`ganho`,`perdido`,`follow_up`,`sem_interesse`); `followup_stage` (`followup_1`..`followup_4`); `lead_origin` (`google`,`instagram`,`facebook`,`whatsapp`,`site`,`indicacao`,`trafego_pago`,`outro`).

**Tabelas:**
- `profiles` (id→auth.users, nome, email, created_at). Trigger `handle_new_user` cria profile no signup.
- `user_roles` (user_id, role) — papéis SEM ficar no profile. Função `has_role(uuid, app_role)` security definer. Função `is_first_user()` para atribuir gerente ao 1º cadastro via trigger.
- `leads`: owner_id, nome, telefone, cidade, uf, empresa, segmento, faturamento_mensal, origem, observacoes(texto principal), stage, followup_stage(nullable), sem_interesse_at(nullable), created_at, updated_at, last_interaction_at. Trigger atualiza `updated_at`.
- `lead_notes`: lead_id, user_id, conteudo, created_at (histórico de observações com autor).
- `lead_movements`: lead_id, user_id, from_stage, to_stage, created_at (histórico de movimentações).

**RLS (regras de permissão):**
- Vendedor: SELECT/INSERT/UPDATE/DELETE apenas em `leads` onde `owner_id = auth.uid()` (idem notes/movements).
- Gerente: vê e gerencia **apenas os próprios** leads (mesma regra de owner). Métricas consolidadas da equipe NÃO vêm de SELECT direto nos leads — vêm de uma função `get_team_metrics()` security definer que retorna **apenas números agregados** (sem dados/observações dos leads dos vendedores). Isso garante: gerente ✅ vê estatísticas, ❌ não acessa dados/edita/observações dos vendedores.
- `profiles`/`user_roles`: cada um lê o próprio; gerente lê lista de profiles para ranking (apenas nome + agregados).

## Server functions (`src/lib/*.functions.ts`)
- `leads.functions.ts`: list (com filtros/paginação/ordenação server-side), get, create, update, delete, moveStage (grava movement + aplica regras de funil), addNote.
- `metrics.functions.ts`: `getMyMetrics()` e `getTeamMetrics()` (gerente; chama `get_team_metrics`), `getRanking()`.
- `maintenance.functions.ts`: `purgeExpiredLeads()` — apaga leads `sem_interesse` com `sem_interesse_at` > 24h. Chamado no load do `_authenticated` layout.
- `import.functions.ts`: importação CSV validada com zod.
- Todas protegidas com `requireSupabaseAuth`. Wire `attachSupabaseAuth` em `src/start.ts`.

## Rotas / Telas
- `/auth` — Login (email, senha, esqueci senha, link cadastrar) + logo.
- `/auth/cadastro` — Nome, email, senha, confirmar senha + logo.
- `/reset-password` — definir nova senha (fluxo recovery).
- `_authenticated/route.tsx` — gate de sessão (ssr:false) + `purgeExpiredLeads()` no loader. Layout com sidebar + header (logo, nome do usuário, sair).
- `_authenticated/dashboard` — Dashboard.
- `_authenticated/leads` — tabela completa.
- `_authenticated/funil` — Kanban do funil de vendas.
- `_authenticated/follow-up` — Kanban do funil de follow-up.
- `_authenticated/configuracoes` — alterar nome/email/senha; gerente gerencia papéis dos usuários.

### Menu lateral (sidebar shadcn, colapsável)
Dashboard · Leads · Funil de Vendas · Funil de Follow-up · Configurações.

### Tabela de Leads
Colunas: Data Criação, Nome, Telefone, Empresa, Cidade, UF, Origem, Faturamento, Etapa, Última Atualização, ícone WhatsApp, ações.
Recursos: busca global, paginação, ordenação, edição rápida (dialog), filtros (nome, empresa, cidade, UF, origem, etapa, data). Botão Novo Lead (form com todos os campos; UF = lista completa dos 27 estados; origem = 8 opções). Ficha do lead com observações + histórico (autor + data/hora) e movimentações.

### Kanban Funil de Vendas
Colunas: 🟡 Lead Novo, 🔵 Conversando, 🟣 Reunião, 🟠 Proposta, 🟢 Ganho, 🔴 Perdido, 🔁 Follow-up, 🧠 Sem Interesse. Drag-and-drop (@dnd-kit), contador por coluna, busca rápida, botão WhatsApp em cada card.
**Regras automáticas:**
- Card movido para **🔁 Follow-up** → sai do funil principal e entra no Funil de Follow-up em FOLLOW-UP 1.
- Card movido para **🧠 Sem Interesse** → grava `sem_interesse_at`; some após 24h (purga no load), removido de tabela/kanban/dashboards.

### Kanban Follow-up
Colunas: 📲 FOLLOW-UP 1 (24h) · 2 (2 dias) · 3 (3–4 dias) · 4 (última). Drag-and-drop, data da próxima ação, histórico. Após FOLLOW-UP 4 pode ir para Ganho / Perdido / Sem Interesse (volta ao fluxo do funil principal).

### WhatsApp
Botão em tabela, cards e ficha → abre `https://wa.me/55<numero limpo>` (sanitiza dígitos, `encodeURIComponent`).

### Dashboard
- **Vendedor:** Total, Novos, Conversando, Reuniões, Propostas, Ganhos, Perdidos, Follow-ups, Taxa de Conversão, Faturamento Potencial. Gráficos (recharts): leads por etapa, por origem, conversão do funil.
- **Gerente:** seletor **Minha Performance** / **Performance da Equipe**. Equipe: totais consolidados + taxa geral + **Ranking de Vendedores** (nome, leads, ganhos, propostas, taxa) + gráficos gerenciais (leads/ganhos/conversão por vendedor, leads por origem, evolução mensal) — tudo via agregados, sem expor dados dos leads.

### Import/Export CSV
- Importação: upload, mapeamento de colunas, validação zod, criação em lote (owner = usuário atual).
- Exportação: todos, filtrados ou relatório (gera CSV no cliente).

## Bibliotecas a instalar
`@dnd-kit/core` + `@dnd-kit/sortable` (Kanban), `recharts` (gráficos), `papaparse` (CSV), `zod` (já recomendado). shadcn já disponível.

## Segurança
- Papéis em `user_roles` (nunca no profile). Métricas de equipe só agregadas via função security definer. Validação client + server (zod). RLS escopada a `auth.uid()` em todos os dados de leads.

## Detalhes técnicos
- Leitura via TanStack Query (`ensureQueryData` no loader + `useSuspenseQuery`), `errorComponent`/`notFoundComponent` em rotas com loader.
- `head()` por rota com títulos pt-BR.
- Drag-and-drop atualiza etapa otimisticamente e persiste via `moveStage`.
- Exclusão automática: `purgeExpiredLeads()` no loader do layout autenticado a cada carregamento.

Ao final, sugiro publicar o app.