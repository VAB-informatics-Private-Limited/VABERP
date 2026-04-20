import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnterpriseBranding } from './entities/enterprise-branding.entity';
import { BrandingVersion } from './entities/branding-version.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { EnterpriseBrandingService } from './enterprise-branding.service';
import { EnterpriseBrandingController } from './enterprise-branding.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EnterpriseBranding, BrandingVersion, Enterprise])],
  controllers: [EnterpriseBrandingController],
  providers: [EnterpriseBrandingService],
  exports: [EnterpriseBrandingService],
})
export class EnterpriseBrandingModule {}
