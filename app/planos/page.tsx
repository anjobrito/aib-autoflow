import { ArrowRight, CheckCircle2, Gauge } from "lucide-react";

const plans = [
  {
    name: "Start",
    price: "R$ 49,90",
    badge: "Piloto recomendado",
    description: "Para oficina, funilaria, lava-jato ou estética que precisa começar a controlar clientes, veículos, OS e serviços.",
    features: ["Até 3 usuários", "Clientes e veículos", "Serviços e estoque básico", "Ordens de serviço", "Suporte inicial"],
    highlight: true,
  },
  {
    name: "Pro",
    price: "R$ 79,90",
    badge: "Operação em crescimento",
    description: "Para negócios que precisam controlar volume, pátio, equipe e financeiro operacional.",
    features: ["Usuários adicionais", "OS ilimitadas", "Lembretes de manutenção", "Financeiro operacional", "Prioridade em melhorias"],
    highlight: false,
  },
  {
    name: "Enterprise/Piloto",
    price: "Sob consulta",
    badge: "Contrato assistido",
    description: "Para pilotos acompanhados, requisitos específicos, migração de dados e módulos comerciais sob demanda.",
    features: ["Setup acompanhado", "Validação com equipe", "Customizações comerciais", "Treinamento", "Integrações futuras"],
    highlight: false,
  },
];

export default function PlanosPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-8 text-white sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">AJB AutoFlow</p>
              <p className="text-xs text-blue-100">by AJBSYSTEMS</p>
            </div>
          </a>
          <a href="/cadastro" className="rounded-full bg-white px-5 py-2 text-sm font-black text-slate-950">Comece agora</a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Planos SaaS para operação automotiva</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Venda agora, libere manualmente e evolua para cobrança automática.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            O AJB AutoFlow já pode operar com liberação manual de licença pelo painel AJBSYSTEMS. O cliente cadastra a empresa, você define o plano e libera o acesso após pagamento.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-[2rem] p-6 shadow-sm ${plan.highlight ? "bg-slate-950 text-white" : "bg-white text-slate-950"}`}>
              <p className={plan.highlight ? "text-blue-300" : "text-blue-700"}>{plan.badge}</p>
              <h2 className="mt-2 text-3xl font-black">{plan.name}</h2>
              <p className="mt-4 text-5xl font-black">{plan.price}</p>
              <p className={`mt-3 text-sm leading-6 ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>{plan.description}</p>
              <div className="mt-6 grid gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm font-bold">
                    <CheckCircle2 className={plan.highlight ? "h-5 w-5 text-emerald-400" : "h-5 w-5 text-emerald-600"} />
                    {feature}
                  </div>
                ))}
              </div>
              <a href="/cadastro" className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black ${plan.highlight ? "bg-blue-500 text-white hover:bg-blue-400" : "bg-slate-950 text-white hover:bg-slate-800"}`}>
                Cadastrar empresa <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Fluxo comercial imediato</p>
          <p className="mt-2 text-lg font-bold text-slate-700">Cadastro → pagamento manual → liberação no /admin → cliente usa o sistema.</p>
        </div>
      </section>
    </main>
  );
}
