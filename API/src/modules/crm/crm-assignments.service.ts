import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CrmLead } from './entities/crm-lead.entity';
import { CrmActivityLog } from './entities/crm-activity-log.entity';
import { ModuleTeamLeader } from './entities/module-team-leader.entity';
import { Employee } from '../employees/entities/employee.entity';
import { AssignLeadDto } from './dto';
import { PermissionsJson } from '../../common/constants/permissions';

@Injectable()
export class CrmAssignmentsService {
  constructor(
    @InjectRepository(CrmLead)
    private leadRepository: Repository<CrmLead>,
    @InjectRepository(CrmActivityLog)
    private activityRepository: Repository<CrmActivityLog>,
    @InjectRepository(ModuleTeamLeader)
    private moduleLeaderRepository: Repository<ModuleTeamLeader>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    private dataSource: DataSource,
  ) {}

  async assignLead(
    leadId: number,
    enterpriseId: number,
    dto: AssignLeadDto,
    currentUserId: number,
    permissions: PermissionsJson,
  ) {
    const isAdmin = permissions?.crm?.settings?.edit === 1;
    const isManager = !isAdmin && permissions?.crm?.assignments?.create === 1;

    if (!isAdmin && !isManager) {
      throw new ForbiddenException('You do not have permission to assign leads');
    }

    const lead = await this.leadRepository.findOne({ where: { id: leadId, enterpriseId } });
    if (!lead) throw new NotFoundException('Lead not found');

    // Manager can only assign to employees who report directly to them
    if (isManager) {
      const targetEmployee = await this.employeeRepository.findOne({
        where: { id: dto.assignedTo, enterpriseId },
        select: ['id', 'reportingTo'],
      });
      if (!targetEmployee) throw new NotFoundException('Employee not found');
      if (targetEmployee.reportingTo !== currentUserId) {
        throw new ForbiddenException('You can only assign leads to members of your team');
      }
    }

    const wasAssigned = lead.assignedTo !== null;
    const oldAssignedTo = lead.assignedTo;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(CrmLead, leadId, {
        assignedTo: dto.assignedTo,
        assignedBy: currentUserId,
        managerId: isManager ? currentUserId : lead.managerId,
      });

      await queryRunner.manager.save(CrmActivityLog, {
        enterpriseId,
        crmLeadId: leadId,
        performedBy: currentUserId,
        action: wasAssigned ? 'lead_reassigned' : 'lead_assigned',
        oldValue: wasAssigned ? { assignedTo: oldAssignedTo } : null,
        newValue: { assignedTo: dto.assignedTo },
        description: wasAssigned
          ? `Lead reassigned to employee #${dto.assignedTo}`
          : `Lead assigned to employee #${dto.assignedTo}`,
      });

      await queryRunner.commitTransaction();
      return { message: 'Lead assigned successfully', data: null };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }
  }

  async getTeam(enterpriseId: number, currentUserId: number, permissions: PermissionsJson) {
    const isAdmin = permissions?.crm?.settings?.edit === 1;

    const query = this.employeeRepository
      .createQueryBuilder('emp')
      .where('emp.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('emp.status = :status', { status: 'active' })
      .select(['emp.id', 'emp.firstName', 'emp.lastName', 'emp.email', 'emp.reportingTo']);

    if (!isAdmin) {
      // Manager sees only their direct reports
      query.andWhere('emp.reportingTo = :uid', { uid: currentUserId });
    }

    const employees = await query.orderBy('emp.firstName', 'ASC').getMany();
    return { message: 'Team fetched successfully', data: employees };
  }

  async getAssignableEmployees(enterpriseId: number, currentUserId: number, permissions: PermissionsJson) {
    const isAdmin = permissions?.crm?.settings?.edit === 1;
    const isManager = !isAdmin && permissions?.crm?.assignments?.create === 1;

    if (!isAdmin && !isManager) {
      return { message: 'Assignable employees fetched successfully', data: [] };
    }

    const query = this.employeeRepository
      .createQueryBuilder('emp')
      .where('emp.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('emp.status = :status', { status: 'active' })
      .select(['emp.id', 'emp.firstName', 'emp.lastName', 'emp.email', 'emp.reportingTo']);

    if (isManager) {
      // Manager can only assign to their direct reports
      query.andWhere('emp.reportingTo = :uid', { uid: currentUserId });
    }

    const employees = await query.orderBy('emp.firstName', 'ASC').getMany();
    return { message: 'Assignable employees fetched successfully', data: employees };
  }

  async updateReportingTo(
    targetEmployeeId: number,
    enterpriseId: number,
    reportingTo: number | null,
  ) {
    const employee = await this.employeeRepository.findOne({
      where: { id: targetEmployeeId, enterpriseId },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.employeeRepository.update(targetEmployeeId, { reportingTo });
    return { message: 'Reporting-to updated successfully', data: null };
  }

  async getModuleLeaders(enterpriseId: number) {
    const leaders = await this.moduleLeaderRepository.find({
      where: { enterpriseId },
      relations: ['employee'],
      order: { moduleName: 'ASC' },
    });
    return {
      message: 'Module leaders fetched successfully',
      data: leaders.map(l => ({
        id: l.id,
        module_name: l.moduleName,
        employee_id: l.employeeId,
        employee_name: `${l.employee.firstName} ${l.employee.lastName}`,
        employee_email: l.employee.email,
      })),
    };
  }

  async setModuleLeader(enterpriseId: number, moduleName: string, employeeId: number | null) {
    if (employeeId === null) {
      await this.moduleLeaderRepository.delete({ enterpriseId, moduleName });
      return { message: 'Module leader removed', data: null };
    }
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, enterpriseId, status: 'active' },
    });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.moduleLeaderRepository.upsert(
      { enterpriseId, moduleName, employeeId },
      { conflictPaths: ['enterpriseId', 'moduleName'] },
    );
    return { message: 'Module leader set successfully', data: null };
  }
}
