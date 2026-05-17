import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlatformModuleValue } from '@libs/contracts/src/modules';
import { REQUIRED_MODULES_KEY } from '../decorators/require-module.decorator';
import { StoresService } from '../../modules/stores/stores.service';

@Injectable()
export class ModuleCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly stores: StoresService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModules = this.reflector.getAllAndOverride<
      PlatformModuleValue[]
    >(REQUIRED_MODULES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredModules || requiredModules.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const storeId = req.storeId ?? req.user?.storeId ?? 'default-store';
    const capabilities = await this.stores.getCapabilities(storeId);
    const enabled = new Set(capabilities.enabledModules);
    const missing = requiredModules.filter((key) => !enabled.has(key));

    if (missing.length > 0) {
      throw new ForbiddenException(
        `Module not enabled for store '${storeId}': ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
