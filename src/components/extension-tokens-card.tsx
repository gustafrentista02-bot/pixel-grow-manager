import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { formatDateTime } from "@/lib/format";

type Tok = {
  id: string;
  nome: string;
  token: string;
  revogado: boolean;
  last_used_at: string | null;
  created_at: string;
};

async function listTokens(userId: string): Promise<Tok[]> {
  const { data, error } = await supabase
    .from("extension_tokens")
    .select("id, nome, token, revogado, last_used_at, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Tok[];
}

export function ExtensionTokensCard() {
  const { data: auth } = useAuth();
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const [nome, setNome] = useState("Extensão Chrome");
  const [novoToken, setNovoToken] = useState<string | null>(null);

  const userId = auth?.user?.id;
  const orgId = org?.id;

  const tokensQ = useQuery({
    queryKey: ["extension-tokens", userId],
    queryFn: () => listTokens(userId!),
    enabled: !!userId,
  });

  const gerar = useMutation({
    mutationFn: async () => {
      if (!userId || !orgId) throw new Error("Sessão inválida");
      const { data, error } = await supabase
        .from("extension_tokens")
        .insert({ owner_id: userId, organization_id: orgId, nome: nome.trim() || "Extensão Chrome" })
        .select("token")
        .single();
      if (error) throw error;
      return data.token as string;
    },
    onSuccess: (token) => {
      setNovoToken(token);
      qc.invalidateQueries({ queryKey: ["extension-tokens", userId] });
      toast.success("Token gerado! Copie agora — ele só aparece uma vez.");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const revogar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("extension_tokens").update({ revogado: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["extension-tokens", userId] });
      toast.success("Token revogado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  async function copiar(v: string) {
    try {
      await navigator.clipboard.writeText(v);
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Extensão de Auditoria</CardTitle>
        <CardDescription>
          Gere um token para conectar a extensão do Chrome que audita perfis do Google Maps automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label>Nome do token</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Meu notebook" />
          </div>
          <Button onClick={() => gerar.mutate()} disabled={gerar.isPending || !userId || !orgId}>
            {gerar.isPending ? "Gerando..." : "Gerar token"}
          </Button>
        </div>

        {novoToken && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Copie agora — por segurança, o token só é exibido uma vez. Cole na tela de opções da extensão do Chrome.
            </p>
            <div className="flex items-center gap-2">
              <Input readOnly value={novoToken} className="font-mono text-xs" />
              <Button size="sm" variant="outline" onClick={() => copiar(novoToken)}>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
          </div>
        )}

        {tokensQ.data && tokensQ.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokensQ.data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(t.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{t.last_used_at ? formatDateTime(t.last_used_at) : "—"}</TableCell>
                  <TableCell>
                    {t.revogado ? (
                      <Badge variant="outline" className="text-muted-foreground">Revogado</Badge>
                    ) : (
                      <Badge className="bg-primary/20 text-primary hover:bg-primary/25">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!t.revogado && (
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => revogar.mutate(t.id)} disabled={revogar.isPending}>
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Revogar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
