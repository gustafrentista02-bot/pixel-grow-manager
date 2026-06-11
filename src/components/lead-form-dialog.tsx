import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ORIGINS, UF_LIST } from "@/lib/crm";
import type { Lead, LeadInput } from "@/lib/leads-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead?: Lead | null;
  onSubmit: (input: LeadInput) => void;
  saving?: boolean;
};

const empty: LeadInput = {
  nome: "",
  telefone: "",
  cidade: "",
  uf: "",
  empresa: "",
  segmento: "",
  faturamento_mensal: 0,
  valor_contrato: 0,
  origem: "outro",
  observacoes: "",
};

const CONTRACT_PRESETS = [297, 497, 997, 1500];

export function LeadFormDialog({ open, onOpenChange, lead, onSubmit, saving }: Props) {
  const [form, setForm] = useState<LeadInput>(empty);

  useEffect(() => {
    if (lead) {
      setForm({
        nome: lead.nome,
        telefone: lead.telefone,
        cidade: lead.cidade,
        uf: lead.uf,
        empresa: lead.empresa,
        segmento: lead.segmento,
        faturamento_mensal: lead.faturamento_mensal,
        valor_contrato: lead.valor_contrato,
        origem: lead.origem,
        observacoes: lead.observacoes,
      });
    } else {
      setForm(empty);
    }
  }, [lead, open]);

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    onSubmit(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
          <DialogDescription>Preencha as informações do lead comercial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} />
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
              <Label>Segmento</Label>
              <Input value={form.segmento} onChange={(e) => set("segmento", e.target.value)} />
            </div>
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
            <div className="space-y-2 sm:col-span-2">
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
