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
import { StoreId } from '../../common/decorators/store-id.decorator';
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
    @StoreId() storeId: string,
    @Query('includeInactive') includeInactive: string,
  ) {
    return this.accommodation.listRoomTypes(
      storeId,
      includeInactive === 'true',
    );
  }

  @Post('room-types')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  createRoomType(@Body() body: CreateRoomTypeDto, @StoreId() storeId: string) {
    return this.accommodation.createRoomType(body, storeId);
  }

  @Patch('room-types/:id')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  updateRoomType(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomTypeDto,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.updateRoomType(id, body, storeId);
  }

  @Get('rooms')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  listRooms(@StoreId() storeId: string, @Query('status') status: string) {
    return this.accommodation.listRooms(storeId, status);
  }

  @Post('rooms')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  createRoom(@Body() body: CreateRoomDto, @StoreId() storeId: string) {
    return this.accommodation.createRoom(body, storeId);
  }

  @Patch('rooms/:id')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomDto,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.updateRoom(id, body, storeId);
  }

  @Patch('rooms/:id/status')
  @RequireModule(PlatformModule.ACCOMMODATION_ROOMS)
  setRoomStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.setRoomStatus(id, status, storeId);
  }

  @Get('availability')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  availability(
    @StoreId() storeId: string,
    @Query('roomTypeId', ParseIntPipe) roomTypeId: number,
    @Query('checkInDate') checkInDate: string,
    @Query('checkOutDate') checkOutDate: string,
  ) {
    return this.accommodation.availability(
      storeId,
      roomTypeId,
      checkInDate,
      checkOutDate,
    );
  }

  @Get('reservations')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  listReservations(
    @StoreId() storeId: string,
    @Query('status') status: string,
  ) {
    return this.accommodation.listReservations(storeId, status);
  }

  @Post('reservations')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  createReservation(
    @Body() body: CreateReservationDto,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.createReservation(body, storeId);
  }

  @Post('reservations/:id/assign-room')
  @RequireModule(PlatformModule.ACCOMMODATION_RESERVATIONS)
  assignRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body('roomId', ParseIntPipe) roomId: number,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.assignRoom(id, roomId, storeId);
  }

  @Post('check-ins')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  checkIn(@Body() body: CheckInDto, @StoreId() storeId: string) {
    return this.accommodation.checkIn(body, storeId);
  }

  @Get('stays/:id')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  getStay(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.getStay(id, storeId);
  }

  @Post('stays/:id/check-out')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  checkOut(
    @Param('id', ParseIntPipe) id: number,
    @StoreId() storeId: string,
    @Body('checkedOutBy') checkedOutBy?: string,
  ) {
    return this.accommodation.checkOut(id, storeId, checkedOutBy);
  }

  @Get('folios')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  listFolios(@StoreId() storeId: string, @Query('status') status: string) {
    return this.accommodation.listFolios(storeId, status);
  }

  @Post('folios/:id/charges')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  postCharge(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PostChargeDto,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.postCharge(id, body, storeId);
  }

  @Post('folios/:id/payments')
  @RequireModule(PlatformModule.ACCOMMODATION_CHECKIN)
  postPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: PostFolioPaymentDto,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.postPayment(id, body, storeId);
  }

  @Get('housekeeping/tasks')
  @RequireModule(PlatformModule.ACCOMMODATION_HOUSEKEEPING)
  listHousekeeping(
    @StoreId() storeId: string,
    @Query('status') status: string,
  ) {
    return this.accommodation.listHousekeeping(storeId, status);
  }

  @Patch('housekeeping/tasks/:id/status')
  @RequireModule(PlatformModule.ACCOMMODATION_HOUSEKEEPING)
  updateHousekeeping(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('assignedTo') assignedTo: string,
    @StoreId() storeId: string,
  ) {
    return this.accommodation.updateHousekeeping(
      id,
      status,
      storeId,
      assignedTo,
    );
  }
}
