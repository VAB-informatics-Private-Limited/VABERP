import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Designation } from './entities/designation.entity';
import { MenuPermission } from './entities/menu-permission.entity';
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
    private auditLogsService: AuditLogsService,
  ) {}

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
    }).catch(() => {});

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

    await this.employeeRepository.update(id, updateDto);

    this.auditLogsService.log({
      enterpriseId,
      userId: user?.id,
      userType: user?.type,
      userName: user?.name,
      entityType: 'employee',
      entityId: id,
      action: 'update',
      description: `Updated employee ${employee.firstName ?? ''} ${employee.lastName ?? ''} (${employee.email})`.trim(),
    }).catch(() => {});

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number, user?: { id: number; type: string; name?: string }) {
    const employee = await this.employeeRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
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
    }).catch(() => {});

    return {
      message: 'Employee deleted successfully',
      data: null,
    };
  }

  async updatePermissions(employeeId: number, enterpriseId: number, body: any) {
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

    const saved = await this.permissionRepository.save(record);

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

    return {
      message: 'Permissions fetched successfully',
      data: {
        permissions: record?.permissions || buildEmptyPermissions(),
        dataStartDate: record?.dataStartDate ?? null,
        ownDataOnly: record?.ownDataOnly ?? false,
      },
    };
  }
}
