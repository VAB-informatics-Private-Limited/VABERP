import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProformaInvoicesController } from './proforma-invoices.controller';
import { ProformaInvoicesService } from './proforma-invoices.service';
import { ProformaInvoice } from './entities/proforma-invoice.entity';
import { ProformaInvoiceItem } from './entities/proforma-invoice-item.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderItem } from '../sales-orders/entities/sales-order-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProformaInvoice,
      ProformaInvoiceItem,
      Quotation,
      QuotationItem,
      SalesOrder,
      SalesOrderItem,
    ]),
  ],
  controllers: [ProformaInvoicesController],
  providers: [ProformaInvoicesService],
  exports: [ProformaInvoicesService],
})
export class ProformaInvoicesModule {}
