"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

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

export default function AdminEntrarPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/admin/auth/signin", {
        method: "POST",
        body: new FormData(event.currentTarget),
        signal: controller.signal,
      });

      const result = await readJsonResponse(response);
      if (!response.ok || !result.success) {
        setMessage(result.message || "Não foi possível entrar no admin AJBSYSTEMS.");
        return;
      }

      window.location.href = result.redirectTo || "/admin";
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "O login administrativo demorou demais para responder." : "Erro inesperado ao entrar no admin AJBSYSTEMS.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><ShieldCheck className="h-6 w-6" /></div>
            <div><p className="text-lg font-black tracking-tight">AJBSYSTEMS Admin</p><p className="text-xs text-blue-100">Billing, licenças e suporte</p></div>
          </a>
          <a href="/entrar" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Entrar como cliente</a>
        </div>
      </section>

      <section className="mx-auto max-w-xl px-6 py-12 sm:px-10">
        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-bold text-blue-700">Área AJBSYSTEMS</p>
          <h1 className="mt-1 text-3xl font-black">Administração da plataforma</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use este acesso apenas para billing, suporte, trial e bloqueio/liberação de empresas clientes.</p>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-slate-700">E-mail administrativo<input name="email" type="email" required autoComplete="email" placeholder="anjobrito@gmail.com" className={inputClass} /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700">Senha administrativa<input name="adminPassword" type="password" required autoComplete="current-password" placeholder="Senha do admin AJBSYSTEMS" className={inputClass} /></label>
          </div>

          {message ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</div> : null}

          <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar no admin"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
