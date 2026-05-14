import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — marks a route as publicly accessible (no auth required).
 *
 * Usage:
 *   @Public()
 *   @Get('health')
 *   health() {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
