# Pixel Design System

Barra única de componentes reutilizáveis do Pixel CRM. Importe sempre a partir de `@/components/pixel` — nunca replique estilos ad-hoc em telas.

```ts
import {
  StatusBadge, TemperatureBadge, OriginBadge, PulseIndicator,
  ExternalLinkCard, ExternalLinkGrid,
  KpiCard, StatTile, Block,
  SectionHeader, InfoCard,
  EmptyState, LoadingState, ErrorState, SkeletonRow,
} from "@/components/pixel";
```

## Princípios

- **Tokens semânticos apenas.** Nunca `text-white`, `bg-black`, nem hex direto. Use `bg-card`, `text-muted-foreground`, `text-primary`, tons `emerald/amber/red-500` só para status.
- **Dark mode obrigatório.** Todo componente é testado no tema escuro corporativo.
- **Espaçamento consistente.** Cards com `rounded-2xl`, padding `p-4`/`p-5`, gaps `gap-3`/`gap-4`.
- **Tipografia.** Títulos de página em `font-display` (Sora), corpo em Inter. Subtítulos de bloco em uppercase tracking `0.14em`.
- **Responsividade.** Header rows usam `grid-cols-[minmax(0,1fr)_auto]` no mobile e viram `sm:flex` em telas maiores. Textos longos sempre com `truncate` + `min-w-0`.

## Catálogo

### Badges
| Componente | Uso |
| --- | --- |
| `StatusBadge` | Estágio do lead no funil (novo, conversando, ganho…). |
| `TemperatureBadge` | Temperatura comercial (quente / morno / frio). |
| `OriginBadge` | Origem do lead (indicação, GBP, tráfego, etc.). |
| `PulseIndicator` | Saúde operacional do lead — 🟢 saudável / 🟡 atenção / 🔴 crítico. Use `computeLeadPulse(lead)` para derivar o nível. |

### Links externos
- `ExternalLinkCard` — ícone + rótulo + status + ações Abrir/Copiar. A URL só aparece via tooltip. Kinds suportados: `google-profile`, `google-maps`, `site`, `instagram`, `facebook`, `whatsapp`, `drive`, `contract`, `proposal`, `audit`, `generic`.
- `ExternalLinkGrid` — grid `sm:grid-cols-2` para organizar múltiplos links.

### Métricas
- `KpiCard` — tile compacto de KPI com ícone tonalizado, valor grande, delta opcional em `%`.
- `KpiCardSkeleton` — placeholder animado.
- `StatTile` — tile maior, para blocos de destaque (dashboard).
- `Block` — seção com título uppercase, ícone opcional e slot de ação.
- `TONES` — paleta semântica (`green`, `violet`, `sky`, `cyan`, `amber`, `orange`, `red`).

### Cabeçalhos e cartões
- `SectionHeader` — cabeçalho unificado. `variant="page"` para topo de rota (H1 + descrição), `variant="block"` para subseções.
- `InfoCard` — card compacto label + valor + hint, ideal para grades de detalhes.

### Estados
- `EmptyState` — vazio padrão (ícone, título, descrição, ação). Use `compact` dentro de blocos pequenos.
- `LoadingState` — spinner inline. `SkeletonRow` para linhas de tabela.
- `ErrorState` — erro amigável com botão "Tentar novamente".

## Como estender

1. Se um novo padrão surgir em duas ou mais telas, promova para `src/components/pixel/*.tsx`.
2. Exponha via `index.ts` e documente aqui.
3. Nunca crie variantes locais que dupliquem badges, cards ou headers já existentes — estenda o componente base com props.

## Checklist de QA por tela

Antes de considerar uma tela pronta:

- [ ] Título usa `SectionHeader variant="page"`.
- [ ] Cards seguem `rounded-2xl` + tokens semânticos.
- [ ] Estados vazio / carregando / erro usam os primitivos do DS.
- [ ] Badges de status/temperatura/origem vêm do DS.
- [ ] Links externos usam `ExternalLinkCard` — nunca `<a>` cru mostrando URL.
- [ ] Header responsivo: `grid` no mobile, `sm:flex` em telas maiores.
- [ ] Textos longos com `truncate` + `min-w-0`.
- [ ] Sem cores hardcoded (`text-white`, `bg-black`, hex).
