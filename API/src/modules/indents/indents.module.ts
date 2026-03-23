import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndentsController } from './indents.controller';
import { IndentsService } from './indents.service';
import { Indent } from './entities/indent.entity';
import { IndentItem } from './entities/indent-item.entity';
import { MaterialRequest } from '../material-requests/entities/material-request.entity';
import { MaterialRequestItem } from '../material-requests/entities/material-request-item.entity';
import { RawMaterial } from '../raw-materials/entities/raw-material.entity';
import { RawMaterialLedger } from '../raw-materials/entities/raw-material-ledger.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Indent, IndentItem, MaterialRequest, MaterialRequestItem, RawMaterial, RawMaterialLedger]),
  ],
  controllers: [IndentsController],
  providers: [IndentsService],
  exports: [IndentsService],
})
export class IndentsModule {}
