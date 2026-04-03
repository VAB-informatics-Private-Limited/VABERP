import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeamUpdate } from './entities/team-update.entity';
import { Employee } from '../employees/entities/employee.entity';
import { CreateTeamUpdateDto } from './dto/create-team-update.dto';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class TeamUpdatesService {
  constructor(
    @InjectRepository(TeamUpdate)
    private updateRepository: Repository<TeamUpdate>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private smsService: SmsService,
  ) {}

  // Manager posts an update visible to all their direct reports
  async create(managerId: number, enterpriseId: number, dto: CreateTeamUpdateDto) {
    const update = this.updateRepository.create({
      managerId,
      enterpriseId,
      title: dto.title,
      content: dto.content,
      category: dto.category || 'general',
    });
    const saved = await this.updateRepository.save(update);

    // Send SMS notification to all direct reports (best-effort, fire-and-forget)
    if (this.smsService.isConfigured()) {
      const directReports = await this.employeeRepository.find({
        where: { reportingTo: managerId, enterpriseId, status: 'active' },
        select: ['phoneNumber', 'firstName'],
      });
      const phones = directReports
        .map((e) => e.phoneNumber)
        .filter((p): p is string => !!p);

      if (phones.length > 0) {
        const manager = await this.employeeRepository.findOne({
          where: { id: managerId },
          select: ['firstName', 'lastName'],
        });
        const managerName = manager
          ? `${manager.firstName} ${manager.lastName ?? ''}`.trim()
          : 'Your manager';

        const smsText =
          `${managerName} posted a new update: "${dto.title}". ` +
          `Log in to VAB ERP to view the full details.`;

        this.smsService.sendBulk(phones, smsText).catch(() => {});
      }
    }

    return { message: 'Update posted successfully', data: saved };
  }

  // Manager sees their own updates
  async findByManager(managerId: number, enterpriseId: number) {
    const updates = await this.updateRepository.find({
      where: { managerId, enterpriseId },
      order: { createdDate: 'DESC' },
      take: 50,
    });
    return { message: 'Updates fetched', data: updates };
  }

  // Employee sees updates from their manager
  async findForEmployee(employeeId: number, enterpriseId: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, enterpriseId },
    });

    if (!employee || !employee.reportingTo) {
      return { message: 'No manager assigned', data: [] };
    }

    const updates = await this.updateRepository.find({
      where: { managerId: employee.reportingTo, enterpriseId },
      order: { createdDate: 'DESC' },
      take: 50,
    });

    // Fetch manager details
    const manager = await this.employeeRepository.findOne({
      where: { id: employee.reportingTo },
      select: ['id', 'firstName', 'lastName', 'email'],
    });

    return {
      message: 'Updates fetched',
      data: updates,
      manager: manager
        ? { id: manager.id, firstName: manager.firstName, lastName: manager.lastName, email: manager.email }
        : null,
    };
  }

  // Manager deletes their own update
  async remove(id: number, managerId: number, enterpriseId: number) {
    const update = await this.updateRepository.findOne({
      where: { id, enterpriseId },
    });
    if (!update) throw new NotFoundException('Update not found');
    if (update.managerId !== managerId) throw new ForbiddenException('You can only delete your own updates');
    await this.updateRepository.remove(update);
    return { message: 'Update deleted' };
  }
}
