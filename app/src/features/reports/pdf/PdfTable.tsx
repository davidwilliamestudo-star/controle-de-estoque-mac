import { ReactNode } from "react";
import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./styles";

// ─── PdfTable ────────────────────────────────────────────────────────────────
export function PdfTable({ children }: { children: ReactNode }) {
  return <View style={pdfStyles.table}>{children}</View>;
}

// ─── PdfTableHeader ──────────────────────────────────────────────────────────
export function PdfTableHeader({ children }: { children: ReactNode }) {
  return <View style={pdfStyles.tableHeader}>{children}</View>;
}

// ─── PdfTableRow ─────────────────────────────────────────────────────────────
interface PdfTableRowProps {
  children: ReactNode;
  isStriped?: boolean;
  isLast?: boolean;
}

export function PdfTableRow({ children, isStriped, isLast }: PdfTableRowProps) {
  return (
    <View
      style={[
        pdfStyles.tableRow,
        isStriped ? pdfStyles.tableRowStriped : {},
        isLast ? pdfStyles.tableRowLast : {},
      ]}
      wrap={false}
    >
      {children}
    </View>
  );
}

// ─── PdfTableCell ────────────────────────────────────────────────────────────
interface PdfTableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  align?: "left" | "center" | "right";
  width?: string | number;
  flex?: number;
}

export function PdfTableCell({
  children,
  isHeader,
  align = "left",
  width,
  flex,
}: PdfTableCellProps) {
  const baseStyle = isHeader ? pdfStyles.tableCellHeader : pdfStyles.tableCell;

  const containerStyles: Record<string, unknown> = {
    textAlign: align,
  };

  if (width !== undefined) {
    containerStyles.width = width;
  } else if (flex !== undefined) {
    containerStyles.flex = flex;
  } else {
    containerStyles.flex = 1;
  }

  return (
    <View style={containerStyles as any}>
      <Text style={[baseStyle, { textAlign: align }]}>{children}</Text>
    </View>
  );
}
