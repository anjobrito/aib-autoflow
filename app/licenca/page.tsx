import { AlertTriangle, Gauge } from "lucide-react";

export default function LicencaPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-slate-950 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500"><Gauge className="h-6 w-6" /></div>
            <div><p className="text-lg font-black tracking-tight">AJB AutoFlow</p><p className="text-xs text-blue-100">by AJBSYSTEMS</p></div>
          </a>
          <a href="/entrar" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Entrar</a>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle className="h-7 w-7" /></div>
          <h1 className="mt-6 text-3xl font-black">Licença não liberada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">A empresa não está liberada para uso no momento. Regularize a licença ou aguarde a liberação administrativa.</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/planos" className="inline-flex justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Ver planos</a>
            <a href="/entrar" className="inline-flex justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Voltar</a>
          </div>
        </div>
      </section>
    </main>
  );
}
