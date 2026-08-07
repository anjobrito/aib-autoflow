"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { filterProductsByBusinessProfile, filterServicesByBusinessProfile, getOperationalFormLabels } from "@/lib/business-domain-options";
import { getBusinessProfileByLabel } from "@/lib/business-profiles";
import { newWorkOrderStatuses } from "@/lib/select-options";

function pct(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function currencyToNumber(value?: string) {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function numberToCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

type NewWorkOrderFormProps = {
  onSaved?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
};

type CustomerOption = {
  id: string;
  name: string;
};

type VehicleOption = {
  id: string;
  customerId: string;
  label: string;
};

type ProductOption = {
  id: string;
  name: string;
  category: string;
  costPrice: string;
  price: string;
};

type ServiceOption = {
  id: string;
  name: string;
  category: string;
  duration: string;
  price: string;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function NewWorkOrderForm({ onSaved, onCancel, submitLabel = "Criar fluxo operacional" }: NewWorkOrderFormProps) {
  const [saved, setSaved] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const businessProfile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const formLabels = useMemo(() => getOperationalFormLabels(businessProfile), [businessProfile]);

  const productOptions = useMemo(() => filterProductsByBusinessProfile(products, businessProfile), [products, businessProfile]);
  const serviceOptions = useMemo(() => filterServicesByBusinessProfile(services, businessProfile), [services, businessProfile]);
  const vehicleOptions = useMemo(() => vehicles.filter((vehicle) => !selectedCustomerId || vehicle.customerId === selectedCustomerId), [vehicles, selectedCustomerId]);

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      setLoading(true);
      setMessage("");

      try {
        const [companyResponse, customersResponse, vehiclesResponse, productsResponse, servicesResponse] = await Promise.all([
          fetch("/api/company/me", { cache: "no-store" }),
          fetch("/api/customers", { cache: "no-store" }),
          fetch("/api/vehicles", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/services", { cache: "no-store" }),
        ]);

        const [companyResult, customersResult, vehiclesResult, productsResult, servicesResult] = await Promise.all([
          companyResponse.json(),
          customersResponse.json(),
          vehiclesResponse.json(),
          productsResponse.json(),
          servicesResponse.json(),
        ]);

        if (!active) return;

        if (!companyResponse.ok || !customersResponse.ok || !vehiclesResponse.ok || !productsResponse.ok || !servicesResponse.ok) {
          throw new Error("Não foi possível carregar os dados reais da empresa.");
        }

        setBusinessType(companyResult.company?.businessTypeLabel || "Completo / Multioperação");

        const loadedCustomers = (customersResult.customers || []).map((customer: any) => ({ id: customer.id, name: customer.name }));
        const loadedVehicles = (vehiclesResult.vehicles || []).map((vehicle: any) => ({ id: vehicle.id, customerId: vehicle.customerId, label: `${vehicle.plate} - ${vehicle.brand || ""} ${vehicle.model || ""}`.trim() }));
        const loadedProducts = (productsResult.products || []).map((product: any) => ({
          id: product.id,
          name: product.name,
          category: product.category || "",
          costPrice: formatCurrency(Number(product.costPrice || 0)),
          price: formatCurrency(Number(product.salePrice || 0)),
        }));
        const loadedServices = (servicesResult.services || []).map((service: any) => ({
          id: service.id,
          name: service.name,
          category: service.category || "",
          duration: service.duration || "",
          price: formatCurrency(Number(service.price || 0)),
        }));

        setCustomers(loadedCustomers);
        setVehicles(loadedVehicles);
        setProducts(loadedProducts);
        setServices(loadedServices);
        setSelectedCustomerId(loadedCustomers[0]?.id ?? "");
        setSelectedVehicleId(loadedVehicles[0]?.id ?? "");
        setSelectedProduct(loadedProducts[0]?.name ?? "");
        setSelectedService(loadedServices[0]?.name ?? "");

        if (loadedCustomers.length === 0 || loadedVehicles.length === 0) {
          setMessage("Cadastre um cliente e um veículo antes de criar a ordem.");
        }
      } catch (cause) {
        if (!active) return;
        setCustomers([]);
        setVehicles([]);
        setProducts([]);
        setServices([]);
        setMessage(cause instanceof Error ? cause.message : "Não foi possível carregar os dados reais da empresa.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOptions();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (vehicleOptions.length > 0 && !vehicleOptions.some((item) => item.id === selectedVehicleId)) setSelectedVehicleId(vehicleOptions[0].id);
    if (productOptions.length > 0 && !productOptions.some((item) => item.name === selectedProduct)) setSelectedProduct(productOptions[0].name);
    if (serviceOptions.length > 0 && !serviceOptions.some((item) => item.name === selectedService)) setSelectedService(serviceOptions[0].name);
  }, [productOptions, serviceOptions, selectedProduct, selectedService, selectedVehicleId, vehicleOptions]);

  const product = productOptions.find((item) => item.name === selectedProduct);
  const service = serviceOptions.find((item) => item.name === selectedService);
  const qty = Math.max(0, Number(quantity || 0));

  const totals = useMemo(() => {
    const productCost = currencyToNumber(product?.costPrice ?? "R$ 0,00") * qty;
    const productSale = currencyToNumber(product?.price ?? "R$ 0,00") * qty;
    const serviceSale = currencyToNumber(service?.price ?? "R$ 0,00");
    const total = productSale + serviceSale;
    const profit = productSale - productCost + serviceSale;
    const margin = total > 0 ? (profit / total) * 100 : 0;
    return { productCost, productSale, serviceSale, total, profit, margin };
  }, [product, qty, service]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!selectedCustomerId || !selectedVehicleId) {
      setMessage("Cadastre cliente e veículo antes de criar uma ordem.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("customerId", selectedCustomerId);
    formData.set("vehicleId", selectedVehicleId);
    formData.set("serviceName", selectedService);
    formData.set("productName", selectedProduct);
    formData.set("partsTotal", numberToCurrency(totals.productSale));
    formData.set("servicesTotal", numberToCurrency(totals.serviceSale));
    formData.set("totalAmount", numberToCurrency(totals.total));

    const response = await fetch("/api/work-orders", { method: "POST", body: formData });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível criar a ordem.");
      return;
    }

    setSaved(true);

    if (onSaved) {
      form.reset();
      onSaved();
      setSaved(false);
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="rounded-3xl bg-white p-0">
        <h2 className="text-xl font-black text-slate-950">Dados do fluxo operacional</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Selecione cliente, veículo, etapa, item operacional e status inicial. Campos de domínio respeitam o perfil {businessProfile.label} carregado da empresa autenticada.</p>

        {message ? <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700">Cliente<select required name="customerId" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} disabled={loading} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"><option value="" disabled>{loading ? "Carregando..." : "Selecione um cliente"}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Veículo<select required name="vehicleId" value={selectedVehicleId} onChange={(event) => setSelectedVehicleId(event.target.value)} disabled={loading} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"><option value="" disabled>{loading ? "Carregando..." : "Selecione um veículo"}</option>{vehicleOptions.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">{formLabels.serviceLabel}<select value={selectedService} onChange={(event) => setSelectedService(event.target.value)} disabled={loading || serviceOptions.length === 0} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"><option value="">Nenhum serviço</option>{serviceOptions.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">{formLabels.productLabel}<select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} disabled={loading || productOptions.length === 0} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white disabled:opacity-60"><option value="">Nenhum produto</option>{productOptions.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">{formLabels.quantityLabel}<input required value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" /></label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">Status<select required name="status" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white">{newWorkOrderStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        <label className="mt-4 grid gap-2 text-sm font-bold text-slate-700"><span>Observações</span><textarea name="notes" className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white" placeholder="Descreva o serviço solicitado, orientação operacional ou observação para a equipe." /></label>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {saved ? <span className="text-sm font-bold text-emerald-700">Fluxo criado!</span> : null}
          {onCancel ? <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button> : null}
          <button disabled={loading || !selectedCustomerId || !selectedVehicleId} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">{submitLabel}</button>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
        <p className="text-sm font-bold text-blue-300">Resumo financeiro</p>
        <h2 className="mt-2 text-2xl font-black">Total: {numberToCurrency(totals.total)}</h2>
        <div className="mt-6 grid gap-3 text-sm text-slate-200">
          <div className="rounded-2xl bg-white/10 p-4">{formLabels.productSummaryLabel}: {numberToCurrency(totals.productSale)}</div>
          <div className="rounded-2xl bg-white/10 p-4">{formLabels.serviceSummaryLabel}: {numberToCurrency(totals.serviceSale)}</div>
          <div className="rounded-2xl bg-white/10 p-4">{formLabels.productCostSummaryLabel}: {numberToCurrency(totals.productCost)}</div>
          <div className="rounded-2xl bg-emerald-500/20 p-4 font-black text-emerald-200">Lucro estimado: {numberToCurrency(totals.profit)}</div>
          <div className="rounded-2xl bg-blue-500/20 p-4 font-black text-blue-100">Margem estimada: {pct(totals.margin)}</div>
        </div>
      </div>
    </form>
  );
}
