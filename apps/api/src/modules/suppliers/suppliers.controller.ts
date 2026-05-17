import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuppliersService, SupplierDto } from './suppliers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Get()
  @Roles('owner', 'manager', 'inventory_staff')
  list(
    @Query('storeId') storeId: string,
    @Query('includeInactive') includeInactive: string,
    @Query('q') q: string,
  ) {
    return this.suppliers.list(
      storeId || 'default-store',
      includeInactive === 'true',
      q || '',
    );
  }

  @Post()
  @Roles('owner', 'manager')
  create(@Body() body: SupplierDto) {
    if (!body?.name?.trim()) {
      throw new HttpException(
        { status: 'error', message: 'name is required' },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.suppliers.create(body);
  }

  @Patch(':id')
  @Roles('owner', 'manager')
  update(@Param('id') idParam: string, @Body() body: Partial<SupplierDto>) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    return this.suppliers.update(id, body);
  }

  @Delete(':id')
  @Roles('owner', 'manager')
  deactivate(@Param('id') idParam: string) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) {
      throw new HttpException({ status: 'invalid_id' }, HttpStatus.BAD_REQUEST);
    }
    return this.suppliers.deactivate(id);
  }
}
