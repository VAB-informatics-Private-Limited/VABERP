import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Enquiry } from '../enquiries/entities/enquiry.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Quotation } from '../quotations/entities/quotation.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { SalesOrder } from '../sales-orders/entities/sales-order.entity';
import { Employee } from '../employees/entities/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enquiry,
      Customer,
      Quotation,
      JobCard,
      Inventory,
      RawMaterial,
      SalesOrder,
      Employee,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
