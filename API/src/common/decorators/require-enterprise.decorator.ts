import { SetMetadata } from '@nestjs/common';
export const ENTERPRISE_ONLY_KEY = 'enterpriseOnly';
export const RequireEnterprise = () => SetMetadata(ENTERPRISE_ONLY_KEY, true);
