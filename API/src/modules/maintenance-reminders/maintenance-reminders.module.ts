import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderRule } from './entities/reminder-rule.entity';
import { MaintenanceReminder } from './entities/maintenance-reminder.entity';
import { Machine } from '../machines/entities/machine.entity';
import { MaintenanceRemindersService } from './maintenance-reminders.service';
import { MaintenanceRemindersController } from './maintenance-reminders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderRule, MaintenanceReminder, Machine]),
  ],
  controllers: [MaintenanceRemindersController],
  providers: [MaintenanceRemindersService],
  exports: [MaintenanceRemindersService],
})
export class MaintenanceRemindersModule {}
