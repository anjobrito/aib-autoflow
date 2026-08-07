import { ArrowRight, CheckCircle2, Gauge } from "lucide-react";

const plans = [
  {
    name: "Start Mensal",
    price: "R$ 49,90",
    suffix: "/mês",
    badge: "Entrada simples",
    description: "Cobrança recorrente mensal para começar sem compromisso anual.",
    features: ["Clientes e veículos", "Ordens e pátio", "Serviços e estoque", "Financeiro operacional", "Suporte inicial"],
    highlight: false,
  },
  {
    name: "Start Anual",
    price: "R$ 499,00",
    suffix: "/ano",
    badge: "Melhor custo anual",
    description: "Cobrança recorrente a cada 12 meses com o mesmo núcleo operacional do plano Start.",
    features: ["Todos os recursos do Start", "Uma cobrança por ano", "Menor custo equivalente mensal", "Atualizações do produto", "Suporte inicial"],
    highlight: true,
  },
  {
    name: "Enterprise / Projeto",
    price: "Sob consulta",
    suffix: "",
    badge: "Contrato assistido",
    description: "Para migração de dados, requisitos específicos, implantação acompanhada e integrações sob demanda.",
    features: ["Setup acompanhado", "Migração planejada", "Customizações comerciais", "Treinamento", "Integrações"],
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
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Escolha mensal ou anual e centralize sua operação.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Cadastre a empresa, entre no AJB AutoFlow e acesse a área de assinatura. Quando o Mercado Pago estiver habilitado, a contratação e a liberação são processadas automaticamente. A AJBSYSTEMS mantém a liberação manual como contingência.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-[2rem] p-6 shadow-sm ${plan.highlight ? "bg-slate-950 text-white" : "bg-white text-slate-950"}`}>
              <p className={plan.highlight ? "text-blue-300" : "text-blue-700"}>{plan.badge}</p>
              <h2 className="mt-2 text-3xl font-black">{plan.name}</h2>
              <p className="mt-4 text-5xl font-black">{plan.price}<span className={`ml-1 text-base ${plan.highlight ? "text-slate-400" : "text-slate-500"}`}>{plan.suffix}</span></p>
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
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Fluxo comercial</p>
          <p className="mt-2 text-lg font-bold text-slate-700">Cadastro → login → /assinatura → Mercado Pago → confirmação server-to-server → licença ativa.</p>
          <p className="mt-2 text-sm text-slate-500">Os valores mensal e anual podem ser alterados na configuração de produção sem alteração de código.</p>
        </div>
      </section>
    </main>
  );
}
