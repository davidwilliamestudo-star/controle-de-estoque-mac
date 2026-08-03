import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Edit3, Plus, Search, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import {
  useCancelPayable,
  useCreatePayable,
  useFinancialOptions,
  usePayPayable,
  usePayables,
  useUpdatePayable,
} from "../hooks/useFinancial";
import { EmptyFinancialState, formatBRL, formatDate, StatusBadge } from "../components/FinancialShared";
import type { FinancialPayable, FinancialStatus, PayableInput } from "../types";

// FIX: today calculado em função para evitar bug de data em sessões overnight
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: PayableInput = {
  supplierId: "",
  inventoryReceiptId: "",
  categoryId: "fin-cat-exp-suppliers",
  description: "",
  amount: 0,
  dueDate: getToday(),
  paymentMethodId: "",
  notes: "",
};

export default function PayablesPage() {
  const [status, setStatus] = useState<FinancialStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FinancialPayable | null>(null);
  const [form, setForm] = useState<PayableInput>(emptyForm);
  const [paying, setPaying] = useState<FinancialPayable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState("");

  const optionsQuery = useFinancialOptions();
  const payablesQuery = usePayables({ status, search });
  const createMutation = useCreatePayable();
  const updateMutation = useUpdatePayable();
  const payMutation = usePayPayable();
  const cancelMutation = useCancelPayable();

  const options = optionsQuery.data;
  const payables = payablesQuery.data ?? [];
  const totals = useMemo(() => ({
    open: payables.filter(item => ["open", "partially_paid"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount) - Number(item.paid_amount || 0), 0),
    overdue: payables.filter(item => item.effective_status === "overdue").reduce((sum, item) => sum + Number(item.amount) - Number(item.paid_amount || 0), 0),
    paid: payables.filter(item => item.status === "paid").reduce((sum, item) => sum + Number(item.paid_amount || 0), 0),
  }), [payables]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(item: FinancialPayable) {
    setEditing(item);
    setForm({
      supplierId: item.supplier_id ?? "",
      inventoryReceiptId: item.inventory_receipt_id ?? "",
      categoryId: item.category_id ?? "fin-cat-exp-suppliers",
      description: item.description,
      amount: Number(item.amount),
      dueDate: item.due_date,
      paymentMethodId: item.payment_method_id ?? "",
      notes: item.notes ?? "",
    });
    setShowForm(true);
  }

  function handleReceiptChange(receiptId: string) {
    const receipt = options?.inventoryReceipts.find(item => item.id === receiptId);
    setForm(current => ({
      ...current,
      inventoryReceiptId: receiptId,
      supplierId: receipt?.supplier_id ?? current.supplierId,
      amount: receipt?.total_cost ?? current.amount,
      description: receipt ? `Nota fiscal ${receipt.invoice_number || receipt.entry_date}` : current.description,
    }));
  }

  async function saveForm(event: React.FormEvent) {
    event.preventDefault();
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: form });
    } else {
      await createMutation.mutateAsync(form);
    }
    setShowForm(false);
  }

  async function submitPayment(event: React.FormEvent) {
    event.preventDefault();
    if (!paying) return;
    await payMutation.mutateAsync({
      id: paying.id,
      data: { amount: paymentAmount, paidAt: getToday(), paymentMethodId, notes: "" },
    });
    setPaying(null);
  }

  return (
    <div className="flex-col gap-6">
      <div className="page-header">
        <div>
          <Link to="/financial" className="btn btn-ghost btn-sm mb-2 px-0 text-gray-500"><ArrowLeft size={16} /> Voltar</Link>
          <h1 className="page-title">Contas a Pagar</h1>
          <p className="page-subtitle">Despesas operacionais, fornecedores e notas de estoque.</p>
        </div>
        <button className="btn btn-primary" onClick={startCreate}><Plus size={16} /> Nova despesa</button>
      </div>

      <div className="grid-3">
        <div className="card summary-card"><div className="summary-card-header"><span>Em aberto</span></div><div className="summary-card-value">{formatBRL(totals.open)}</div></div>
        <div className="card summary-card"><div className="summary-card-header"><span>Vencido</span></div><div className="summary-card-value">{formatBRL(totals.overdue)}</div></div>
        <div className="card summary-card"><div className="summary-card-header"><span>Pago</span></div><div className="summary-card-value">{formatBRL(totals.paid)}</div></div>
      </div>

      <div className="card">
        <div className="search-filter-bar">
          <div className="search-input">
            <Search size={16} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por despesa, fornecedor ou nota..." />
          </div>
          <select className="form-control" style={{ width: 180 }} value={status} onChange={event => setStatus(event.target.value as any)}>
            <option value="all">Todos</option>
            <option value="open">Abertos</option>
            <option value="partially_paid">Parciais</option>
            <option value="overdue">Vencidos</option>
            <option value="paid">Pagos</option>
            <option value="cancelled">Cancelados</option>
          </select>
        </div>

        {payablesQuery.isLoading ? (
          <div>Carregando contas...</div>
        ) : payables.length === 0 ? (
          <EmptyFinancialState title="Nenhuma conta a pagar" description="Lance uma despesa manual ou gere uma conta a pagar de uma entrada de estoque." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Descricao</th><th>Fornecedor</th><th>Vencimento</th><th>Valor</th><th>Pago</th><th>Status</th><th>Acoes</th></tr>
              </thead>
              <tbody>
                {payables.map(item => {
                  const balance = Number(item.amount) - Number(item.paid_amount || 0);
                  return (
                    <tr key={item.id}>
                      <td><strong>{item.description}</strong><div className="text-xs text-gray-500">{item.invoice_number || item.category_name || "-"}</div></td>
                      <td>{item.supplier_name || "-"}</td>
                      <td>{formatDate(item.due_date)}</td>
                      <td>{formatBRL(item.amount)}</td>
                      <td>{formatBRL(item.paid_amount || 0)}<div className="text-xs text-gray-500">Saldo {formatBRL(balance)}</div></td>
                      <td><StatusBadge status={item.effective_status} /></td>
                      <td>
                        <div className="flex gap-1">
                          <button className="btn btn-ghost btn-icon" title="Editar" onClick={() => startEdit(item)}><Edit3 size={16} /></button>
                          {item.status !== "paid" && item.status !== "cancelled" && (
                            <button className="btn btn-ghost btn-icon" title="Registrar pagamento" onClick={() => { setPaying(item); setPaymentAmount(balance); setPaymentMethodId(item.payment_method_id || ""); }}><CheckCircle2 size={16} /></button>
                          )}
                          {item.status !== "cancelled" && (
                            <button className="btn btn-ghost btn-icon" title="Cancelar" style={{ color: "var(--color-danger)" }} onClick={() => cancelMutation.mutate(item.id)}><XCircle size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay active">
          <div className="modal-content" style={{ maxWidth: 780 }}>
            <div className="modal-header">
              <div><h2 className="modal-title">{editing ? "Editar despesa" : "Nova despesa"}</h2><p className="modal-subtitle">Vincule fornecedor ou entrada de estoque quando aplicavel.</p></div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={saveForm}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Entrada de estoque / nota</label>
                  <select className="form-control" value={form.inventoryReceiptId ?? ""} onChange={event => handleReceiptChange(event.target.value)}>
                    <option value="">Sem vinculo</option>
                    {options?.inventoryReceipts.map(receipt => (
                      <option key={receipt.id} value={receipt.id}>{receipt.supplier_name || "Fornecedor"} - NF {receipt.invoice_number || "-"} - {formatBRL(receipt.total_cost)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fornecedor</label>
                  <select className="form-control" value={form.supplierId ?? ""} onChange={event => setForm({ ...form, supplierId: event.target.value })}>
                    <option value="">Sem fornecedor</option>
                    {options?.suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Descricao</label>
                  <input className="form-control" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Valor *</label>
                  <CurrencyInput
                    value={form.amount}
                    onChange={(v) => setForm({ ...form, amount: v })}
                    label="Valor da despesa"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Vencimento</label>
                  <input className="form-control" type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select className="form-control" value={form.categoryId ?? ""} onChange={event => setForm({ ...form, categoryId: event.target.value })}>
                    {options?.categories.filter(cat => cat.type !== "income").map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Forma de pagamento prevista</label>
                  <select className="form-control" value={form.paymentMethodId ?? ""} onChange={event => setForm({ ...form, paymentMethodId: event.target.value })}>
                    <option value="">Nao definida</option>
                    {options?.paymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
                  </select>
                </div>
                <div className="form-group col-span-2">
                  <label className="form-label">Observacoes</label>
                  <textarea className="form-control" rows={3} value={form.notes ?? ""} onChange={event => setForm({ ...form, notes: event.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paying && (
        <div className="modal-overlay active">
          <div className="modal-content" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div><h2 className="modal-title">Registrar pagamento</h2><p className="modal-subtitle">{paying.description}</p></div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPaying(null)}>×</button>
            </div>
            <form className="modal-body" onSubmit={submitPayment}>
              <div className="form-group">
                <label className="form-label">Valor pago *</label>
                <CurrencyInput
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  label="Valor pago"
                  min={0.01}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Forma de pagamento</label>
                <select className="form-control" value={paymentMethodId} onChange={event => setPaymentMethodId(event.target.value)}>
                  <option value="">Nao definida</option>
                  {options?.paymentMethods.map(method => <option key={method.id} value={method.id}>{method.name}</option>)}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setPaying(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={payMutation.isPending}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
