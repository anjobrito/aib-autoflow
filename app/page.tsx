import { ArrowRight, Bell, Car, ClipboardList, Gauge, LogIn, Package, Smartphone } from "lucide-react";

const features = [
  ["Ordens de serviço", "Abra e acompanhe serviços com status claros.", ClipboardList],
  ["Clientes e veículos", "Histórico por cliente, placa e veículo.", Car],
  ["Estoque simples", "Controle peças, produtos e insumos.", Package],
  ["Avisos ao cliente", "Informe quando o veículo estiver pronto.", Bell],
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-14">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500">
                <Gauge className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight">AJB AutoFlow</p>
                <p className="text-xs text-blue-100">by AJBSYSTEMS</p>
              </div>
            </div>
            <nav className="hidden items-center gap-3 sm:flex">
              <a href="/entrar" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10">
                <LogIn className="h-4 w-4" />
                Já sou cliente
              </a>
              <a href="/demo" className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10">
                Demo guiada
              </a>
              <a href="/planos" className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold text-white hover:bg-white/10">
                Planos
              </a>
              <a href="/cadastro" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">
                Criar conta
              </a>
            </nav>
          </header>

          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-blue-100">
                <Smartphone className="h-4 w-4" />
                Controle sua oficina ou lava-jato pelo celular
              </div>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Gestão automotiva simples para atender melhor e chamar o cliente de volta.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
                Organize clientes, veículos, estoque, serviços e ordens de serviço em uma plataforma online multiempresa.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a href="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-6 py-4 font-bold text-white hover:bg-blue-400">
                  Criar conta <ArrowRight className="h-5 w-5" />
                </a>
                <a href="/entrar" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 px-6 py-4 font-bold text-white hover:bg-white/10">
                  <LogIn className="h-5 w-5" /> Já sou cliente
                </a>
                <a href="/demo" className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-6 py-4 font-bold text-white hover:bg-white/10">
                  Ver demo guiada
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-4">
              <div className="rounded-[1.5rem] bg-slate-50 p-5 text-slate-950">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Hoje</p>
                    <p className="text-xl font-black">Painel da Oficina</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Online</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {["OS abertas", "Prontas", "Estoque baixo", "Lembretes"].map((label, index) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-sm text-slate-500">{label}</p>
                      <p className="mt-2 text-3xl font-black">{[18, 5, 7, 24][index]}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="font-bold">Veículo pronto para retirada</p>
                  <p className="mt-1 text-sm text-slate-500">Gol 1.6 - ABC1D23</p>
                  <a href="/demo" className="mt-4 inline-flex w-full justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Ver fluxo demo</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="grid gap-5 md:grid-cols-4">
          {features.map(([title, description, Icon]) => (
            <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-black">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-7xl px-6 pb-20 sm:px-10 lg:px-16">
        <div className="rounded-[2rem] bg-slate-950 p-8 text-white md:p-12">
          <p className="text-blue-300">Plano inicial</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">MVP pronto para vender assinatura mensal.</h2>
          <p className="mt-4 max-w-2xl text-slate-300">Foco em oficina e lava-jato que precisam controlar atendimento pelo celular.</p>
          <p className="mt-8 text-5xl font-black">R$ 49,90</p>
          <p className="mt-1 text-sm text-slate-300">por mês por empresa</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/cadastro" className="inline-flex rounded-2xl bg-blue-500 px-6 py-4 font-black text-white hover:bg-blue-400">Criar conta</a>
            <a href="/entrar" className="inline-flex rounded-2xl border border-white/20 px-6 py-4 font-black text-white hover:bg-white/10">Já sou cliente</a>
            <a href="/demo" className="inline-flex rounded-2xl border border-white/20 px-6 py-4 font-black text-white hover:bg-white/10">Ver demo guiada</a>
          </div>
        </div>
      </section>
    </main>
  );
}
