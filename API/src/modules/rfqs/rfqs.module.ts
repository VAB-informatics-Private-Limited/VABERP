import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { RfqsController } from './rfqs.controller';
import { RfqsService } from './rfqs.service';
import { Rfq } from './entities/rfq.entity';
import { RfqVendor } from './entities/rfq-vendor.entity';
import { RfqVendorItem } from './entities/rfq-vendor-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { Indent } from '../indents/entities/indent.entity';
import { IndentItem } from '../indents/entities/indent-item.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rfq, RfqVendor, RfqVendorItem, Supplier, Indent, IndentItem]),
    MulterModule.register({ dest: 'uploads/rfq-quotes' }),
    EmailModule,
  ],
  controllers: [RfqsController],
  providers: [RfqsService],
  exports: [RfqsService],
})
export class RfqsModule {}
