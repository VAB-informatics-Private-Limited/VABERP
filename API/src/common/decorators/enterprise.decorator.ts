import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const EnterpriseId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.enterpriseId;
  },
);
