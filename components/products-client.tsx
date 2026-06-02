"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { UiModal } from "@/components/ui-modal";
import { demoProducts } from "@/lib/demo-data";
import { filterProductsByBusinessProfile, getOperationalFormLabels } from "@/lib/business-domain-options";
import { getBusinessProfileByLabel } from "@/lib/business-profiles";
import { calculateMargin, getCompany, listProducts, listSuppliers, saveProduct, StoredProduct, StoredSupplier } from "@/lib/browser-store";
import { productCategories } from "@/lib/select-options";

const inputClass = "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium outline-none focus:border-blue-500 focus:bg-white";
const labelClass = "grid gap-2 text-sm font-bold text-slate-700";
const productsStorageKey = "ajb-autoflow-products";

function updateStoredProduct(id: string, product: Omit<StoredProduct, "id">) {
  if (typeof window === "undefined") return undefined;
  const updated = listProducts().map((item) => item.id === id ? { ...product, id } : item);
  window.localStorage.setItem(productsStorageKey, JSON.stringify(updated));
  return updated.find((item) => item.id === id);
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMargin(value: number) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function getCatalogTitle(productLabel: string) {
  if (productLabel === "Produto / peça") return "Produtos e peças cadastrados";
  if (productLabel === "Custo vinculado") return "Custos e itens de revenda";
  if (productLabel === "Produto estético") return "Produtos estéticos cadastrados";
  if (productLabel === "Produto de lavagem") return "Produtos de lavagem cadastrados";
  return "Itens operacionais cadastrados";
}

function getPlaceholder(productLabel: string) {
  if (productLabel === "Custo vinculado") return "Ex: Laudo cautelar";
  if (productLabel === "Produto estético") return "Ex: Vitrificador de pintura";
  if (productLabel === "Produto de lavagem") return "Ex: Shampoo automotivo";
  if (productLabel === "Produto / peça") return "Ex: Filtro de óleo";
  return "Ex: Item operacional";
}

export function ProductsClient() {
  const [products, setProducts] = useState<StoredProduct[]>([]);
  const [suppliers, setSuppliers] = useState<StoredSupplier[]>([]);
  const [businessType, setBusinessType] = useState("Completo / Multioperação");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoredProduct | null>(null);
  const [saved, setSaved] = useState(false);

  const profile = useMemo(() => getBusinessProfileByLabel(businessType), [businessType]);
  const labels = useMemo(() => getOperationalFormLabels(profile), [profile]);
  const editableProductIds = useMemo(() => new Set(products.map((product) => product.id)), [products]);

  function refresh() {
    setBusinessType(getCompany().businessType || "Completo / Multioperação");
    setProducts(listProducts());
    setSuppliers(listSuppliers());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("ajb-company-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ajb-company-updated", refresh);
    };
  }, []);

  function openCreateModal() {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  function openEditModal(product: StoredProduct) {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  function closeModal() {
    setEditingProduct(null);
    setIsFormOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      supplier: String(formData.get("supplier") ?? ""),
      stock: String(formData.get("stock") ?? "0"),
      minStock: String(formData.get("minStock") ?? "0"),
      costPrice: String(formData.get("costPrice") ?? "R$ 0,00"),
      price: String(formData.get("price") ?? "R$ 0,00"),
    };

    if (editingProduct) updateStoredProduct(editingProduct.id, payload);
    else saveProduct(payload);

    form.reset();
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    closeModal();
  }

  const domainProducts = useMemo(() => {
    const demoItems = demoProducts.map((product) => ({
      ...product,
      supplier: product.name.includes("Óleo") ? "Distribuidora Óleo Max" : "Fornecedor demo",
      costPrice: product.name.includes("Óleo") ? "R$ 30,00" : product.name.includes("Filtro") ? "R$ 18,00" : product.name.includes("Pastilha") ? "R$ 132,00" : "R$ 20,00",
    }));

    const filteredDemoItems = filterProductsByBusinessProfile(demoItems, profile);
    return [...products, ...filteredDemoItems];
  }, [products, profile]);

  const modalTitle = editingProduct ? `Editar ${labels.productLabel.toLowerCase()}` : `Cadastrar ${labels.productLabel.toLowerCase()}`;
  const modalDescription = editingProduct ? `Atualize este item respeitando o perfil ${profile.label}.` : `Cadastre itens respeitando o perfil ${profile.label}.`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-blue-700">Cadastro</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{getCatalogTitle(labels.productLabel)}</h2>
          <p className="mt-2 text-sm text-slate-600">Lista adaptada ao perfil {profile.label}. Itens cadastrados pelo usuário permanecem visíveis; modelos seguem o universo operacional.</p>
        </div>
        <button type="button" onClick={openCreateModal} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo item
        </button>
      </div>

      {saved ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">Item salvo!</div> : null}

      <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{[labels.productLabel, "Fornecedor", "Saldo", "Custo", "Venda", "Lucro", "Margem", "Ações"].map((column) => <th key={column} className="px-5 py-4 font-black">{column}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {domainProducts.map((product, rowIndex) => {
                const result = calculateMargin(product.costPrice, product.price);
                const isEditable = editableProductIds.has(product.id);
                return (
                  <tr key={`${product.id}-${rowIndex}`} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-950">{product.name}</td>
                    <td className="px-5 py-4 text-slate-700">{product.supplier || "Sem fornecedor"}</td>
                    <td className="px-5 py-4 text-slate-700">{product.stock}</td>
                    <td className="px-5 py-4 text-slate-700">{product.costPrice}</td>
                    <td className="px-5 py-4 text-slate-700">{product.price}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(result.profit)}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{formatMargin(result.margin)}</span></td>
                    <td className="px-5 py-4">
                      {isEditable ? (
                        <button type="button" onClick={() => openEditModal(product)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5" />Editar</button>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Modelo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UiModal open={isFormOpen} title={modalTitle} description={modalDescription} onClose={closeModal}>
        <form key={editingProduct?.id ?? "new-product"} onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Nome do item<input name="name" required defaultValue={editingProduct?.name ?? ""} placeholder={getPlaceholder(labels.productLabel)} className={inputClass} /></label>
            <label className={labelClass}>Categoria<select name="category" defaultValue={editingProduct?.category ?? productCategories[0]} className={inputClass}>{productCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label className={labelClass}>Fornecedor<select name="supplier" defaultValue={editingProduct?.supplier ?? "Sem fornecedor"} className={inputClass}><option>Sem fornecedor</option>{suppliers.map((supplier) => <option key={supplier.id}>{supplier.name}</option>)}<option>Fornecedor demo</option></select></label>
            <label className={labelClass}>Saldo atual<input name="stock" required inputMode="numeric" defaultValue={editingProduct?.stock ?? ""} placeholder="Ex: 24" className={inputClass} /></label>
            <label className={labelClass}>Estoque mínimo<input name="minStock" required inputMode="numeric" defaultValue={editingProduct?.minStock ?? ""} placeholder="Ex: 6" className={inputClass} /></label>
            <label className={labelClass}>Preço de custo<input name="costPrice" required inputMode="decimal" defaultValue={editingProduct?.costPrice ?? ""} placeholder="Ex: R$ 30,00" className={inputClass} /></label>
            <label className={labelClass}>Preço de venda<input name="price" required inputMode="decimal" defaultValue={editingProduct?.price ?? ""} placeholder="Ex: R$ 42,90" className={inputClass} /></label>
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
