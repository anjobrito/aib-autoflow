"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { getOperationalFormLabels } from "@/lib/business-domain-options";
import { getBusinessProfileByLabel } from "@/lib/business-profiles";
import { calculateMargin, getCompany, listSuppliers, StoredSupplier } from "@/lib/browser-store";
import { productCategories } from "@/lib/select-options";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  stock: string;
  minStock: string;
  costPrice: string;
  price: string;
  status?: string;
  origin: string;
  editable: boolean;
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMargin(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getCatalogTitle(productLabel: string) {
  if (productLabel === "Produto / peça") return "Produtos e peças cadastrados";
  if (productLabel === "Custo vinculado") return "Custos e itens de revenda";
  if (productLabel === "Produto estético") return "Produtos estéticos cadastrados";
  if (productLabel === "Produto de lavagem") return "Produtos de lavagem cadastrados";
  return "Itens operacionais cadastrados";
}

function getPlaceholder(productLabel: string) {
  if (productLabel === "Custo vinculado") return "Nome do custo ou item";
  if (productLabel === "Produto estético") return "Nome do produto estético";
  if (productLabel === "Produto de lavagem") return "Nome do produto de lavagem";
  if (productLabel === "Produto / peça") return "Nome do produto ou peça";
  return "Nome do item operacional";
}

export function ProductsClient() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [suppliers, setSuppliers] = useState<StoredSupplier[]>([]);
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const labels = useMemo(() => getOperationalFormLabels(profile), [profile]);

  async function refresh() {
    setBusinessType(getCompany().businessType || "Completo / Multioperação");
    setSuppliers(listSuppliers());
    setMessage("");

    try {
      const query = searchTerm.trim() ? `?search=${encodeURIComponent(searchTerm.trim())}` : "";
      const response = await fetch(`/api/products${query}`, { cache: "no-store" });
      const result = await response.json();

      if (!response.ok || !result.success) throw new Error(result.message || "Products API unavailable");

      const apiProducts = (result.products || []).map((product: any) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        supplier: product.supplier,
        stock: String(product.stock ?? "0"),
        minStock: String(product.minStock ?? "0"),
        costPrice: formatCurrency(Number(product.costPrice || 0)),
        price: formatCurrency(Number(product.price || 0)),
        status: product.status,
        origin: "Banco",
        editable: true,
      }));

      setProducts(apiProducts);
    } catch {
      setProducts([]);
      setMessage("Banco/API indisponível ou sessão expirada. Entre novamente para usar estoque real.");
    }
  }

  useEffect(() => {
    refresh();
    window.addEventListener("ajb-company-updated", refresh);

    return () => {
      window.removeEventListener("ajb-company-updated", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateModal() {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  function openEditModal(product: ProductRow) {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  function closeModal() {
    setEditingProduct(null);
    setIsFormOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (editingProduct) formData.set("id", editingProduct.id);

    const response = await fetch("/api/products", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result.success) {
      setMessage(result.message || "Não foi possível salvar o produto.");
      return;
    }

    form.reset();
    await refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    closeModal();
  }

  const domainProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const term = normalize(searchTerm);
    return products.filter((product) => normalize(`${product.name} ${product.category} ${product.supplier} ${product.stock} ${product.costPrice} ${product.price} ${product.origin}`).includes(term));
  }, [products, searchTerm]);

  const modalTitle = editingProduct ? `Editar ${labels.productLabel.toLowerCase()}` : `Cadastrar ${labels.productLabel.toLowerCase()}`;
  const modalDescription = editingProduct ? `Atualize este item no banco desta empresa.` : `Cadastre itens respeitando o perfil ${profile.label}.`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cadastro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{getCatalogTitle(labels.productLabel)}</h2>
          <p className="mt-2 text-sm text-slate-600">Estoque real é gravado por empresa no PostgreSQL. Cadastros novos começam limpos.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo item
        </button>
      </div>

      {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Item salvo!</div> : null}
      {message ? <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">{message}</div> : null}

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Buscar item
          <span className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-500 focus-within:bg-white">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onBlur={() => refresh()} placeholder="Busque por nome, categoria, fornecedor, saldo ou preço" className="w-full bg-transparent font-medium outline-none" />
          </span>
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{[labels.productLabel, "Fornecedor", "Saldo", "Custo", "Venda", "Lucro", "Margem", "Origem", "Ações"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {domainProducts.map((product, rowIndex) => {
                const result = calculateMargin(product.costPrice, product.price);
                return (
                  <tr key={`${product.id}-${rowIndex}`} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-950">{product.name}</td>
                    <td className="px-5 py-4 text-slate-700">{product.supplier || "Sem fornecedor"}</td>
                    <td className="px-5 py-4 text-slate-700">{product.stock}</td>
                    <td className="px-5 py-4 text-slate-700">{product.costPrice}</td>
                    <td className="px-5 py-4 text-slate-700">{product.price}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(result.profit)}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{formatMargin(result.margin)}</span></td>
                    <td className="px-5 py-4 text-slate-700">{product.origin}</td>
                    <td className="px-5 py-4"><button type="button" onClick={() => openEditModal(product)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</button></td>
                  </tr>
                );
              })}
              {domainProducts.length === 0 ? <tr><td colSpan={9} className="px-5 py-10 text-center text-slate-500">Nenhum item cadastrado nesta empresa.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={modalTitle} description={modalDescription} onClose={closeModal}>
        <form key={editingProduct?.id ?? "new-product"} onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Nome do item<input name="name" required defaultValue={editingProduct?.name ?? ""} placeholder={getPlaceholder(labels.productLabel)} className={inputClass} /></label>
            <label className={labelClass}>Categoria<select name="category" defaultValue={editingProduct?.category ?? productCategories[0]} className={inputClass}>{productCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className={labelClass}>Fornecedor<select name="supplier" defaultValue={editingProduct?.supplier ?? "Sem fornecedor"} className={inputClass}><option>Sem fornecedor</option>{suppliers.map((supplier) => <option key={supplier.id}>{supplier.name}</option>)}</select></label>
            <label className={labelClass}>Saldo atual<input name="stock" required inputMode="numeric" defaultValue={editingProduct?.stock ?? ""} placeholder="Quantidade atual" className={inputClass} /></label>
            <label className={labelClass}>Estoque mínimo<input name="minStock" required inputMode="numeric" defaultValue={editingProduct?.minStock ?? ""} placeholder="Estoque mínimo" className={inputClass} /></label>
            <label className={labelClass}>Preço de custo<input name="costPrice" required inputMode="decimal" defaultValue={editingProduct?.costPrice ?? ""} placeholder="Preço de custo" className={inputClass} /></label>
            <label className={labelClass}>Preço de venda<input name="price" required inputMode="decimal" defaultValue={editingProduct?.price ?? ""} placeholder="Preço de venda" className={inputClass} /></label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={closeModal} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">{editingProduct ? "Salvar alterações" : "Salvar item"}</button>
          </div>
        </form>
      </UiModal>
    </div>
  );
}
