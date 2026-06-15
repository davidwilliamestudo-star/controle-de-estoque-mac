// Using browser native DOMParser

export interface XmlParsedItem {
  id: string; // just a unique id for the ui
  cProd: string;
  xProd: string;
  uCom: string;
  qCom: number;
  vUnCom: number;
  nLote?: string;
  dVal?: string; // YYYY-MM-DD
  
  // Mapping state for UI
  matchedInventoryItemId?: string;
  isNewItem?: boolean;
  newItemCategoryId?: string;
}

export interface XmlParsedSupplier {
  cnpj: string;
  name: string;
  matchedSupplierId?: string;
  isNewSupplier?: boolean;
}

export interface XmlParsedData {
  supplier: XmlParsedSupplier | null;
  items: XmlParsedItem[];
}

export const xmlImportService = {
  parseXml(xmlContent: string): XmlParsedData {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, "application/xml");

    // Helper function to get text content safely
    const getText = (element: Element | Document, tag: string): string => {
      const el = element.getElementsByTagName(tag)[0];
      return el ? el.textContent || "" : "";
    };

    // Parse Supplier
    let supplier: XmlParsedSupplier | null = null;
    const emit = doc.getElementsByTagName("emit")[0];
    if (emit) {
      const cnpj = getText(emit, "CNPJ");
      const name = getText(emit, "xNome");
      if (cnpj && name) {
        supplier = { cnpj, name };
      }
    }

    // Parse Items
    const items: XmlParsedItem[] = [];
    const detElements = doc.getElementsByTagName("det");
    
    for (let i = 0; i < detElements.length; i++) {
      const det = detElements[i];
      const prod = det.getElementsByTagName("prod")[0];
      
      if (prod) {
        const cProd = getText(prod, "cProd");
        const xProd = getText(prod, "xProd");
        const uCom = getText(prod, "uCom");
        const qComStr = getText(prod, "qCom");
        const vUnComStr = getText(prod, "vUnCom");
        
        let nLote = undefined;
        let dVal = undefined;

        // Try to find <med> or <rastro> for lote info
        const med = det.getElementsByTagName("med")[0];
        if (med) {
          nLote = getText(med, "nLote");
          dVal = getText(med, "dVal");
        } else {
          const rastro = det.getElementsByTagName("rastro")[0];
          if (rastro) {
            nLote = getText(rastro, "nLote");
            dVal = getText(rastro, "dVal");
          }
        }

        items.push({
          id: `xml-item-${i}`,
          cProd,
          xProd,
          uCom,
          qCom: parseFloat(qComStr) || 0,
          vUnCom: parseFloat(vUnComStr) || 0,
          nLote: nLote || undefined,
          dVal: dVal || undefined
        });
      }
    }

    return { supplier, items };
  }
};
