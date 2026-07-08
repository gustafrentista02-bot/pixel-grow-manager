import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCompanySettings, useCompanyMutation } from "@/hooks/use-company";
import type { CompanyInput } from "@/lib/company-api";

const EMPTY: CompanyInput = {
  nome_empresa: "",
  logo_url: "",
  telefone: "",
  whatsapp: "",
  instagram: "",
  site: "",
  meet_padrao: "",
  assinatura: "",
};

const FIELDS: { key: keyof CompanyInput; label: string; placeholder?: string }[] = [
  { key: "nome_empresa", label: "Nome da empresa", placeholder: "Pixel Marketing" },
  { key: "telefone", label: "Telefone", placeholder: "(00) 0000-0000" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "5500000000000" },
  { key: "instagram", label: "Instagram", placeholder: "@pixelmarketing" },
  { key: "site", label: "Site", placeholder: "https://..." },
  { key: "logo_url", label: "URL do logo", placeholder: "https://..." },
  { key: "meet_padrao", label: "Link de reunião padrão (Meet)", placeholder: "https://meet.google.com/..." },
];

export function CompanySettingsCard({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading } = useCompanySettings();
  const save = useCompanyMutation();
  const [form, setForm] = useState<CompanyInput>(EMPTY);

  useEffect(() => {
    if (data) {
      setForm({
        nome_empresa: data.nome_empresa ?? "",
        logo_url: data.logo_url ?? "",
        telefone: data.telefone ?? "",
        whatsapp: data.whatsapp ?? "",
        instagram: data.instagram ?? "",
        site: data.site ?? "",
        meet_padrao: data.meet_padrao ?? "",
        assinatura: data.assinatura ?? "",
      });
    }
  }, [data]);

  function set<K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados da empresa</CardTitle>
        <CardDescription>
          {canEdit
            ? "Usados nas propostas, assinaturas e mensagens padrão."
            : "Somente gerentes podem editar estes dados."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    disabled={!canEdit}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label>Assinatura (rodapé de mensagens)</Label>
              <Textarea
                value={form.assinatura}
                disabled={!canEdit}
                rows={3}
                placeholder="Equipe Pixel Marketing · (00) 0000-0000"
                onChange={(e) => set("assinatura", e.target.value)}
              />
            </div>
            {canEdit && (
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.nome_empresa.trim()}>
                {save.isPending ? "Salvando..." : "Salvar dados da empresa"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
