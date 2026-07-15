# Onboarding — Gerente fundador (wizard) + Vendedor convidado (boas-vindas)

## 1. Banco de dados (migration única)

- `organizations.onboarding_concluido BOOLEAN NOT NULL DEFAULT false`
- `UPDATE organizations SET onboarding_concluido = true` (todas as orgs já existentes ficam fora do wizard)
- `profiles.primeiro_login_concluido BOOLEAN NOT NULL DEFAULT false`
- `UPDATE profiles SET primeiro_login_concluido = true` (usuários existentes não veem tela de boas-vindas)
- Policies existentes já permitem `UPDATE` do gerente na sua org e do usuário no próprio perfil — não precisa mudar RLS.

## 2. Redirecionamento automático

No mesmo lugar onde hoje se checa `status` e `subscription_status` (guard no `_authenticated/route.tsx` + hook `useCurrentOrg` / `useAuth`), adicionar duas regras, aplicadas antes das checagens de bloqueio existentes:

1. Se `role = 'gerente'` E `org.onboarding_concluido = false` E rota atual ≠ `/onboarding` → redireciona para `/onboarding`.
2. Senão, se `profile.primeiro_login_concluido = false` E rota atual ≠ `/bem-vindo` → redireciona para `/bem-vindo`.

Depois de concluído, nunca mais redireciona (o campo fica `true` e os hooks recarregam).

## 3. Rota `/onboarding` (wizard do gerente)

Arquivo `src/routes/_authenticated/onboarding.tsx`. Layout centrado com header próprio (sem sidebar), barra de progresso "Passo N de 4", botões Voltar / Pular / Continuar.

- **Passo 1 — Boas-vindas e nome da empresa**
  - Copy curta explicando Pixel CRM (gestão de leads e follow-up para quem trabalha com Perfil de Empresa no Google / SEO local).
  - Input com `org.nome` pré-preenchido, editável. Salva ao clicar "Continuar".

- **Passo 2 — Primeiros leads**
  - Dois cards lado a lado: "Importar planilha" e "Adicionar manualmente".
  - Reaproveita a importação CSV e o `LeadFormDialog` já usados em `/leads`, abrindo em dialog dentro do wizard.
  - Ao fechar o dialog, incrementa contador local `leadsImportados` (baseado em quantos foram criados).
  - Botão "Pular por enquanto" sempre visível.

- **Passo 3 — Conectar WhatsApp**
  - Reaproveita `<WhatsappCard />` (o mesmo de Configurações) dentro de um wrapper com texto explicativo curto ("Conectar agora libera as automações de follow-up nos próximos passos").
  - Botão "Pular por enquanto" disponível. O estado de conexão é lido do próprio hook do card.

- **Passo 4 — Pronto**
  - Resumo: nome confirmado, X leads criados nesta sessão, WhatsApp "Conectado" ou "Pulado".
  - Botão "Ir para o Dashboard" → server fn que faz `UPDATE organizations SET onboarding_concluido = true WHERE id = org.id` (só permitido para gerente da própria org via RLS existente), invalida cache do `useCurrentOrg`, navega para `/dashboard`.

## 4. Rota `/bem-vindo` (vendedor convidado)

Arquivo `src/routes/_authenticated/bem-vindo.tsx`. Tela única, centrada:

- Título "Bem-vindo à equipe da {org.nome}"
- Parágrafo curto: "Aqui você vai gerenciar seus próprios leads e follow-ups."
- Botão "Começar" → server fn que faz `UPDATE profiles SET primeiro_login_concluido = true WHERE id = auth.uid()`, invalida cache, navega para `/dashboard`.

## Detalhes técnicos

- Server functions novas em `src/lib/onboarding.functions.ts`:
  - `updateOrgName({ nome })` — usa `requireSupabaseAuth`, valida que o usuário é gerente e dono, executa UPDATE em `organizations`.
  - `completeOrgOnboarding()` — mesma checagem, marca `onboarding_concluido = true`.
  - `completeUserWelcome()` — marca `primeiro_login_concluido = true` para `auth.uid()`.
- Hooks: `useCurrentOrg` já existe; adicionar `onboarding_concluido` ao SELECT e ao tipo `OrgSubscription`. `useAuth` / `useProfile` (o que já retorna `status`) precisa retornar `primeiro_login_concluido` — adicionar ao SELECT.
- Papel do usuário: usar o mesmo mecanismo já em uso hoje para saber se é gerente (via `user_roles` / `has_role`). Se houver um hook `useIsGerente`, reaproveitar; senão, um query simples em `user_roles`.
- Guard: colocado em `_authenticated/route.tsx` (client-side, mesmo ponto que já bloqueia por `status`/assinatura), retornando `redirect({ to: '/onboarding' | '/bem-vindo' })` antes dos outros checks.
- Nenhum trigger novo; sem mudança em `handle_signup` (o default `false` já garante que novas orgs e novos perfis passam pelo fluxo).

## O que NÃO muda

- Formulário de lead, importação CSV e `whatsapp-card` continuam funcionando como estão em `/leads` e `/configuracoes`; o onboarding só os embute.
- RLS existente, `handle_signup`, edge functions da Cakto e assinatura ficam intactos.
