import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmLead } from './entities/crm-lead.entity';
import { CrmFollowup } from './entities/crm-followup.entity';
import { CrmActivityLog } from './entities/crm-activity-log.entity';
import { ModuleTeamLeader } from './entities/module-team-leader.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CrmLeadsService } from './crm-leads.service';
import { CrmAssignmentsService } from './crm-assignments.service';
import { CrmFollowupsService } from './crm-followups.service';
import { CrmReportsService } from './crm-reports.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CrmLead, CrmFollowup, CrmActivityLog, ModuleTeamLeader, Employee]),
  ],
  controllers: [CrmController],
  providers: [CrmLeadsService, CrmAssignmentsService, CrmFollowupsService, CrmReportsService],
  exports: [CrmLeadsService],
})
export class CrmModule {}
