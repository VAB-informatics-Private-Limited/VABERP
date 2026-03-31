import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const OwnDataOnly = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().ownDataOnly ?? false;
});

export const CurrentUserId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().currentUserId ?? null;
});
