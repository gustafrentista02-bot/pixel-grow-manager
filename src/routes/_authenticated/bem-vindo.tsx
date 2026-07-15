import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { pixelLogo } from "@/lib/assets";
import { PartyPopper, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bem-vindo")({
  head: () => ({ meta: [{ title: "Bem-vindo · Pixel CRM" }] }),
  component: BemVindoPage,
});

function BemVindoPage() {
  const { data: auth } = useAuth();
  const { data: org } = useCurrentOrg();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const begin = useMutation({
    mutationFn: async () => {
      if (!auth?.user) throw new Error("Sem usuário");
      const { error } = await supabase
        .from("profiles")
        .update({ primeiro_login_concluido: true })
        .eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["auth"] });
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-6 p-8 text-center">
          <img src={pixelLogo} alt="Pixel" className="mx-auto h-12 w-12 object-contain" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PartyPopper className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl font-bold">
              Bem-vindo à equipe da {org?.nome ?? "sua organização"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Aqui você vai gerenciar seus próprios leads e follow-ups. Tudo o que você criar fica
              associado ao seu usuário, e o gerente acompanha o desempenho da equipe.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={() => begin.mutate()}
            disabled={begin.isPending}
          >
            {begin.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Começar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
