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
import { ROLE_LABELS } from "@/lib/crm";
import type { AppRole } from "@/lib/crm";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações · Pixel CRM" }] }),
  component: ConfigPage,
});

type Member = { id: string; nome: string; email: string; role: AppRole | null };

async function loadTeam(): Promise<Member[]> {
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, nome, email").order("nome"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const roleMap = new Map<string, AppRole>();
  (roles ?? []).forEach((r) => {
    if (r.role === "gerente" || !roleMap.has(r.user_id)) roleMap.set(r.user_id, r.role);
  });
  return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null }));
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
                  <TableHead className="text-right">Perfil de acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome || "—"}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.email}</TableCell>
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
