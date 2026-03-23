import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

export interface PermissionMeta {
  module: string;
  submodule: string | null;
  action: string;
}

// Supports both 2-arg legacy form: (module, action)
// and 3-arg granular form: (module, submodule, action)
export const RequirePermission = (module: string, submoduleOrAction: string, action?: string) =>
  SetMetadata(PERMISSION_KEY, {
    module,
    submodule: action !== undefined ? submoduleOrAction : null,
    action: action !== undefined ? action : submoduleOrAction,
  } as PermissionMeta);
