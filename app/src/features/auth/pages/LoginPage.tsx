/**
 * LoginPage.tsx - Autenticacao local real
 */
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/common/BrandLogo";
import { authService } from "../services/auth.service";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ana@morong.med.br");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authService.login(email, password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Nao foi possivel entrar no sistema. Confira e-mail, senha e se o banco local iniciou corretamente.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes login-entrance {
          0% { opacity: 0; transform: translateY(30px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-login-box {
          animation: login-entrance 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0;
          animation-delay: 6.5s;
        }
      `}</style>
      <div className="login-layout">
        <div className="login-left">
          <div className="login-box animate-login-box">
          <div className="text-center mb-8">
            <BrandLogo variant="expanded" className="login-brand-logo" />
            <h1 style={{ fontSize: "20px", color: "var(--color-green-deep)" }}>Controle de Estoque</h1>
            <p className="text-gray-500 text-sm mt-2">Acesso restrito ao painel clinico.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-control"
                value={email}
                autoComplete="username"
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <input
                type="password"
                className="form-control"
                placeholder="Digite sua senha"
                value={password}
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center gap-2 text-sm text-gray-500" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  style={{ accentColor: "var(--color-green-deep)" }}
                /> Lembrar acesso
              </label>
              <span className="text-sm text-gray-500">Acesso local</span>
            </div>

            {error && (
              <div className="badge badge-danger w-full justify-center mb-4" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" style={{ height: "44px" }} disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar no Sistema"}
            </button>

            <div className="mt-8 text-center text-xs text-gray-400">
              Criado por Voltq Co.
            </div>
          </form>
        </div>
      </div>
      <div className="login-right">
        <BrandLogo variant="collapsed-white" className="login-right-logo" />
      </div>
    </div>
    </>
  );
}
