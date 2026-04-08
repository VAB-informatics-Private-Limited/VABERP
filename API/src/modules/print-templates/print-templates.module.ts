import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrintTemplatesController } from './print-templates.controller';
import { PrintTemplatesService } from './print-templates.service';
import { PrintTemplateConfig } from './entities/print-template-config.entity';
import { PrintTemplateVersion } from './entities/print-template-version.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PrintTemplateConfig, PrintTemplateVersion])],
  controllers: [PrintTemplatesController],
  providers: [PrintTemplatesService],
  exports: [PrintTemplatesService],
})
export class PrintTemplatesModule {}
