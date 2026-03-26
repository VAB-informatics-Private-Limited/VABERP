import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoodsReceiptsController } from './goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts.service';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { IndentItem } from '../indents/entities/indent-item.entity';
import { Indent } from '../indents/entities/indent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GoodsReceipt,
      GoodsReceiptItem,
      RawMaterial,
      RawMaterialLedger,
      MaterialRequest,
      MaterialRequestItem,
      IndentItem,
      Indent,
    ]),
  ],
  controllers: [GoodsReceiptsController],
  providers: [GoodsReceiptsService],
  exports: [GoodsReceiptsService],
})
export class GoodsReceiptsModule {}
