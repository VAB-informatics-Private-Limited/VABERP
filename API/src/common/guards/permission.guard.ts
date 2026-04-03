import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSION_KEY, PermissionMeta } from '../decorators/require-permission.decorator';
import { ENTERPRISE_ONLY_KEY } from '../decorators/require-enterprise.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MenuPermission } from '../../modules/employees/entities/menu-permission.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(MenuPermission)
    private permissionRepository: Repository<MenuPermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // Skip if no permission metadata
    const required = this.reflector.getAllAndOverride<PermissionMeta>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user yet — let JwtAuthGuard handle authentication
    if (!user) return true;

    // Enterprise users have full access
    if (user.type === 'enterprise') return true;

    // Block employees from enterprise-only routes
    const enterpriseOnly = this.reflector.getAllAndOverride<boolean>(ENTERPRISE_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (enterpriseOnly && user.type === 'employee') {
      throw new ForbiddenException('This action requires enterprise administrator access');
    }

    if (!required) return true;

    // Employee users — check granular permission
    if (user.type === 'employee') {
      const record = await this.permissionRepository.findOne({
        where: { employeeId: user.id },
      });

      if (!record) {
        throw new ForbiddenException('No permissions assigned');
      }

      // Attach data start date and own-data flag to request so service layers can filter records
      request.dataStartDate = record.dataStartDate ?? null;
      request.ownDataOnly = record.ownDataOnly ?? false;
      request.currentUserId = user.id;
      // Attach full permissions to user so service layers can determine scope
      request.user.permissions = record.permissions ?? {};

      const { module, submodule, action } = required;
      let allowed: boolean;

      if (submodule) {
        // Granular 3-arg check: specific submodule
        allowed = record.permissions?.[module]?.[submodule]?.[action] === 1;
      } else {
        // Legacy 2-arg check: any submodule in the module has the action
        const modulePerms = record.permissions?.[module];
        allowed = !!modulePerms && Object.values(modulePerms).some(
          (sub: any) => sub[action] === 1,
        );
      }

      if (!allowed) {
        throw new ForbiddenException(
          submodule
            ? `You do not have ${action} permission for ${module}.${submodule}`
            : `You do not have ${action} permission for ${module}`,
        );
      }

      return true;
    }

    return false;
  }
}
