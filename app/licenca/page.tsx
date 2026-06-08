import { AlertTriangle, CheckCircle2, Copy, Gauge, Mail } from "lucide-react";

const billingEmail = "anjobrito@gmail.com";
const suggestedPlan = "R$ 49,90/mês";

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

      <section className="mx-auto grid max-w-5xl gap-6 px-6 py-12 sm:px-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-white p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><AlertTriangle className="h-7 w-7" /></div>
          <h1 className="mt-6 text-3xl font-black">Licença não liberada</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            A empresa está bloqueada, vencida ou aguardando liberação administrativa. Para voltar a usar o sistema, regularize o pagamento e solicite a liberação da licença.
          </p>

          <div className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700">
            <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><span>Faça o pagamento manual conforme combinado com a AJBSYSTEMS.</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><span>Envie o comprovante para conferência.</span></div>
            <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" /><span>Após conferência, a licença é liberada no painel administrativo.</span></div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a href="/planos" className="inline-flex justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">Ver planos</a>
            <a href="/entrar" className="inline-flex justify-center rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Voltar ao login</a>
          </div>
        </div>

        <aside className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-blue-300">Cobrança manual</p>
          <h2 className="mt-2 text-2xl font-black">Regularização da assinatura</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Enquanto a integração automática com pagamento não entra, a liberação é feita manualmente pela AJBSYSTEMS.</p>

          <div className="mt-6 rounded-3xl bg-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Contato de billing</p>
            <p className="mt-2 break-all text-lg font-black">{billingEmail}</p>
          </div>

          <div className="mt-4 rounded-3xl bg-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Plano inicial sugerido</p>
            <p className="mt-2 text-3xl font-black">{suggestedPlan}</p>
            <p className="mt-2 text-sm text-slate-300">Ideal para piloto com oficina, funilaria, lava-jato ou estética.</p>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300">
            <Mail className="h-4 w-4" />
            Envie comprovante e dados da empresa.
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300">
            <Copy className="h-4 w-4" />
            O painel admin libera ou bloqueia a licença.
          </div>
        </aside>
      </section>
    </main>
  );
}
