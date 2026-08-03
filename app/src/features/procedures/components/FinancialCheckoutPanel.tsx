import { useState, useEffect } from "react";
import { CircleDollarSign, Calculator, Receipt, Tag, AlertCircle } from "lucide-react";
import type { ProcedureApplication } from "../types";

interface FinancialCheckoutPanelProps {
  applications: ProcedureApplication[];
  protocols: any[];
  inventoryData: any;
  onFinancialDataChange: (data: any) => void;
}

export function FinancialCheckoutPanel({
  applications,
  protocols,
  inventoryData,
  onFinancialDataChange
}: FinancialCheckoutPanelProps) {
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");

  // Calculate Subtotal
  const subtotal = applications.reduce((acc, app) => {
    let appTotal = 0;
    
    // 1. Try to get base price from Protocol
    if (app.protocolId) {
      const proto = protocols.find(p => p.id === app.protocolId);
      if (proto && proto.basePrice > 0) {
        appTotal += Number(proto.basePrice);
      }
    }

    // 2. Fallback to sum of items sellingPrice if protocol has no base price or is not selected
    if (appTotal === 0 && app.items && inventoryData?.items) {
      const itemsSum = app.items.reduce((sum, item) => {
        const invItem = inventoryData.items.find((i: any) => i.id === item.inventoryItemId);
        if (invItem && invItem.selling_price > 0) {
          // You could multiply by quantity, but standard clinic billing usually sums item base values or protocol values
          sum += Number(invItem.selling_price) * Number(item.quantityUsed || 1);
        }
        return sum;
      }, 0);
      appTotal += itemsSum;
    }

    return acc + appTotal;
  }, 0);

  // Calculate Discount Amount
  let discountAmount = 0;
  if (discountType === "fixed") {
    discountAmount = discountValue;
  } else {
    discountAmount = subtotal * (discountValue / 100);
  }

  // Calculate Total
  const totalAmount = Math.max(0, subtotal - discountAmount);

  // Notify parent when values change
  useEffect(() => {
    onFinancialDataChange({
      subtotal,
      discountAmount,
      discountType,
      totalAmount,
      paymentMethod,
      paymentStatus
    });
  }, [subtotal, discountAmount, discountType, totalAmount, paymentMethod, paymentStatus, onFinancialDataChange]);

  const formatBRL = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mt-6">
      <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3 text-white">
        <CircleDollarSign size={22} className="text-emerald-100" />
        <h3 className="font-semibold text-base tracking-wide uppercase">Resumo Financeiro da Sessão</h3>
      </div>
      
      <div className="p-6 flex flex-col gap-8 bg-gray-50/30">
        
        {/* Subtotal */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-gray-500">
            <Calculator size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Subtotal das Aplicações</span>
          </div>
          <span className="font-bold text-2xl text-gray-800">{formatBRL(subtotal)}</span>
        </div>

        {/* Descontos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="form-group mb-0">
            <label className="form-label text-sm text-gray-700 mb-2">Tipo de Desconto</label>
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button 
                type="button" 
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${discountType === 'fixed' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDiscountType('fixed')}
              >
                R$ Fixo
              </button>
              <button 
                type="button" 
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${discountType === 'percentage' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setDiscountType('percentage')}
              >
                % Percentual
              </button>
            </div>
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label text-sm text-gray-700 mb-2">Valor do Desconto</label>
            <div className="input-with-icon">
              <Tag size={18} />
              <input 
                type="number" 
                min="0"
                step={discountType === 'percentage' ? "1" : "0.01"}
                className="form-control py-2.5 text-base font-medium"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                placeholder="0.00"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {discountType === 'fixed' ? 'R$' : '%'}
              </span>
            </div>
          </div>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center text-rose-700 bg-rose-50 px-4 py-3 rounded-lg border border-rose-200 shadow-sm">
            <span className="font-semibold">Desconto Aplicado</span>
            <span className="font-bold text-lg">- {formatBRL(discountAmount)}</span>
          </div>
        )}

        {/* Total a Pagar */}
        <div className="flex justify-between items-center py-6 px-6 rounded-xl bg-emerald-50 border-2 border-emerald-200 shadow-sm">
          <span className="font-bold text-emerald-800 text-lg uppercase tracking-wider">Total a Pagar</span>
          <span className="font-black text-4xl text-emerald-700">{formatBRL(totalAmount)}</span>
        </div>

        {/* Pagamento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="form-group mb-0">
            <label className="form-label text-sm text-gray-700 mb-2">Forma de Pagamento</label>
            <div className="input-with-icon">
              <Receipt size={18} />
              <select 
                className="form-control py-2.5 text-sm font-medium bg-white cursor-pointer"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">(Não informada)</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="debit_card">Cartão de Débito</option>
                <option value="money">Dinheiro</option>
                <option value="bank_transfer">Transferência Bancária</option>
              </select>
            </div>
          </div>
          
          <div className="form-group mb-0">
            <label className="form-label text-sm text-gray-700 mb-2">Status do Pagamento</label>
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button 
                type="button" 
                className={`flex-1 py-2 text-sm font-bold uppercase tracking-wide rounded-md transition-colors ${paymentStatus === 'pending' ? 'bg-amber-400 text-amber-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setPaymentStatus('pending')}
              >
                Pendente
              </button>
              <button 
                type="button" 
                className={`flex-1 py-2 text-sm font-bold uppercase tracking-wide rounded-md transition-colors ${paymentStatus === 'paid' ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setPaymentStatus('paid')}
              >
                Pago
              </button>
            </div>
          </div>
        </div>

        {/* Warning missing prices */}
        {subtotal === 0 && (
          <div className="flex items-center gap-3 text-sm text-amber-800 bg-amber-50 p-4 rounded-lg border border-amber-200 shadow-sm mt-2">
            <AlertCircle size={20} className="flex-shrink-0 text-amber-500" />
            <p className="font-medium">Os itens selecionados não possuem preços cadastrados no estoque ou protocolos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
