import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceVendor } from './entities/maintenance-vendor.entity';
import { AmcContract } from './entities/amc-contract.entity';
import { VendorPerformanceLog } from './entities/vendor-performance-log.entity';
import { MaintenanceVendorsService } from './maintenance-vendors.service';
import { MaintenanceVendorsController } from './maintenance-vendors.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceVendor, AmcContract, VendorPerformanceLog])],
  controllers: [MaintenanceVendorsController],
  providers: [MaintenanceVendorsService],
  exports: [MaintenanceVendorsService, TypeOrmModule],
})
export class MaintenanceVendorsModule {}
