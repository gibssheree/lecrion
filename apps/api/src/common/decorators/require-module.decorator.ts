import { SetMetadata } from '@nestjs/common';
import { PlatformModuleValue } from '@libs/contracts/src/modules';

export const REQUIRED_MODULES_KEY = 'required_modules';

export const RequireModule = (...modules: PlatformModuleValue[]) =>
  SetMetadata(REQUIRED_MODULES_KEY, modules);
