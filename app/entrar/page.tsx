"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Gauge, HelpCircle, X } from "lucide-react";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: text };
  }
}

function isBlockedMessage(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("bloqueada") || lower.includes("cancelada") || lower.includes("assinatura") || lower.includes("pagamento") || lower.includes("licença") || lower.includes("licenca");
}

export default function EntrarPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const shouldShowHelp = useMemo(() => isBlockedMessage(message), [message]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        body: new FormData(event.currentTarget),
        signal: controller.signal,
      });

      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        setMessage(result.message || "Não foi possível entrar. Verifique e-mail, senha e liberação da empresa.");
        return;
      }

      window.location.href = result.redirectTo || "/dashboard";
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "O login demorou demais para responder. Verifique a conexão com o banco e tente novamente." : "Erro inesperado ao entrar. Verifique o log do deploy ou o terminal do Next.js.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><Gauge className="h-6 w-6" /></div>
            <div><p className="text-lg font-black tracking-tight">AJB AutoFlow</p><p className="text-xs text-blue-100">by AJBSYSTEMS</p></div>
          </a>
          <a href="/cadastro" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Criar conta</a>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-6 py-12 sm:px-10">
        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-bold text-blue-700">Acesso SaaS</p>
          <h1 className="mt-1 text-3xl font-black">Entrar no AJB AutoFlow</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use o e-mail e senha cadastrados para acessar a empresa.</p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">E-mail<input name="email" type="email" required autoComplete="email" placeholder="voce@empresa.com" className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Senha<input name="password" type="password" required autoComplete="current-password" placeholder="Sua senha" className={inputClass} /></label>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{message}</span>
                {shouldShowHelp ? (
                  <button type="button" onClick={() => setHelpOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-red-700 shadow-sm hover:bg-red-100">
                    <HelpCircle className="h-4 w-4" />
                    Precisa de ajuda?
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>

      {helpOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-8">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-amber-700">Acesso bloqueado</p>
                  <h2 className="text-2xl font-black text-slate-950">Regularize a assinatura</h2>
                </div>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-6 grid gap-4 text-sm leading-6 text-slate-700">
              <p>O acesso da empresa está bloqueado porque a assinatura está vencida, cancelada ou aguardando confirmação de pagamento.</p>
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="font-black text-slate-950">O que fazer agora?</p>
                <ol className="mt-3 grid list-decimal gap-2 pl-5">
                  <li>Entre em contato com o responsável financeiro da sua empresa ou com a AJBSYSTEMS.</li>
                  <li>Regularize o pagamento da assinatura.</li>
                  <li>Após a confirmação, o acesso será liberado automaticamente ou pela administração da plataforma.</li>
                  <li>Tente entrar novamente após a liberação.</li>
                </ol>
              </div>
              <p className="rounded-2xl bg-blue-50 px-4 py-3 font-bold text-blue-700">Em caso de pagamento recente, aguarde a confirmação ou envie o comprovante para acelerar a liberação.</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/licenca" className="inline-flex flex-1 justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Ver instruções de licença</a>
              <button type="button" onClick={() => setHelpOpen(false)} className="inline-flex flex-1 justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Fechar</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
