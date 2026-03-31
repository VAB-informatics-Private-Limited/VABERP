import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesOrdersController } from './sales-orders.controller';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderItem } from './entities/sales-order-item.entity';
import { SalesOrderVersion } from './entities/sales-order-version.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { QuotationItem } from '../quotations/entities/quotation-item.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { InvoiceItem } from '../invoices/entities/invoice-item.entity';
import { Payment } from '../invoices/entities/payment.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { Enquiry } from '../enquiries/entities/enquiry.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrder, SalesOrderItem, SalesOrderVersion,
      Quotation, QuotationItem,
      Invoice, InvoiceItem, Payment,
      JobCard, Enquiry, Enterprise,
    ]),
    EmailModule,
  ],
  controllers: [SalesOrdersController],
  providers: [SalesOrdersService],
  exports: [SalesOrdersService],
})
export class SalesOrdersModule {}
