import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  CanActivate,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ResellerGuard extends AuthGuard('jwt') implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    const request = context.switchToHttp().getRequest();
    if (request.user?.type !== 'reseller') {
      throw new ForbiddenException('Access denied');
    }
    return true;
  }
}
