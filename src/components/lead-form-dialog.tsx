import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ORIGINS,
  UF_LIST,
  POTENCIAL_OPTIONS,
  PLANO_OPTIONS,
  STATUS_COMERCIAL_OPTIONS,
  CANAIS_AQUISICAO_OPTIONS,
  TEMPERATURA_OPTIONS,
} from "@/lib/crm";
import { EMPTY_LEAD_INPUT, leadToInput, listMembers } from "@/lib/leads-api";
import type { Lead, LeadInput } from "@/lib/leads-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSubmit: (input: LeadInput) => void;
  saving?: boolean;
};

const CONTRACT_PRESETS = [297, 497, 997, 1500];
const NONE = "__none__";

export function LeadFormDialog({ open, onOpenChange, lead, onSubmit, saving }: Props) {
  const [form, setForm] = useState<LeadInput>(EMPTY_LEAD_INPUT);
  const { data: members = [] } = useQuery({ queryKey: ["members"], queryFn: listMembers, enabled: open });

  useEffect(() => {
    setForm(lead ? leadToInput(lead) : EMPTY_LEAD_INPUT);
  }, [lead, open]);

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleCanal(canal: string) {
    setForm((f) => ({
      ...f,
      canais_aquisicao: f.canais_aquisicao.includes(canal)
        ? f.canais_aquisicao.filter((c) => c !== canal)
        : [...f.canais_aquisicao, canal],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
          <DialogDescription>Cadastro completo para venda consultiva de SEO Local.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs defaultValue="basicos">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basicos">Dados Básicos</TabsTrigger>
              <TabsTrigger value="comercial">Comercial</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
            </TabsList>

            {/* -------- Dados Básicos -------- */}
            <TabsContent value="basicos" className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@empresa" />
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Input value={form.site} onChange={(e) => set("site", e.target.value)} placeholder="https://" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={form.uf || undefined} onValueChange={(v) => set("uf", v)}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Área de atendimento</Label>
                <Input value={form.area_atendimento} onChange={(e) => set("area_atendimento", e.target.value)} placeholder="Bairro / Região / Cidade" />
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Input value={form.segmento} onChange={(e) => set("segmento", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={form.origem} onValueChange={(v) => set("origem", v as LeadInput["origem"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORIGINS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={form.responsavel_id ?? NONE}
                  onValueChange={(v) => set("responsavel_id", v === NONE ? null : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Sem responsável —</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome || m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
              </div>
            </TabsContent>

            {/* -------- Comercial -------- */}
            <TabsContent value="comercial" className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Faturamento mensal (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.faturamento_mensal}
                  onChange={(e) => set("faturamento_mensal", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor do contrato (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.valor_contrato}
                  onChange={(e) => set("valor_contrato", Number(e.target.value) || 0)}
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CONTRACT_PRESETS.map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant={form.valor_contrato === v ? "default" : "outline"}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => set("valor_contrato", v)}
                    >
                      R$ {v.toLocaleString("pt-BR")}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={form.plano || undefined} onValueChange={(v) => set("plano", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                  <SelectContent>
                    {PLANO_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status_comercial || undefined} onValueChange={(v) => set("status_comercial", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_COMERCIAL_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Potencial de fechamento</Label>
                <div className="flex flex-wrap gap-2">
                  {POTENCIAL_OPTIONS.map((p) => (
                    <Button
                      key={p.value}
                      type="button"
                      variant={form.potencial === p.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => set("potencial", p.value)}
                    >
                      <span className={`mr-2 h-2 w-2 rounded-full ${p.dot}`} />
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* -------- Marketing -------- */}
            <TabsContent value="marketing" className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Possui Perfil no Google?</Label>
                  <Switch checked={form.tem_perfil_google} onCheckedChange={(v) => set("tem_perfil_google", v)} />
                </div>
                <div className="space-y-2">
                  <Label>Link do Perfil Google</Label>
                  <Input
                    value={form.link_perfil_google}
                    onChange={(e) => set("link_perfil_google", e.target.value)}
                    placeholder="https://g.page/..."
                    disabled={!form.tem_perfil_google}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Possui Site?</Label>
                  <Switch checked={form.tem_site} onCheckedChange={(v) => set("tem_site", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Já faz Google Ads?</Label>
                  <Switch checked={form.faz_google_ads} onCheckedChange={(v) => set("faz_google_ads", v)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label>Já faz Meta Ads?</Label>
                  <Switch checked={form.faz_meta_ads} onCheckedChange={(v) => set("faz_meta_ads", v)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Como chegam clientes hoje?</Label>
                <div className="flex flex-wrap gap-2">
                  {CANAIS_AQUISICAO_OPTIONS.map((c) => {
                    const active = form.canais_aquisicao.includes(c);
                    return (
                      <Badge
                        key={c}
                        variant={active ? "default" : "outline"}
                        className="cursor-pointer select-none"
                        onClick={() => toggleCanal(c)}
                      >
                        {c}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Principal objetivo</Label>
                <Textarea value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} rows={2} placeholder="Ex: aparecer no topo do Google para buscas locais" />
              </div>
              <div className="space-y-2">
                <Label>Principal dificuldade</Label>
                <Textarea value={form.dificuldade} onChange={(e) => set("dificuldade", e.target.value)} rows={2} placeholder="Ex: poucos clientes chegando pelo Google" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
