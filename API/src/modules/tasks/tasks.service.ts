import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Task } from './entities/task.entity';
import { TaskComment } from './entities/task-comment.entity';
import { Employee } from '../employees/entities/employee.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { CreateTaskDto, UpdateTaskStatusDto, CreateCommentDto } from './dto';
import { PermissionsJson } from '../../common/constants/permissions';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskComment)
    private commentRepository: Repository<TaskComment>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
  ) {}

  async getEmployees(enterpriseId: number) {
    const employees = await this.employeeRepository.find({
      where: { enterpriseId },
      select: ['id', 'firstName', 'lastName'],
      order: { firstName: 'ASC' },
    });
    return {
      message: 'Employees fetched',
      data: employees.map(e => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
      })),
    };
  }

  private async isUnrestricted(enterpriseId: number): Promise<boolean> {
    const ent = await this.enterpriseRepository.findOne({
      where: { id: enterpriseId },
      select: ['taskVisibilityUnrestricted'],
    });
    return ent?.taskVisibilityUnrestricted ?? false;
  }

  private getScope(
    permissions: PermissionsJson,
    unrestricted: boolean,
    isReportingHead?: boolean,
  ): 'admin' | 'manager' | 'member' {
    if (unrestricted) return 'admin';
    if (permissions?.tasks?.settings?.edit === 1) return 'admin';
    if (permissions?.tasks?.assignments?.create === 1) return 'manager';
    if (isReportingHead) return 'manager';
    return 'member';
  }

  async findAll(
    enterpriseId: number,
    currentUserId: number,
    permissions: PermissionsJson,
    page = 1,
    limit = 20,
    search?: string,
    status?: string,
    priority?: string,
    assignedTo?: number,
    isReportingHead?: boolean,
  ) {
    const unrestricted = await this.isUnrestricted(enterpriseId);
    const scope = this.getScope(permissions, unrestricted, isReportingHead);

    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignedEmployee', 'assignee')
      .leftJoin('task.createdByEmployee', 'creator')
      .where('task.enterpriseId = :enterpriseId', { enterpriseId })
      .select([
        'task.id', 'task.taskNumber', 'task.title', 'task.priority',
        'task.status', 'task.dueDate', 'task.assignedTo', 'task.createdBy',
        'task.module', 'task.completedAt', 'task.createdDate', 'task.modifiedDate',
        'assignee.id', 'assignee.firstName', 'assignee.lastName',
        'creator.id', 'creator.firstName', 'creator.lastName',
      ]);

    if (scope === 'manager') {
      query.andWhere(
        '(task.assignedTo = :uid OR task.assignedTo IN ' +
        '(SELECT id FROM employees WHERE reporting_to = :uid AND enterprise_id = :enterpriseId))',
        { uid: currentUserId, enterpriseId },
      );
    } else if (scope === 'member') {
      query.andWhere('task.assignedTo = :uid', { uid: currentUserId });
    }

    if (search) {
      query.andWhere('task.title ILIKE :search', { search: `%${search}%` });
    }
    if (status) {
      query.andWhere('task.status = :status', { status });
    }
    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }
    if (assignedTo && scope === 'admin') {
      query.andWhere('task.assignedTo = :assignedTo', { assignedTo });
    }

    const total = await query.getCount();
    const items = await query
      .orderBy('task.createdDate', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      message: 'Tasks fetched successfully',
      data: items.map(t => this.mapTask(t)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number, enterpriseId: number) {
    const task = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignedEmployee', 'assignee')
      .leftJoin('task.createdByEmployee', 'creator')
      .leftJoin('task.assignedByEmployee', 'assigner')
      .where('task.id = :id AND task.enterpriseId = :enterpriseId', { id, enterpriseId })
      .select([
        'task', 'assignee.id', 'assignee.firstName', 'assignee.lastName',
        'creator.id', 'creator.firstName', 'creator.lastName',
        'assigner.id', 'assigner.firstName', 'assigner.lastName',
      ])
      .getOne();

    if (!task) throw new NotFoundException('Task not found');
    return { message: 'Task fetched successfully', data: this.mapTask(task) };
  }

  async create(enterpriseId: number, dto: CreateTaskDto, currentUserId: number) {
    const count = await this.taskRepository.count({ where: { enterpriseId } });
    const taskNumber = `TASK-${String(count + 1).padStart(6, '0')}`;

    const task = this.taskRepository.create({
      enterpriseId,
      taskNumber,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || 'medium',
      status: 'pending',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      assignedTo: dto.assignedTo ?? null,
      assignedBy: dto.assignedTo ? currentUserId : null,
      createdBy: currentUserId,
      module: dto.module ?? null,
      relatedEntityType: dto.relatedEntityType ?? null,
      relatedEntityId: dto.relatedEntityId ?? null,
    } as DeepPartial<Task>);

    const saved = await this.taskRepository.save(task) as Task;
    return { message: 'Task created successfully', data: { id: saved.id, taskNumber } };
  }

  async update(id: number, enterpriseId: number, dto: Partial<CreateTaskDto>) {
    const task = await this.taskRepository.findOne({ where: { id, enterpriseId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.taskRepository.update(id, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
      ...(dto.module !== undefined && { module: dto.module }),
    });

    return { message: 'Task updated successfully', data: null };
  }

  async updateStatus(
    id: number,
    enterpriseId: number,
    dto: UpdateTaskStatusDto,
    currentUserId: number,
  ) {
    const task = await this.taskRepository.findOne({ where: { id, enterpriseId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.taskRepository.update(id, {
      status: dto.status,
      completedAt: dto.status === 'completed' ? new Date() : null,
    });

    return { message: 'Task status updated', data: null };
  }

  async assign(id: number, enterpriseId: number, assignedTo: number, currentUserId: number, permissions: PermissionsJson) {
    const unrestricted = await this.isUnrestricted(enterpriseId);
    const scope = this.getScope(permissions, unrestricted);

    if (scope === 'member') {
      throw new ForbiddenException('You do not have permission to assign tasks');
    }

    if (scope === 'manager') {
      const target = await this.employeeRepository.findOne({
        where: { id: assignedTo, enterpriseId },
        select: ['id', 'reportingTo'],
      });
      if (!target) throw new NotFoundException('Employee not found');
      if (target.reportingTo !== currentUserId) {
        throw new ForbiddenException('You can only assign tasks to members of your team');
      }
    }

    const task = await this.taskRepository.findOne({ where: { id, enterpriseId } });
    if (!task) throw new NotFoundException('Task not found');

    await this.taskRepository.update(id, { assignedTo, assignedBy: currentUserId });
    return { message: 'Task assigned successfully', data: null };
  }

  async delete(id: number, enterpriseId: number) {
    const task = await this.taskRepository.findOne({ where: { id, enterpriseId } });
    if (!task) throw new NotFoundException('Task not found');
    await this.taskRepository.delete(id);
    return { message: 'Task deleted successfully', data: null };
  }

  async getComments(taskId: number, enterpriseId: number) {
    const comments = await this.commentRepository
      .createQueryBuilder('c')
      .leftJoin('c.createdByEmployee', 'emp')
      .where('c.taskId = :taskId AND c.enterpriseId = :enterpriseId', { taskId, enterpriseId })
      .select(['c.id', 'c.comment', 'c.createdBy', 'c.createdDate', 'emp.firstName', 'emp.lastName'])
      .orderBy('c.createdDate', 'ASC')
      .getMany();

    return {
      message: 'Comments fetched successfully',
      data: comments.map(c => ({
        id: c.id,
        task_id: taskId,
        comment: c.comment,
        created_by: c.createdBy,
        created_by_name: c.createdByEmployee
          ? `${c.createdByEmployee.firstName} ${c.createdByEmployee.lastName}`
          : null,
        created_date: c.createdDate,
      })),
    };
  }

  async addComment(taskId: number, enterpriseId: number, dto: CreateCommentDto, currentUserId: number) {
    const task = await this.taskRepository.findOne({ where: { id: taskId, enterpriseId } });
    if (!task) throw new NotFoundException('Task not found');

    const comment = this.commentRepository.create({
      enterpriseId,
      taskId,
      comment: dto.comment,
      createdBy: currentUserId,
    });
    await this.commentRepository.save(comment);
    return { message: 'Comment added', data: null };
  }

  async getStats(enterpriseId: number, currentUserId: number, permissions: PermissionsJson, isReportingHead?: boolean) {
    const unrestricted = await this.isUnrestricted(enterpriseId);
    const scope = this.getScope(permissions, unrestricted, isReportingHead);

    const query = this.taskRepository
      .createQueryBuilder('task')
      .where('task.enterpriseId = :enterpriseId', { enterpriseId });

    if (scope === 'manager') {
      query.andWhere(
        '(task.assignedTo = :uid OR task.assignedTo IN ' +
        '(SELECT id FROM employees WHERE reporting_to = :uid AND enterprise_id = :enterpriseId))',
        { uid: currentUserId, enterpriseId },
      );
    } else if (scope === 'member') {
      query.andWhere('task.assignedTo = :uid', { uid: currentUserId });
    }

    const all = await query.select(['task.status', 'task.dueDate']).getMany();
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return {
      message: 'Stats fetched successfully',
      data: {
        total: all.length,
        pending: all.filter(t => t.status === 'pending').length,
        in_progress: all.filter(t => t.status === 'in_progress').length,
        completed: all.filter(t => t.status === 'completed').length,
        overdue: all.filter(t =>
          t.dueDate && new Date(t.dueDate) < today &&
          t.status !== 'completed' && t.status !== 'cancelled'
        ).length,
      },
    };
  }

  private mapTask(t: Task) {
    return {
      id: t.id,
      task_number: t.taskNumber,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      due_date: t.dueDate,
      assigned_to: t.assignedTo,
      assigned_to_name: t.assignedEmployee
        ? `${t.assignedEmployee.firstName} ${t.assignedEmployee.lastName}`
        : null,
      assigned_by: t.assignedBy,
      created_by: t.createdBy,
      created_by_name: t.createdByEmployee
        ? `${t.createdByEmployee.firstName} ${t.createdByEmployee.lastName}`
        : null,
      module: t.module,
      related_entity_type: t.relatedEntityType,
      related_entity_id: t.relatedEntityId,
      completed_at: t.completedAt,
      created_date: t.createdDate,
      modified_date: t.modifiedDate,
    };
  }
}
