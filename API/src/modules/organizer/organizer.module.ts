import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizerItem } from './entities/organizer-item.entity';
import { OrganizerRecurrenceRule } from './entities/organizer-recurrence-rule.entity';
import { OrganizerContextLink } from './entities/organizer-context-link.entity';
import { OrganizerActivityLog } from './entities/organizer-activity-log.entity';
import { OrganizerTagMaster } from './entities/organizer-tag-master.entity';
import { OrganizerService } from './organizer.service';
import { OrganizerController } from './organizer.controller';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizerItem,
      OrganizerRecurrenceRule,
      OrganizerContextLink,
      OrganizerActivityLog,
      OrganizerTagMaster,
    ]),
  ],
  controllers: [OrganizerController],
  providers: [OrganizerService],
  exports: [OrganizerService],
})
export class OrganizerModule {}
