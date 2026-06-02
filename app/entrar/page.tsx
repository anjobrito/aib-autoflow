"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Gauge } from "lucide-react";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";

export default function EntrarPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível entrar.");
      return;
    }

    window.location.href = result.redirectTo || "/dashboard";
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

          {message ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</div> : null}

          <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Entrando..." : "Entrar"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
