# Pixel CRM V2 — Plano de Evolução

Mantendo 100% a identidade visual atual (tema escuro, verde Pixel, layout e sidebar existentes). Nada de mudança de branding.

Por ser um escopo muito grande, proponho entregar em **4 fases**. Cada fase é utilizável sozinha. Você aprova o plano e eu executo tudo em sequência.

---

## Fase 1 — Base de dados e Novo Lead completo

**Banco (migração):**
- Ampliar `leads` com os novos campos: `whatsapp`, `instagram`, `site`, `area_atendimento`, `responsavel_id`, `plano`, `status_comercial`, `potencial` (alta/média/baixa), `valor_contrato` (já existe), campos de marketing: `tem_perfil_google` (bool), `link_perfil_google`, `tem_site` (bool), `faz_google_ads` (bool), `faz_meta_ads` (bool), `canais_aquisicao` (array), `objetivo`, `dificuldade`, e `proxima_acao`, `reuniao_at`, `meet_link`.
- Enum novo `lead_plano` e `lead_potencial`.
- Nova tabela `lead_events` (timeline/histórico automático): tipo, descrição, timestamp, autor.
- Nova tabela `lead_files` (anexos) + bucket de Storage `lead-files` (privado, RLS por dono).
- Nova tabela `company_settings` (config da empresa: logo, nome, telefone, whatsapp, instagram, site, meet padrão, assinatura).
- Ampliar enum `app_role` com `administrador` (hoje só gerente/vendedor).
- GRANTs + RLS em todas as novas tabelas.

**Formulário Novo Lead** (`lead-form-dialog.tsx`): reorganizar em 3 seções (Dados Básicos, Comercial, Marketing) com todos os campos pedidos, incluindo toggles SIM/NÃO e selects de potencial/plano.

## Fase 2 — Tela do Lead + Kanban + Movimentação automática

**Tela exclusiva do Lead** (nova rota `/_authenticated/leads/$leadId`) com abas:
- **Geral**: todos os dados.
- **Comercial**: plano, valor, origem, responsável, observações.
- **Marketing**: perfil Google, site, instagram, área, Google/Meta Ads, objetivos, dificuldades.
- **Histórico**: timeline automática (lida de `lead_events`).
- **Arquivos**: upload/download de PDF, imagem, contrato, proposta (Storage).

Clicar no lead (tabela e card) abre esta página, não modal.

**Kanban** (`kanban-card.tsx`): cards ricos com Nome, Empresa, Cidade, Segmento, Origem, Valor, Próxima ação, Próxima reunião, ícones (Google/Site/Instagram/WhatsApp) e cor por prioridade (potencial).

**Movimentação automática** (ao arrastar/mover):
- Lead Novo → Conversando: registra data automática (event).
- Conversando → Reunião: abre diálogo de calendário (data + hora + link Meet) e salva.
- Reunião → Proposta: registra automaticamente.
- Proposta → Ganho: atualiza receita/conversão no dashboard.
- Cada movimento grava um `lead_event` para a timeline.

## Fase 3 — Follow-up, Tarefas, Modelos e Configurações

**Follow-up**: prazos 24h / 2d / 5d / 10d com contador de dias restantes e botões: Enviar mensagem, Copiar mensagem, Mover p/ próximo, Concluir, Sem interesse.

**Tarefas**: gerenciador completo com Responsável, Prioridade, Prazo, Status, Lead e Empresa relacionados; atalhos de tipo (Ligar, Enviar proposta, Cobrar retorno, Enviar contrato, Enviar Meet, Criar Perfil Google, Solicitar avaliações, Postagens).

**Modelos de Mensagem**: categorias completas (Primeiro contato, Qualificação, Agendamento, Confirmação, Lembrete, Pós reunião, Envio proposta, Cobrança, Follow-up, Solicitação avaliação, Fechamento) com Copiar / Editar / Duplicar / Excluir.

**Modelos de Proposta**: salvar/editar/duplicar modelos, **gerar PDF** (client-side) e enviar por WhatsApp.

**Configurações**: dados da empresa (logo, nome, telefone, whatsapp, instagram, site, meet padrão, assinatura) + gestão de usuários e permissões (Administrador / Gerente / Vendedor).

## Fase 4 — Dashboards, Busca, Filtros, Import/Export

**Dashboard principal**: todos os indicadores (Leads Hoje/Semana/Mês, Conversando, Reuniões Agendadas/Realizadas, Propostas, Ganhos, Perdidos, Ticket Médio, Receita Prevista/Confirmada, MRR, Taxa de Conversão), gráfico de funil, gráfico por origem e painel "Próximas Reuniões" com botão Entrar no Meet.

**Dashboard "Hoje"** (novo painel inicial): leads novos, reuniões de hoje, tarefas pendentes, follow-ups pendentes, receita prevista, propostas abertas.

**Dashboard de Vendas** (gerente): conversão/receita/reuniões/propostas/ganhos/ticket médio por vendedor.

**Busca global**: nome, empresa, telefone, instagram, cidade, segmento.

**Filtros**: cidade, estado, segmento, origem, responsável, período, etapa, plano, valor.

**Importação**: CSV e Excel (parse client-side; Google Sheets via URL/CSV export). **Exportação**: CSV, Excel e PDF.

---

## Notas técnicas
- Backend: Lovable Cloud (migrações + RLS + Storage). Leads hoje são "owner-only"; para dashboards de equipe e responsável, ajusto RLS para gerentes/administradores lerem leads da equipe (via `has_role`), mantendo vendedores restritos aos próprios.
- PDF: geração no cliente (jspdf/html) para evitar dependências Node no runtime edge.
- Import Excel: biblioteca `xlsx` no cliente; CSV com `papaparse` (já usado).
- Timeline: preenchida automaticamente via inserts em `lead_events` nas ações-chave (não uso triggers em schema protegido).

## Decisão de escopo
Recomendo executar **fase a fase** (aprovo e sigo para a próxima) para você validar cada bloco. Se preferir, executo as 4 fases direto sem parar. Me diga qual prefere.
