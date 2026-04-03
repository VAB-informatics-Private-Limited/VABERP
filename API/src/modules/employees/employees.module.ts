import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Designation } from './entities/designation.entity';
import { MenuPermission } from './entities/menu-permission.entity';
import { ReportingManager } from './entities/reporting-manager.entity';
import { Task } from '../tasks/entities/task.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, Department, Designation, MenuPermission, ReportingManager, Task, JobCard])],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
