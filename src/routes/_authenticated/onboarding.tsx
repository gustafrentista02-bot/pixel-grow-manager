import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Plus,
  Loader2,
  Check,
  PartyPopper,
  Building2,
  Users,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentOrg } from "@/hooks/use-current-org";
import { useLeadMutations } from "@/hooks/use-leads";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { WhatsAppCard } from "@/components/whatsapp-card";
import { parseLeadsCsv } from "@/lib/csv";
import { pixelLogo } from "@/lib/assets";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Primeiros passos · Pixel CRM" }] }),
  component: OnboardingPage,
});

const TOTAL = 4;

function OnboardingPage() {
  const { data: auth } = useAuth();
  const { data: org } = useCurrentOrg();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [nome, setNome] = useState(org?.nome ?? "");
  const [nomeSalvo, setNomeSalvo] = useState(false);
  const [leadsCriados, setLeadsCriados] = useState(0);
  const [leadDialogOpen, setLeadDialogOpen] = useState(false);
  const [whatsappPulado, setWhatsappPulado] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { create } = useLeadMutations();

  useEffect(() => {
    if (org?.nome && !nomeSalvo) setNome((prev) => (prev ? prev : org.nome));
  }, [org?.nome, nomeSalvo]);

  // Status atual do WhatsApp deste usuário (mesma query do WhatsAppCard)
  const { data: whatsInst } = useQuery({
    queryKey: ["whatsapp-instance", auth?.user?.id],
    queryFn: async () => {
      if (!auth?.user) return null;
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("status")
        .eq("owner_id", auth.user.id)
        .maybeSingle();
      return data as { status: string } | null;
    },
    enabled: Boolean(auth?.user),
  });
  const whatsappConectado = whatsInst?.status === "conectado";

  const saveNome = useMutation({
    mutationFn: async (novoNome: string) => {
      if (!org) throw new Error("Sem organização");
      const { error } = await supabase
        .from("organizations")
        .update({ nome: novoNome })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["current-org"] });
      setNomeSalvo(true);
      setStep(2);
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const finish = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error("Sem organização");
      const { error } = await supabase
        .from("organizations")
        .update({ onboarding_concluido: true })
        .eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["current-org"] });
      toast.success("Tudo pronto!");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const { valid, errors } = await parseLeadsCsv(file);
    let importados = 0;
    const falhas = [...errors];
    for (let i = 0; i < valid.length; i++) {
      try {
        await create.mutateAsync(valid[i]);
        importados++;
      } catch (err) {
        falhas.push({
          row: i + 2,
          message: err instanceof Error ? err.message : "Erro ao salvar.",
        });
      }
    }
    if (importados > 0) {
      setLeadsCriados((n) => n + importados);
      toast.success(`${importados} lead(s) importado(s), ${falhas.length} ignorado(s).`);
    } else {
      toast.error(`Nenhum lead importado. ${falhas.length} linha(s) ignorada(s).`);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function goNext() {
    setStep((s) => Math.min(TOTAL, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  const progress = (step / TOTAL) * 100;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col p-4 md:p-6">
      <header className="mb-6 flex items-center gap-3">
        <img src={pixelLogo} alt="Pixel" className="h-8 w-8 object-contain" />
        <div>
          <h1 className="font-display text-lg font-bold">Primeiros passos</h1>
          <p className="text-xs text-muted-foreground">Passo {step} de {TOTAL}</p>
        </div>
      </header>

      <Progress value={progress} className="mb-6" />

      <Card className="flex-1">
        <CardContent className="p-6 md:p-8">
          {step === 1 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Bem-vindo ao Pixel CRM</h2>
                  <p className="text-sm text-muted-foreground">
                    Gestão de leads e follow-up para quem trabalha com Perfil de Empresa no Google
                    e SEO local.
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Vamos configurar sua conta em poucos minutos. Comece confirmando o nome da sua
                empresa (aparece nas propostas, no painel da equipe e para novos vendedores que você
                convidar).
              </p>
              <div className="space-y-2">
                <Label htmlFor="onb-nome">Nome da empresa</Label>
                <Input
                  id="onb-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex.: Pixel Marketing"
                />
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Primeiros leads</h2>
                  <p className="text-sm text-muted-foreground">
                    Adicione alguns leads para começar. Você pode importar uma planilha ou criar
                    manualmente.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card
                  className="cursor-pointer border-dashed transition hover:border-primary hover:bg-primary/5"
                  onClick={() => fileRef.current?.click()}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                    <Upload className="h-8 w-8 text-primary" />
                    <p className="font-medium">Importar planilha</p>
                    <p className="text-xs text-muted-foreground">
                      Arquivo CSV com seus leads atuais.
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer border-dashed transition hover:border-primary hover:bg-primary/5"
                  onClick={() => setLeadDialogOpen(true)}
                >
                  <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
                    <Plus className="h-8 w-8 text-primary" />
                    <p className="font-medium">Adicionar manualmente</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastre um lead completo pelo formulário.
                    </p>
                  </CardContent>
                </Card>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
              {leadsCriados > 0 && (
                <p className="flex items-center gap-2 text-sm text-primary">
                  <Check className="h-4 w-4" /> {leadsCriados} lead(s) adicionado(s) nesta sessão.
                </p>
              )}
              <LeadFormDialog
                open={leadDialogOpen}
                onOpenChange={setLeadDialogOpen}
                onSubmit={async (input) => {
                  try {
                    await create.mutateAsync(input);
                    setLeadsCriados((n) => n + 1);
                    setLeadDialogOpen(false);
                  } catch {
                    /* toast já é tratado */
                  }
                }}
                saving={create.isPending}
              />
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Conectar WhatsApp</h2>
                  <p className="text-sm text-muted-foreground">
                    Conectar agora libera as automações de follow-up e o envio de cadências para
                    seus leads.
                  </p>
                </div>
              </div>
              {auth?.user && <WhatsAppCard userId={auth.user.id} />}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <PartyPopper className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-2xl font-bold">Tudo pronto!</h2>
                <p className="text-sm text-muted-foreground">
                  Sua conta já está configurada. Você pode ajustar tudo depois em Configurações.
                </p>
              </div>
              <div className="mx-auto max-w-sm space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-left text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Empresa: <span className="font-medium">{org?.nome ?? nome}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>
                    Leads: <span className="font-medium">{leadsCriados}</span>{" "}
                    {leadsCriados === 0 && (
                      <span className="text-muted-foreground">(pode adicionar depois)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>
                    WhatsApp:{" "}
                    <span className="font-medium">
                      {whatsappConectado ? "Conectado" : whatsappPulado ? "Pulado" : "Não conectado"}
                    </span>
                  </span>
                </div>
              </div>
              <Button
                size="lg"
                className="gap-2"
                onClick={() => finish.mutate()}
                disabled={finish.isPending}
              >
                {finish.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Ir para o Dashboard <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </section>
          )}
        </CardContent>
      </Card>

      {/* Navegação */}
      {step < 4 && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={goBack} disabled={step === 1} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            {step >= 2 && (
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 3) setWhatsappPulado(true);
                  goNext();
                }}
              >
                Pular por enquanto
              </Button>
            )}
            {step === 1 ? (
              <Button
                onClick={() => saveNome.mutate(nome.trim())}
                disabled={!nome.trim() || saveNome.isPending}
                className="gap-2"
              >
                {saveNome.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={goNext} className="gap-2">
                Continuar <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
