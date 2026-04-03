import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamUpdate } from './entities/team-update.entity';
import { Employee } from '../employees/entities/employee.entity';
import { TeamUpdatesController } from './team-updates.controller';
import { TeamUpdatesService } from './team-updates.service';

@Module({
  imports: [TypeOrmModule.forFeature([TeamUpdate, Employee])],
  controllers: [TeamUpdatesController],
  providers: [TeamUpdatesService],
})
export class TeamUpdatesModule {}
