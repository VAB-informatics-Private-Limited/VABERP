import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Designation } from './entities/designation.entity';
import { MenuPermission } from './entities/menu-permission.entity';
import { ReportingManager } from './entities/reporting-manager.entity';
import { Task } from '../tasks/entities/task.entity';
import { JobCard } from '../manufacturing/entities/job-card.entity';
import { buildEmptyPermissions } from '../../common/constants/permissions';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(Designation)
    private designationRepository: Repository<Designation>,
    @InjectRepository(MenuPermission)
    private permissionRepository: Repository<MenuPermission>,
    @InjectRepository(ReportingManager)
    private reportingManagerRepository: Repository<ReportingManager>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(JobCard)
    private jobCardRepository: Repository<JobCard>,
    private auditLogsService: AuditLogsService,
  ) {}

  // ============ Reporting Managers ============

  async getReportingManagers(enterpriseId: number) {
    const data = await this.reportingManagerRepository.find({
      where: { enterpriseId },
      order: { name: 'ASC' },
    });
    return { message: 'Reporting managers fetched successfully', data, totalRecords: data.length };
  }

  async createReportingManager(enterpriseId: number, body: any) {
    const manager = this.reportingManagerRepository.create({
      enterpriseId,
      name: body.name,
      status: body.status || 'active',
    });
    const saved = await this.reportingManagerRepository.save(manager);
    return { message: 'Reporting manager created successfully', data: saved };
  }

  async updateReportingManager(id: number, enterpriseId: number, body: any) {
    const manager = await this.reportingManagerRepository.findOne({ where: { id, enterpriseId } });
    if (!manager) throw new NotFoundException('Reporting manager not found');
    if (body.name !== undefined) manager.name = body.name;
    if (body.status !== undefined) manager.status = body.status;
    const saved = await this.reportingManagerRepository.save(manager);
    return { message: 'Reporting manager updated successfully', data: saved };
  }

  async deleteReportingManager(id: number, enterpriseId: number) {
    const manager = await this.reportingManagerRepository.findOne({ where: { id, enterpriseId } });
    if (!manager) throw new NotFoundException('Reporting manager not found');
    await this.reportingManagerRepository.delete(id);
    return { message: 'Reporting manager deleted successfully', data: null };
  }

  // ============ Departments ============

  async getDepartments(enterpriseId: number, limit = 1000) {
    const limitNum = Number(limit) || 1000;
    const data = await this.departmentRepository.find({
      where: { enterpriseId },
      order: { departmentName: 'ASC' },
      take: limitNum,
    });

    return {
      message: 'Departments fetched successfully',
      data,
      totalRecords: data.length,
      page: 1,
      limit: limitNum,
    };
  }

  async createDepartment(enterpriseId: number, body: any) {
    const department = this.departmentRepository.create({
      enterpriseId,
      departmentName: body.departmentName,
      description: body.description,
      status: body.status || 'active',
    });

    const saved = await this.departmentRepository.save(department);

    return {
      message: 'Department created successfully',
      data: saved,
    };
  }

  async updateDepartment(id: number, enterpriseId: number, body: any) {
    const department = await this.departmentRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (body.departmentName !== undefined) department.departmentName = body.departmentName;
    if (body.description !== undefined) department.description = body.description;
    if (body.status !== undefined) department.status = body.status;

    const saved = await this.departmentRepository.save(department);

    return {
      message: 'Department updated successfully',
      data: saved,
    };
  }

  async deleteDepartment(id: number, enterpriseId: number) {
    const department = await this.departmentRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    await this.departmentRepository.delete(id);

    return {
      message: 'Department deleted successfully',
      data: null,
    };
  }

  async seedDefaultDepartmentsAndDesignations(enterpriseId: number) {
    const defaults: { name: string; description: string; designations: string[] }[] = [
      {
        name: 'Sales & Marketing',
        description: 'Handles enquiries, quotations, follow-ups and customer acquisition',
        designations: ['Sales Manager', 'Sales Executive', 'Business Development Executive', 'Marketing Manager', 'CRM Specialist'],
      },
      {
        name: 'Procurement',
        description: 'Manages purchase orders, RFQs, vendor relations and goods receipts',
        designations: ['Purchase Manager', 'Purchase Officer', 'Vendor Relations Executive', 'Procurement Analyst'],
      },
      {
        name: 'Manufacturing & Production',
        description: 'Oversees BOM, job cards, production stages and dispatch',
        designations: ['Production Manager', 'Production Supervisor', 'Machine Operator', 'Process Engineer', 'Dispatch Coordinator'],
      },
      {
        name: 'Store & Warehouse',
        description: 'Manages indents, material requests, inventory and goods movement',
        designations: ['Store Manager', 'Store Keeper', 'Inventory Controller', 'Material Handler'],
      },
      {
        name: 'Quality Control',
        description: 'Ensures quality standards across production and incoming materials',
        designations: ['QC Manager', 'Quality Inspector', 'QA Engineer', 'Testing Technician'],
      },
      {
        name: 'Finance & Accounts',
        description: 'Handles billing, payments, purchase order finances and accounting',
        designations: ['Finance Manager', 'Accountant', 'Accounts Executive', 'Billing Officer'],
      },
      {
        name: 'Human Resources',
        description: 'Manages employee lifecycle, payroll, recruitment and HR policies',
        designations: ['HR Manager', 'HR Executive', 'Recruitment Specialist', 'Payroll Officer'],
      },
      {
        name: 'Administration',
        description: 'Handles office administration, compliance and general management',
        designations: ['Admin Manager', 'Admin Executive', 'Office Assistant', 'Compliance Officer'],
      },
    ];

    let createdDepartments = 0;
    let createdDesignations = 0;

    for (const def of defaults) {
      // Check if department already exists (by name, case-insensitive)
      const existing = await this.departmentRepository.findOne({
        where: { enterpriseId, departmentName: def.name },
      });

      let dept: Department;
      if (existing) {
        dept = existing;
      } else {
        dept = await this.departmentRepository.save(
          this.departmentRepository.create({
            enterpriseId,
            departmentName: def.name,
            description: def.description,
            status: 'active',
          }),
        );
        createdDepartments++;
      }

      for (const desName of def.designations) {
        const existingDes = await this.designationRepository.findOne({
          where: { enterpriseId, departmentId: dept.id, designationName: desName },
        });
        if (!existingDes) {
          await this.designationRepository.save(
            this.designationRepository.create({
              enterpriseId,
              departmentId: dept.id,
              designationName: desName,
              status: 'active',
            }),
          );
          createdDesignations++;
        }
      }
    }

    return {
      message: `Seeded ${createdDepartments} departments and ${createdDesignations} designations`,
      data: { createdDepartments, createdDesignations },
    };
  }

  // ============ Designations ============

  async getDesignations(enterpriseId: number, departmentId?: number, limit = 1000) {
    const limitNum = Number(limit) || 1000;
    const where: any = { enterpriseId };
    if (departmentId) {
      where.departmentId = Number(departmentId);
    }

    const data = await this.designationRepository.find({
      where,
      relations: ['department'],
      order: { designationName: 'ASC' },
      take: limitNum,
    });

    return {
      message: 'Designations fetched successfully',
      data,
      totalRecords: data.length,
      page: 1,
      limit: limitNum,
    };
  }

  async createDesignation(enterpriseId: number, body: any) {
    const designation = this.designationRepository.create({
      enterpriseId,
      departmentId: body.departmentId,
      designationName: body.designationName,
      description: body.description,
      status: body.status || 'active',
    });

    const saved = await this.designationRepository.save(designation);

    return {
      message: 'Designation created successfully',
      data: saved,
    };
  }

  async updateDesignation(id: number, enterpriseId: number, body: any) {
    const designation = await this.designationRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    if (body.departmentId !== undefined) designation.departmentId = body.departmentId;
    if (body.designationName !== undefined) designation.designationName = body.designationName;
    if (body.description !== undefined) designation.description = body.description;
    if (body.status !== undefined) designation.status = body.status;

    const saved = await this.designationRepository.save(designation);

    return {
      message: 'Designation updated successfully',
      data: saved,
    };
  }

  async deleteDesignation(id: number, enterpriseId: number) {
    const designation = await this.designationRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!designation) {
      throw new NotFoundException('Designation not found');
    }

    await this.designationRepository.delete(id);

    return {
      message: 'Designation deleted successfully',
      data: null,
    };
  }

  // ============ Employees ============

  async getReporters(enterpriseId: number) {
    const data = await this.employeeRepository.find({
      where: { enterpriseId, isReportingHead: true },
      relations: ['department', 'designation'],
      order: { firstName: 'ASC' },
    });
    return { message: 'Reporters fetched successfully', data };
  }

  async setReportingHead(id: number, enterpriseId: number, value: boolean) {
    const employee = await this.employeeRepository.findOne({ where: { id, enterpriseId } });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.employeeRepository.update({ id, enterpriseId }, { isReportingHead: value });
    return { message: 'Updated successfully', data: null };
  }

  async findSalesEmployees(enterpriseId: number) {
    const data = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.designation', 'designation')
      .innerJoin('menu_permissions', 'mp', 'mp.employee_id = employee.id')
      .where('employee.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere(`employee.status = 'active'`)
      .andWhere(
        `EXISTS (
          SELECT 1
          FROM jsonb_each(mp.permissions->'sales') AS sub(key, perms),
               jsonb_each(perms) AS perm(action, val)
          WHERE val::text = '1'
        )`,
      )
      .orderBy('employee.firstName', 'ASC')
      .getMany();

    return {
      message: 'Sales employees fetched successfully',
      data,
      totalRecords: data.length,
    };
  }

  async findByPermissionModule(enterpriseId: number, module: string) {
    const records = await this.permissionRepository
      .createQueryBuilder('mp')
      .innerJoinAndSelect('mp.employee', 'emp')
      .where('emp.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('emp.status = :status', { status: 'active' })
      .getMany();

    const eligible = records
      .filter((p) => {
        const mod = (p.permissions as any)?.[module];
        if (!mod) return false;
        return Object.values(mod).some(
          (sub: any) =>
            typeof sub === 'object' &&
            sub !== null &&
            Object.values(sub).some((v: any) => v === 1),
        );
      })
      .map((p) => p.employee);

    return { message: 'Employees fetched', data: eligible };
  }

  async findAll(enterpriseId: number, page = 1, limit = 20, search?: string) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    const query = this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.designation', 'designation')
      .where('employee.enterpriseId = :enterpriseId', { enterpriseId });

    if (search) {
      query.andWhere(
        '(employee.firstName ILIKE :search OR employee.lastName ILIKE :search OR employee.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .orderBy('employee.createdDate', 'DESC')
      .getManyAndCount();

    return {
      message: 'Employees fetched successfully',
      data,
      totalRecords: total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id, enterpriseId },
      relations: ['department', 'designation'],
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return {
      message: 'Employee fetched successfully',
      data: employee,
    };
  }

  async create(enterpriseId: number, createDto: any, user?: { id: number; type: string; name?: string }) {
    const existingEmail = await this.employeeRepository.findOne({
      where: { email: createDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createDto.password, 10);

    const employee = this.employeeRepository.create({
      ...createDto,
      password: hashedPassword,
      enterpriseId,
    });

    const savedResult = await this.employeeRepository.save(employee);
    const savedEmployee = Array.isArray(savedResult) ? savedResult[0] : savedResult;

    // Create permissions with empty or provided initial values
    const initialPermissions = createDto.permissions || buildEmptyPermissions();
    const permRecord = this.permissionRepository.create({
      employeeId: savedEmployee.id,
      permissions: initialPermissions,
    });
    await this.permissionRepository.save(permRecord);

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'employee',
      entityId: savedEmployee.id,
      action: 'create',
      description: `Created employee ${savedEmployee.firstName ?? ''} ${savedEmployee.lastName ?? ''} (${savedEmployee.email})`.trim(),
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return {
      message: 'Employee created successfully',
      data: savedEmployee,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: any, user?: { id: number; type: string; name?: string }) {
    const employee = await this.employeeRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    if (updateDto.password) {
      updateDto.password = await bcrypt.hash(updateDto.password, 10);
    }

    // Strip relation/unknown fields before TypeORM update to avoid EntityPropertyNotFoundError
    const { reportingTo, reportingManagerId, manager, ...restDto } = updateDto;
    await this.employeeRepository.update(id, restDto);

    // Use raw SQL to update reporting_to — avoids TypeORM confusion from @Column + @ManyToOne on same column
    if ('reportingTo' in updateDto) {
      const newValue = reportingTo != null ? Number(reportingTo) : null;
      await this.employeeRepository.query(
        `UPDATE employees SET reporting_to = $1 WHERE id = $2 AND enterprise_id = $3`,
        [newValue, id, enterpriseId],
      );
    }

    // If reportingTo changed:
    // 1. Auto-mark the new manager as a reporting head (so they see "My Team" in sidebar)
    // 2. Propagate this employee's permissions to the new manager
    if (
      updateDto.reportingTo != null &&
      updateDto.reportingTo !== employee.reportingTo
    ) {
      await this.employeeRepository.update(
        { id: updateDto.reportingTo, enterpriseId },
        { isReportingHead: true },
      );
      const empRecord = await this.permissionRepository.findOne({ where: { employeeId: id } });
      if (empRecord) {
        const managerRecord = await this.permissionRepository.findOne({
          where: { employeeId: updateDto.reportingTo },
        });
        if (managerRecord) {
          managerRecord.permissions = this.mergePermissions(managerRecord.permissions, empRecord.permissions);
          await this.permissionRepository.save(managerRecord);
        }
      }
    }

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'employee',
      entityId: id,
      action: 'update',
      description: `Updated employee ${employee.firstName ?? ''} ${employee.lastName ?? ''} (${employee.email})`.trim(),
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number, user?: { id: number; type: string; name?: string }) {
    const employee = await this.employeeRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Prevent self-deletion
    if (user?.id === id && user?.type === 'employee') {
      throw new BadRequestException('You cannot delete your own employee account.');
    }

    // Block delete if this employee is a reporting manager for other active employees
    const manager = this.employeeRepository.manager;
    const [reports] = await manager.query(
      `SELECT COUNT(*)::int AS cnt FROM employees
       WHERE reporting_to = $1 AND enterprise_id = $2 AND status = 'active'`,
      [id, enterpriseId],
    );
    if (reports && Number(reports.cnt) > 0) {
      throw new BadRequestException(
        `Cannot delete ${employee.firstName} ${employee.lastName || ''}. They are the reporting manager for ${reports.cnt} active employee(s). Please reassign those employees' reporting manager first.`,
      );
    }

    await this.permissionRepository.delete({ employeeId: id });
    await this.employeeRepository.delete(id);

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'employee',
      entityId: id,
      action: 'delete',
      description: `Deleted employee ${employee.firstName ?? ''} ${employee.lastName ?? ''} (${employee.email})`.trim(),
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return {
      message: 'Employee deleted successfully',
      data: null,
    };
  }

  async updatePermissions(employeeId: number, enterpriseId: number, body: any, updatedBy?: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, enterpriseId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Accept either raw permissions JSON (legacy) or wrapped { permissions, dataStartDate }
    const permissions = body.permissions !== undefined ? body.permissions : body;
    const dataStartDate = body.dataStartDate !== undefined ? body.dataStartDate : undefined;

    let record = await this.permissionRepository.findOne({
      where: { employeeId },
    });

    if (!record) {
      record = this.permissionRepository.create({ employeeId, permissions });
    } else {
      record.permissions = permissions;
    }

    if (dataStartDate !== undefined) {
      record.dataStartDate = dataStartDate ? new Date(dataStartDate) : null;
    }

    if (body.ownDataOnly !== undefined) {
      record.ownDataOnly = Boolean(body.ownDataOnly);
    }

    if (updatedBy !== undefined) {
      record.updatedBy = updatedBy;
    }

    const saved = await this.permissionRepository.save(record);

    // Auto-propagate: merge employee's permissions into their manager (additive only)
    if (employee.reportingTo) {
      const manager = await this.employeeRepository.findOne({
        where: { id: employee.reportingTo, enterpriseId },
      });
      if (manager) {
        let managerRecord = await this.permissionRepository.findOne({
          where: { employeeId: manager.id },
        });
        if (managerRecord) {
          const merged = this.mergePermissions(managerRecord.permissions, permissions);
          managerRecord.permissions = merged;
          await this.permissionRepository.save(managerRecord);
        }
      }
    }

    return {
      message: 'Permissions updated successfully',
      data: {
        permissions: saved.permissions || buildEmptyPermissions(),
        dataStartDate: saved.dataStartDate ?? null,
        ownDataOnly: saved.ownDataOnly ?? false,
      },
    };
  }

  async getPermissions(employeeId: number, enterpriseId: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId, enterpriseId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const record = await this.permissionRepository.findOne({
      where: { employeeId },
    });

    // Resolve who last updated permissions
    let updatedByName: string | null = null;
    if (record?.updatedBy) {
      const updater = await this.employeeRepository.findOne({ where: { id: record.updatedBy } });
      if (updater) {
        updatedByName = `${updater.firstName} ${updater.lastName}`.trim();
      }
    }

    return {
      message: 'Permissions fetched successfully',
      data: {
        permissions: record?.permissions || buildEmptyPermissions(),
        dataStartDate: record?.dataStartDate ?? null,
        ownDataOnly: record?.ownDataOnly ?? false,
        updatedAt: record?.updatedAt ?? null,
        updatedBy: record?.updatedBy ?? null,
        updatedByName: updatedByName,
      },
    };
  }

  async getTeamOverview(managerId: number, enterpriseId: number) {
    const reports = await this.employeeRepository.find({
      where: { reportingTo: managerId, enterpriseId },
      relations: ['department', 'designation'],
    });

    const result = await Promise.all(
      reports.map(async (emp) => {
        const permRecord = await this.permissionRepository.findOne({
          where: { employeeId: emp.id },
        });
        const perms: Record<string, any> = permRecord?.permissions || {};
        const accessModules = Object.entries(perms)
          .filter(([, submodules]) =>
            Object.values(submodules as Record<string, any>).some((actions) =>
              Object.values(actions as Record<string, number>).some((v) => v === 1),
            ),
          )
          .map(([module]) => module);

        // Active tasks for this employee
        const allTasks = await this.taskRepository.find({
          where: { assignedTo: emp.id, enterpriseId },
          order: { createdDate: 'DESC' },
          take: 10,
        });
        const activeTasks = allTasks
          .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
          .slice(0, 5)
          .map((t) => ({
            id: t.id,
            taskNumber: t.taskNumber,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
          }));

        // Active job cards for this employee
        const allJobCards = await this.jobCardRepository.find({
          where: { assignedTo: emp.id, enterpriseId },
          order: { createdDate: 'DESC' },
          take: 10,
        });
        const activeJobCards = allJobCards
          .filter((j) => j.status !== 'dispatched')
          .slice(0, 5)
          .map((j) => ({
            id: j.id,
            jobNumber: j.jobNumber,
            jobName: j.jobName,
            status: j.status,
          }));

        return {
          id: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          status: emp.status,
          designation: (emp as any).designation?.name ?? null,
          department: (emp as any).department?.name ?? null,
          accessModules,
          activeTasks,
          activeJobCards,
          activeTaskCount: activeTasks.length,
          activeJobCardCount: activeJobCards.length,
        };
      }),
    );

    return { message: 'Team overview fetched successfully', data: result };
  }

  // Merge employee permissions into manager permissions — additive only (never revoke).
  private mergePermissions(
    base: Record<string, any>,
    additional: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = JSON.parse(JSON.stringify(base || {}));
    for (const module of Object.keys(additional || {})) {
      if (!result[module]) result[module] = {};
      for (const submodule of Object.keys(additional[module] || {})) {
        if (!result[module][submodule]) result[module][submodule] = {};
        for (const action of Object.keys(additional[module][submodule] || {})) {
          if (additional[module][submodule][action] === 1) {
            result[module][submodule][action] = 1;
          } else if (result[module][submodule][action] === undefined) {
            result[module][submodule][action] = 0;
          }
        }
      }
    }
    return result;
  }
}
