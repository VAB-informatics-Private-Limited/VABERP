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
    // Defense-in-depth: if route accepts a resellerId param/body, enforce it matches the JWT subject.
    const userId = Number(request.user.id);
    const paramResellerId =
      request.params?.resellerId ?? request.body?.resellerId;
    if (paramResellerId !== undefined && paramResellerId !== null) {
      const requested = Number(paramResellerId);
      if (Number.isFinite(requested) && requested !== userId) {
        throw new ForbiddenException('Access denied: reseller scope mismatch');
      }
    }
    return true;
  }
}
