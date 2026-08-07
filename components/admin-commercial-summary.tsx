import { AlertTriangle, Ban, CheckCircle2, Clock, TrendingUp } from "lucide-react";

type AdminSummary = {
  total: number;
  active: number;
  trial: number;
  pastDue: number;
  canceled: number;
  blocked: number;
  monthlyRevenueCents: number;
};

function formatCurrency(priceCents?: number) {
  return ((priceCents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdminCommercialSummary({ summary }: { summary: AdminSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Empresas</p>
        <p className="mt-2 text-3xl font-black">{summary.total}</p>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wide">Ativas</p></div>
        <p className="mt-2 text-3xl font-black">{summary.active}</p>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-blue-700"><Clock className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wide">Trials</p></div>
        <p className="mt-2 text-3xl font-black">{summary.trial}</p>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wide">Pendentes</p></div>
        <p className="mt-2 text-3xl font-black">{summary.pastDue + summary.canceled}</p>
      </div>
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-red-700"><Ban className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wide">Bloqueadas</p></div>
        <p className="mt-2 text-3xl font-black">{summary.blocked}</p>
      </div>
      <div className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-blue-300"><TrendingUp className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wide">Receita mensal</p></div>
        <p className="mt-2 text-2xl font-black">{formatCurrency(summary.monthlyRevenueCents)}</p>
      </div>
    </div>
  );
}
