import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export function OrganizationCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [nome, setNome] = useState("");

  const { data: org, isLoading } = useQuery({
    queryKey: ["current-org"],
    queryFn: async () => {
      const { data, error } = await supabase.from("organizations").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (org?.nome) setNome(org.nome);
  }, [org?.nome]);

  const save = useMutation({
    mutationFn: async (newNome: string) => {
      if (!org) throw new Error("Sem organização");
      const { error } = await supabase.from("organizations").update({ nome: newNome }).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["current-org"] });
      toast.success("Organização atualizada!");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  function copyInvite() {
    if (!org?.invite_code) return;
    navigator.clipboard.writeText(org.invite_code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Minha organização</CardTitle>
        <CardDescription>
          {canEdit
            ? "Nome da sua organização e código de convite para novos membros."
            : "Você faz parte desta organização."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !org ? (
          <p className="text-sm text-muted-foreground">Organização não encontrada.</p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Nome da organização</Label>
              <Input value={nome} disabled={!canEdit} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Código de convite</Label>
              <div className="flex gap-2">
                <Input value={org.invite_code} readOnly className="font-mono" />
                <Button variant="outline" size="icon" onClick={copyInvite} title="Copiar">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Compartilhe este código com novos vendedores. Eles entram como pendentes de aprovação.
              </p>
            </div>
            {canEdit && (
              <Button onClick={() => save.mutate(nome)} disabled={save.isPending || !nome.trim() || nome === org.nome}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
