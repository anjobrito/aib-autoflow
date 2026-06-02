"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Building2, Gauge } from "lucide-react";
import { businessTypes } from "@/lib/business-types";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";

function Input({ name, label, placeholder, type = "text", required = true }: { name: string; label: string; placeholder: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input type={type} name={name} required={required} placeholder={placeholder} className={inputClass} />
    </label>
  );
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: text };
  }
}

export default function CadastroPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        body: new FormData(event.currentTarget),
        signal: controller.signal,
      });

      const result = await readJsonResponse(response);

      if (!response.ok || !result.success) {
        setMessage(result.message || "Não foi possível criar a conta. Verifique o banco e tente novamente.");
        return;
      }

      window.location.href = result.redirectTo || "/dashboard";
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "O cadastro demorou demais para responder. Verifique a conexão com o banco e tente novamente." : "Erro inesperado ao criar a conta. Verifique o terminal do Next.js.");
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
          <a href="/entrar" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Entrar</a>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:px-10 lg:grid-cols-[1fr_560px] lg:px-16">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-sm md:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500"><Building2 className="h-7 w-7" /></div>
          <h1 className="mt-8 text-4xl font-black leading-tight sm:text-5xl">Crie sua empresa no AJB AutoFlow.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">Esta é a fundação SaaS: empresa, usuário proprietário, assinatura inicial e sessão segura por cookie.</p>
          <div className="mt-8 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-200">Para piloto comercial, cadastre a funilaria como Oficina mecânica ou Centro automotivo / Completo.</div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <p className="text-sm font-bold text-blue-700">Cadastro SaaS</p>
          <h2 className="mt-1 text-3xl font-black">Empresa e usuário</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Cria uma empresa isolada e o primeiro usuário proprietário.</p>

          <div className="mt-6 grid gap-4">
            <Input name="tradeName" label="Nome fantasia" placeholder="Ex: Funilaria do João" />
            <Input name="companyName" label="Razão social" placeholder="Ex: Funilaria do João Ltda" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input name="cnpj" label="CNPJ" placeholder="Ex: 12.345.678/0001-90" />
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Tipo de negócio
                <select name="businessType" className={inputClass}>
                  {businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2"><Input name="city" label="Cidade" placeholder="Ex: Araras" /><Input name="state" label="UF" placeholder="Ex: SP" /></div>
            <Input name="phone" label="Telefone/WhatsApp" placeholder="Ex: (19) 99999-0000" />
            <div className="grid gap-4 md:grid-cols-2"><Input name="ownerName" label="Responsável" placeholder="Ex: André Brito" /><Input name="email" label="E-mail de acesso" type="email" placeholder="voce@empresa.com" /></div>
            <Input name="password" label="Senha" type="password" placeholder="Mínimo 6 caracteres" />
          </div>

          {message ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{message}</div> : null}

          <button disabled={loading} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
            {loading ? "Criando..." : "Criar empresa"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  );
}
