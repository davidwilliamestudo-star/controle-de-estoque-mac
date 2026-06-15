import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { FileUp, FileText, CheckCircle2, AlertTriangle, ArrowRight, Save, X } from "lucide-react";
import { xmlImportService, type XmlParsedData, type XmlParsedItem } from "../services/xmlImport.service";
import { useInventoryOptions } from "../hooks/useInventoryOptions";
import { inventoryReceiptService } from "../services/inventoryReceipt.service";

type WizardStep = "upload" | "mapping" | "review" | "success";

export function XmlImportPanel() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<XmlParsedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { data: options } = useInventoryOptions();

  // Handle step 1: Select and Parse XML
  const handleSelectXml = async () => {
    try {
      setErrorMsg(null);
      const file = await open({
        multiple: false,
        filters: [{ name: "XML NF-e", extensions: ["xml"] }],
      });

      if (typeof file === "string") {
        setFilePath(file);
        setIsProcessing(true);
        const xmlContent = await readTextFile(file);
        
        const parsed = xmlImportService.parseXml(xmlContent);
        
        // Auto-match logic
        if (parsed.supplier && options?.suppliers) {
          const matchedSup = options.suppliers.find(s => s.document === parsed.supplier?.cnpj || s.name.toLowerCase() === parsed.supplier?.name.toLowerCase());
          if (matchedSup) {
            parsed.supplier.matchedSupplierId = matchedSup.id;
          } else {
            parsed.supplier.isNewSupplier = true;
          }
        }

        parsed.items.forEach(item => {
          if (options?.items) {
            const matchedItem = options.items.find(i => 
              i.name.toLowerCase() === item.xProd.toLowerCase() || 
              i.name.toLowerCase().includes(item.xProd.toLowerCase())
            );
            if (matchedItem) {
              item.matchedInventoryItemId = matchedItem.id;
            } else {
              item.isNewItem = true;
            }
          }
        });

        setParsedData(parsed);
        setStep("mapping");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Erro ao ler o arquivo XML.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemMappingChange = (xmlItemId: string, invItemId: string) => {
    setParsedData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(i => {
          if (i.id === xmlItemId) {
            return {
              ...i,
              matchedInventoryItemId: invItemId === "NEW" ? undefined : invItemId,
              isNewItem: invItemId === "NEW"
            };
          }
          return i;
        })
      };
    });
  };

  const handleFinish = async () => {
    if (!parsedData) return;
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      
      // Save data via service
      await inventoryReceiptService.processXmlImport(parsedData);
      
      setStep("success");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Erro ao importar a nota fiscal.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card w-full">
      {/* Header */}
      <div className="card-header border-b border-gray-100 flex justify-between items-center pb-4">
        <div>
          <h3 className="card-title text-primary-600 flex items-center gap-2">
            <FileText size={18} /> Importação Inteligente de NF-e (XML)
          </h3>
          <p className="card-description">Entrada automatizada a partir da leitura da nota fiscal</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {errorMsg && (
          <div className="mb-6 bg-red-50 text-red-700 p-4 rounded-md border border-red-200 flex items-start gap-2">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center text-primary-600 mb-4">
              <FileUp size={40} />
            </div>
            <div className="text-center max-w-md">
              <h4 className="text-xl font-medium text-gray-900 mb-2">Selecione o arquivo XML</h4>
              <p className="text-sm text-gray-500 mb-8">
                Importe os dados do fornecedor e dos produtos diretamente do arquivo XML da nota fiscal. O sistema tentará vincular os produtos automaticamente.
              </p>
              <button 
                type="button"
                className="btn btn-primary px-8 py-3 text-sm font-medium"
                onClick={handleSelectXml}
                disabled={isProcessing}
              >
                {isProcessing ? "Lendo arquivo..." : "Buscar arquivo XML"}
              </button>
            </div>
          </div>
        )}

        {step === "mapping" && parsedData && (
          <div className="space-y-6">
            {/* Supplier Info */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Dados do Fornecedor</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Razão Social</p>
                  <p className="text-sm font-medium">{parsedData.supplier?.name || "Não identificado"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">CNPJ</p>
                  <p className="text-sm font-medium">{parsedData.supplier?.cnpj || "Não identificado"}</p>
                </div>
              </div>
              {parsedData.supplier?.isNewSupplier && (
                <div className="mt-3 text-xs text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded border border-amber-100">
                  Novo fornecedor será cadastrado automaticamente.
                </div>
              )}
              {parsedData.supplier?.matchedSupplierId && (
                <div className="mt-3 text-xs text-green-600 bg-green-50 inline-block px-2 py-1 rounded border border-green-100 flex items-center gap-1 w-max">
                  <CheckCircle2 size={12} /> Vinculado ao fornecedor existente.
                </div>
              )}
            </div>

            {/* Items Mapping */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-800">Mapeamento de Produtos</h4>
                <p className="text-xs text-gray-500 mt-1">Revise os vínculos sugeridos ou selecione o item correspondente no seu estoque.</p>
              </div>
              
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Produto na NF-e</th>
                    <th className="px-4 py-3 font-medium">Qtd</th>
                    <th className="px-4 py-3 font-medium">Valor Un.</th>
                    <th className="px-4 py-3 font-medium">Lote / Validade</th>
                    <th className="px-4 py-3 font-medium w-72">Vincular a Item do Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedData.items.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.xProd}</p>
                        <p className="text-xs text-gray-500">Cód: {item.cProd} | Un: {item.uCom}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{item.qCom}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.vUnCom)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-700 text-xs">Lote: {item.nLote || '-'}</p>
                        <p className="text-gray-700 text-xs">Val: {item.dVal ? new Date(item.dVal).toLocaleDateString("pt-BR") : '-'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <select 
                          className="form-control text-sm py-1.5"
                          value={item.isNewItem ? "NEW" : (item.matchedInventoryItemId || "")}
                          onChange={(e) => handleItemMappingChange(item.id, e.target.value)}
                        >
                          <option value="" disabled>-- Selecione --</option>
                          <option value="NEW" className="font-semibold text-primary-600">+ Cadastrar como Novo Item</option>
                          <optgroup label="Itens Existentes">
                            {options?.items?.map(i => (
                              <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button 
                type="button"
                className="btn btn-ghost text-gray-600" 
                onClick={() => setStep("upload")} 
                disabled={isProcessing}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="btn btn-primary bg-primary-600 flex items-center gap-2" 
                onClick={handleFinish}
                disabled={isProcessing}
              >
                <Save size={16} />
                {isProcessing ? "Processando..." : "Confirmar Importação"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-medium text-gray-900">Importação Concluída!</h4>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
              Os itens foram processados, os estoques atualizados e os lotes foram registrados com sucesso.
            </p>
            <button 
              type="button"
              className="btn btn-primary px-6" 
              onClick={() => {
                setStep("upload");
                setParsedData(null);
                setFilePath(null);
              }}
            >
              Nova Importação
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
