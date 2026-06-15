import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BrandLogo } from "@/components/common/BrandLogo";
import type { LabelPrintItem, LabelTemplate } from "@/features/inventory/types";

interface LabelPreviewProps {
  item?: LabelPrintItem | null;
  template: LabelTemplate;
  isTest?: boolean;
  position?: number;
}

function formatDate(value?: string | null) {
  if (!value) return "S/Val.";
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function LabelPreview({ item, template, isTest, position }: LabelPreviewProps) {
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    if (item?.qr_payload && !isTest) {
      QRCode.toDataURL(item.qr_payload, {
        margin: 0,
        width: 120,
        errorCorrectionLevel: "M",
      }).then(setQrCode);
    }
  }, [item?.qr_payload, isTest]);

  if (isTest) {
    return (
      <div
        className="inventory-label test-label"
        style={{
          width: `${template.width_mm}mm`,
          height: `${template.height_mm}mm`,
          padding: `${template.padding_mm}mm`,
          border: '1px dashed #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb'
        }}
      >
        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9ca3af' }}>{position}</span>
      </div>
    );
  }

  if (!item) {
    return (
      <div
        className="inventory-label empty-label"
        style={{
          width: `${template.width_mm}mm`,
          height: `${template.height_mm}mm`,
        }}
      />
    );
  }

  return (
    <div
      className="inventory-label"
      style={{
        width: `${template.width_mm}mm`,
        height: `${template.height_mm}mm`,
        padding: `${template.padding_mm}mm`,
      }}
    >
      <div className="inventory-label-main" style={{ gap: '2px', paddingRight: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {template.show_logo === 1 && <BrandLogo variant="collapsed" className="inventory-label-logo" />}
          {template.show_item_name === 1 && <strong className="truncate-2-lines" style={{ flex: 1, fontSize: '10px', lineHeight: 1 }}>{item.item_name}</strong>}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '8px', lineHeight: 1, marginTop: '1px' }}>
          {template.show_batch === 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
              <span className="truncate"><b>Lote:</b> {item.batch_number}</span>
              {template.show_expiration === 1 && <span className="truncate" style={{ flexShrink: 0 }}><b>Val:</b> {formatDate(item.expiration_date)}</span>}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
            <span className="truncate"><b>Qtd:</b> {Number(item.total_quantity).toLocaleString("pt-BR")} {item.unit}</span>
            <code className="truncate" style={{ fontSize: '7.5px', color: '#6b7280' }}>
              ID: {item.inventory_batch_id?.slice(0, 8) ?? item.qr_payload.slice(-8)}
            </code>
          </div>
        </div>
      </div>
      
      {template.show_qrcode === 1 && qrCode && (
        <div className="inventory-label-qr-wrapper">
          <img src={qrCode} alt="QR Code" className="inventory-label-qr" />
        </div>
      )}
    </div>
  );
}

