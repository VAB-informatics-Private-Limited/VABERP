export class ProformaInvoiceItemDto {
  productId?: number;
  itemName: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountPercent?: number;
  taxPercent?: number;
  sortOrder?: number;
}

export class CreateProformaInvoiceDto {
  quotationId?: number;
  customerId?: number;
  customerName: string;
  email?: string;
  mobile?: string;
  billingAddress?: string;
  shippingAddress?: string;
  piDate?: string;
  discountType?: string;
  discountValue?: number;
  shippingCharges?: number;
  notes?: string;
  termsConditions?: string;
  items: ProformaInvoiceItemDto[];
}

export class UpdatePIStatusDto {
  status: string;
}
