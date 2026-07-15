import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Smartphone, QrCode, Power, RefreshCw } from "lucide-react";

type Instance = {
  id: string;
  status: "desconectado" | "conectando" | "conectado" | string;
  numero_conectado: string;
  instance_name: string;
  connected_at: string | null;
};

async function loadMyInstance(userId: string): Promise<Instance | null> {
  const { data } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle();
  return (data as Instance | null) ?? null;
}

async function callInstance(action: "connect" | "status" | "disconnect") {
  const { data, error } = await supabase.functions.invoke("whatsapp-instance", { body: { action } });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
}

function statusBadge(status: string) {
  if (status === "conectado") return <Badge className="bg-primary/20 text-primary hover:bg-primary/25">Conectado</Badge>;
  if (status === "conectando") return <Badge variant="outline" className="border-amber-500/40 text-amber-500">Conectando…</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Desconectado</Badge>;
}

export function WhatsAppCard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const [qrOpen, setQrOpen] = useState(false);
  const [qrBase64, setQrBase64] = useState<string | null>(null);

  const { data: inst } = useQuery({
    queryKey: ["whatsapp-instance", userId],
    queryFn: () => loadMyInstance(userId),
    refetchInterval: qrOpen ? 4000 : false,
  });

  // Enquanto QR aberto: poll status
  useEffect(() => {
    if (!qrOpen) return;
    const t = setInterval(async () => {
      try {
        const res = await callInstance("status");
        qc.invalidateQueries({ queryKey: ["whatsapp-instance", userId] });
        qc.invalidateQueries({ queryKey: ["team-whatsapp"] });
        if (res?.status === "conectado") {
          setQrOpen(false);
          toast.success("WhatsApp conectado!");
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(t);
  }, [qrOpen, qc, userId]);

  const connect = useMutation({
    mutationFn: () => callInstance("connect"),
    onSuccess: (res: any) => {
      const b64 = res?.base64 as string | null;
      if (b64) setQrBase64(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
      else setQrBase64(null);
      setQrOpen(true);
      qc.invalidateQueries({ queryKey: ["whatsapp-instance", userId] });
    },
    onError: (e: Error) => toast.error("Erro ao conectar", { description: e.message }),
  });

  const disconnect = useMutation({
    mutationFn: () => callInstance("disconnect"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-instance", userId] });
      qc.invalidateQueries({ queryKey: ["team-whatsapp"] });
      toast.success("WhatsApp desconectado");
    },
    onError: (e: Error) => toast.error("Erro", { description: e.message }),
  });

  const checkStatus = useMutation({
    mutationFn: () => callInstance("status"),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["whatsapp-instance", userId] });
      qc.invalidateQueries({ queryKey: ["team-whatsapp"] });
      const s = res?.status ?? "desconectado";
      if (s === "conectado") toast.success("Status: conectado");
      else if (s === "conectando") toast.info("Status: conectando…");
      else toast.info("Status: desconectado");
    },
    onError: (e: Error) => toast.error("Erro ao verificar", { description: e.message }),
  });

  const status = inst?.status ?? "desconectado";
  const isConnected = status === "conectado";

  return (
    <>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-primary" /> Meu WhatsApp
          </CardTitle>
          <CardDescription>Conecte seu número para envio de mensagens e cadências.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {statusBadge(status)}
                {isConnected && inst?.numero_conectado && (
                  <span className="text-sm font-medium">+{inst.numero_conectado}</span>
                )}
              </div>
              {isConnected && inst?.connected_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Conectado desde {new Date(inst.connected_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isConnected && (
              <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="gap-2">
                {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Conectar WhatsApp
              </Button>
            )}
            {isConnected && (
              <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending} className="gap-2">
                <Power className="h-4 w-4" /> Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Escaneie o QR code</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            {qrBase64 ? (
              <img src={qrBase64} alt="QR code" className="h-64 w-64 rounded bg-white p-2" />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded border border-dashed border-border">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Aguardando leitura…</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
