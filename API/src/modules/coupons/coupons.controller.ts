import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Coupons')
@ApiBearerAuth('JWT-auth')
@Controller('super-admin/coupons')
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @UseGuards(SuperAdminGuard)
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @UseGuards(SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.service.create(dto);
  }

  @UseGuards(SuperAdminGuard)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCouponDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(SuperAdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Public()
  @Post('validate')
  validate(@Body('couponCode') couponCode: string, @Body('amount') amount: number) {
    return this.service.validate(couponCode, amount);
  }
}
