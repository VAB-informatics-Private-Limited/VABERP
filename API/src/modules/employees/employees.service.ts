import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from './entities/employee.entity';
import { Department } from './entities/department.entity';
import { Designation } from './entities/designation.entity';
import { MenuPermission } from './entities/menu-permission.entity';
import { buildEmptyPermissions } from '../../common/constants/permissions';

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

  async create(enterpriseId: number, createDto: any) {
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

    return {
      message: 'Employee created successfully',
      data: savedEmployee,
    };
  }

  async update(id: number, enterpriseId: number, updateDto: any) {
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

    return this.findOne(id, enterpriseId);
  }

  async delete(id: number, enterpriseId: number) {
    const employee = await this.employeeRepository.findOne({
      where: { id, enterpriseId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    await this.permissionRepository.delete({ employeeId: id });
    await this.employeeRepository.delete(id);

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

    const saved = await this.permissionRepository.save(record);

    return {
      message: 'Permissions updated successfully',
      data: {
        permissions: saved.permissions || buildEmptyPermissions(),
        dataStartDate: saved.dataStartDate ?? null,
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
      },
    };
  }
}
