import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { pixelLogo as logo } from "@/lib/assets";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Redefinir senha · Pixel Marketing" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="Pixel Marketing" className="h-14 w-auto" />
          <h1 className="mt-4 font-display text-xl font-bold">Redefinir senha</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" required minLength={6} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" name="confirm" type="password" required minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
