import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SekuloAvatar } from "@/components/sekulo/SekuloMessage";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada. Entra para começar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <SekuloAvatar size="lg" className="mb-4" />
          <div className="uppercase-tight text-xs text-muted-foreground">JANGO+</div>
          <h1 className="font-display text-3xl font-bold mt-1">SEKULO</h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xs">
            Não há atalhos. Há disciplina diária. Entra.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-card border border-border rounded-lg p-6">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name" className="uppercase-tight text-[10px]">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="O teu nome"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="uppercase-tight text-[10px]">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="uppercase-tight text-[10px]">Palavra-passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          <Button type="submit" disabled={busy} className="w-full uppercase-tight text-xs h-11">
            {busy ? "..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === "signin" ? "Ainda não tenho conta" : "Já tenho conta"}
          </button>
        </form>

        <p className="text-[11px] text-center text-muted-foreground mt-6">
          <Link to="/" className="underline">Voltar</Link>
        </p>
      </div>
    </div>
  );
}
