import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformModule } from '@libs/contracts/src/modules';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { ModuleCapabilityGuard } from '../../common/guards/module-capability.guard';
import { AccommodationService } from './accommodation.service';
import {
  CheckInDto,
  CreateReservationDto,
  CreateRoomDto,
  CreateRoomTypeDto,
  UpdateRoomDto,
  UpdateRoomTypeDto,
  PostChargeDto,
  PostFolioPaymentDto,
} from './accommodation.types';

@Controller('accommodation')
@UseGuards(ModuleCapabilityGuard)
export class AccommodationController {
  constructor(private readonly accommodation: AccommodationService) {}

  @Get('room-types')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  listRoomTypes(
    @Query('storeId') storeId: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    return this.accommodation.listRoomTypes(
      storeId || 'default-store',
      includeInactive === 'true',
    );
  }

  @Post('room-types')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  createRoomType(@Body() body: CreateRoomTypeDto) {
    return this.accommodation.createRoomType(body);
  }

  @Patch('room-types/:id')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  updateRoomType(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRoomTypeDto, @Query('storeId') storeId: string) {
    return this.accommodation.updateRoomType(id, body, storeId || 'default-store');
  }

  @Get('rooms')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  listRooms(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
  ) {
    return this.accommodation.listRooms(storeId || 'default-store', status);
  }

  @Post('rooms')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  createRoom(@Body() body: CreateRoomDto) {
    return this.accommodation.createRoom(body);
  }

  @Patch('rooms/:id')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  updateRoom(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRoomDto, @Query('storeId') storeId: string) {
    return this.accommodation.updateRoom(id, body, storeId || 'default-store');
  }

  @Patch('rooms/:id/status')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  setRoomStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Query('storeId') storeId: string,
  ) {
    return this.accommodation.setRoomStatus(
      id,
      status,
      storeId || 'default-store',
    );
  }

  @Get('availability')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  availability(
    @Query('storeId') storeId: string,
    @Query('roomTypeId', ParseIntPipe) roomTypeId: number,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.accommodation.availability(
      storeId || 'default-store',
      roomTypeId,
      checkInDate,
      checkOutDate,
    );
  }

  @Get('reservations')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  listReservations(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
  ) {
    return this.accommodation.listReservations(
      storeId || 'default-store',
      status,
    );
  }

  @Post('reservations')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  createReservation(@Body() body: CreateReservationDto) {
    return this.accommodation.createReservation(body);
  }

  @Post('reservations/:id/assign-room')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  assignRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body('roomId', ParseIntPipe) roomId: number,
    @Query('storeId') storeId: string,
  ) {
    return this.accommodation.assignRoom(
      id,
      roomId,
      storeId || 'default-store',
    );
  }

  @Post('check-ins')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  checkIn(@Body() body: CheckInDto) {
    return this.accommodation.checkIn(body);
  }

  @Get('stays/:id')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  getStay(
    @Param('id', ParseIntPipe) id: number,
    @Query('storeId') storeId: string,
  ) {
    return this.accommodation.getStay(id, storeId || 'default-store');
  }

  @Post('stays/:id/check-out')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  checkOut(
    @Param('id', ParseIntPipe) id: number,
    @Query('storeId') storeId: string,
    @Body('checkedOutBy') checkedOutBy?: string,
  ) {
    return this.accommodation.checkOut(
      id,
      storeId || 'default-store',
      checkedOutBy,
    );
  }

  @Get('folios')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  listFolios(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
  ) {
    return this.accommodation.listFolios(storeId || 'default-store', status);
  }

  @Post('folios/:id/charges')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  postCharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PostChargeDto,
    @Query('storeId') storeId: string,
  ) {
    return this.accommodation.postCharge(id, body, storeId || 'default-store');
  }

  @Post('folios/:id/payments')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  postPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PostFolioPaymentDto,
    @Query('storeId') storeId: string,
  ) {
    return this.accommodation.postPayment(id, body, storeId || 'default-store');
  }

  @Get('housekeeping/tasks')
  @RequireModule(PlatformModule.ACCOMMODATION_HOUSEKEEPING)
  listHousekeeping(
    @Query('storeId') storeId: string,
    @Query('status') status: string,
  ) {
    return this.accommodation.listHousekeeping(
      storeId || 'default-store',
      status,
    );
  }

  @Patch('housekeeping/tasks/:id/status')
  @RequireModule(PlatformModule.ACCOMMODATION_HOUSEKEEPING)
  updateHousekeeping(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('assignedTo') assignedTo: string,
    @Query('storeId') storeId: string,
  ) {
    return this.accommodation.updateHousekeeping(
      id,
      status,
      storeId || 'default-store',
      assignedTo,
    );
  }
}
