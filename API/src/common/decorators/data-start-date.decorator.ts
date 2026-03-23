import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const DataStartDate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Date | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.dataStartDate ?? null;
  },
);
