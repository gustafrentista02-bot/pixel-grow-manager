import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CompanySettingsCard } from "@/components/company-settings-card";
import { OrganizationCard } from "@/components/organization-card";
import { SubscriptionCard } from "@/components/subscription-card";
import { WhatsAppCard } from "@/components/whatsapp-card";
import { ROLE_LABELS } from "@/lib/crm";
import type { AppRole } from "@/lib/crm";
import { CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Pixel CRM" }] }),
  component: ConfigPage,
});

type Member = {
  id: string;
  nome: string;
  email: string;
  role: AppRole | null;
  status: string;
  whatsapp_status?: string | null;
  whatsapp_numero?: string | null;
};

async function loadTeam(): Promise<Member[]> {
  const [{ data: profiles }, { data: roles }, { data: wa }] = await Promise.all([
    supabase.from("profiles").select("id, nome, email, status").order("nome"),
    supabase.from("user_roles").select("user_id, role"),
    supabase.from("whatsapp_instances").select("owner_id, status, numero_conectado"),
  ]);
  const roleMap = new Map<string, AppRole>();
  (roles ?? []).forEach((r) => {
    if (r.role === "gerente" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
  });
  const waMap = new Map<string, { status: string; numero: string }>();
  (wa ?? []).forEach((w: any) => waMap.set(w.owner_id, { status: w.status, numero: w.numero_conectado }));
  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    status: p.status ?? "aprovado",
    role: roleMap.get(p.id) ?? null,
    whatsapp_status: waMap.get(p.id)?.status ?? null,
    whatsapp_numero: waMap.get(p.id)?.numero ?? null,
  }));
}

function ConfigPage() {
  const { data: auth } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState(auth?.nome ?? "");
  const isGerente = auth?.role === "gerente";

  const updateProfile = useMutation({
    mutationFn: async (newNome: string) => {
      const { error } = await supabase.from("profiles").update({ nome: newNome }).eq("id", auth!.user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      toast.success("Perfil atualizado!");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const { data: team = [] } = useQuery({ queryKey: ["team"], queryFn: loadTeam, enabled: isGerente });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("Perfil de acesso atualizado!");
    },
    onError: (e: Error) => toast.error("Erro ao alterar perfil", { description: e.message }),
  });

  const approve = useMutation({
    mutationFn: async (userId: string) => {
      // Verifica limite de usuários do plano
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userId)
        .maybeSingle();
      const orgId = (profile as any)?.organization_id;
      if (orgId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("limite_usuarios")
          .eq("id", orgId)
          .maybeSingle();
        const limite = (org as any)?.limite_usuarios ?? 0;
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("status", "aprovado");
        if (limite > 0 && (count ?? 0) >= limite) {
          throw new Error(`Limite de ${limite} usuários do seu plano atingido.`);
        }
      }
      const { error } = await supabase.from("profiles").update({ status: "aprovado" }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
      queryClient.invalidateQueries({ queryKey: ["approved-users-count"] });
      toast.success("Usuário aprovado!");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const reject = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["pending-count"] });
      toast.success("Cadastro recusado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const pending = team.filter((m) => m.status === "pendente");
  const approved = team.filter((m) => m.status !== "pendente");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil{isGerente ? " e sua equipe" : ""}.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Meu perfil</CardTitle>
          <CardDescription>{auth?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Perfil de acesso:</span>
            <Badge variant="outline">{auth?.role ? ROLE_LABELS[auth.role] : "—"}</Badge>
          </div>
          <Button onClick={() => updateProfile.mutate(nome)} disabled={updateProfile.isPending || !nome.trim()}>
            {updateProfile.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      {auth?.user?.id && <WhatsAppCard userId={auth.user.id} />}

      <OrganizationCard canEdit={isGerente} />

      {isGerente && <SubscriptionCard />}

      <CompanySettingsCard canEdit={isGerente} />


      {isGerente && pending.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader>
            <CardTitle className="text-base">Aguardando aprovação ({pending.length})</CardTitle>
            <CardDescription>Novos cadastros pendentes de liberação.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.email}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => reject.mutate(m.id)} disabled={reject.isPending}>
                          <XCircle className="mr-1 h-4 w-4" /> Recusar
                        </Button>
                        <Button size="sm" onClick={() => approve.mutate(m.id)} disabled={approve.isPending}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Aprovar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {isGerente && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Equipe</CardTitle>
            <CardDescription>Promova ou rebaixe vendedores e gerentes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">E-mail</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">Perfil de acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approved.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.email}</TableCell>
                    <TableCell>
                      {m.whatsapp_status === "conectado" ? (
                        <div className="flex flex-col">
                          <Badge className="w-fit bg-primary/20 text-primary hover:bg-primary/25">Conectado</Badge>
                          {m.whatsapp_numero && (
                            <span className="mt-0.5 text-xs text-muted-foreground">+{m.whatsapp_numero}</span>
                          )}
                        </div>
                      ) : m.whatsapp_status === "conectando" ? (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-500">Conectando</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Desconectado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={m.role ?? "vendedor"}
                        onValueChange={(v) => setRole.mutate({ userId: m.id, role: v as AppRole })}
                        disabled={m.id === auth?.user?.id}
                      >
                        <SelectTrigger className="ml-auto w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gerente">Gerente Geral</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
