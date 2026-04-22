import { Controller, Get, Post, Patch, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { WastePartiesService } from './waste-parties.service';
import { RequirePermission, EnterpriseId } from '../../common/decorators';
import { CreateWastePartyDto, UpdateWastePartyDto, UpsertRateDto } from './dto/waste-party.dto';

@Controller('waste-parties')
export class WastePartiesController {
  constructor(private readonly svc: WastePartiesService) {}

  @Get('expiring-certs')
  @RequirePermission('waste_management', 'waste_parties', 'view')
  getExpiringCerts(@EnterpriseId() enterpriseId: number, @Query('days') days?: string) {
    return this.svc.getExpiringCerts(enterpriseId, days ? +days : 30);
  }

  @Get()
  @RequirePermission('waste_management', 'waste_parties', 'view')
  getAll(
    @EnterpriseId() enterpriseId: number,
    @Query('partyType') partyType?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.svc.getParties(enterpriseId, { partyType, status, search });
  }

  @Get(':id')
  @RequirePermission('waste_management', 'waste_parties', 'view')
  getOne(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getParty(id, enterpriseId);
  }

  @Post()
  @RequirePermission('waste_management', 'waste_parties', 'create')
  create(@EnterpriseId() enterpriseId: number, @Body() dto: CreateWastePartyDto) {
    return this.svc.createParty(enterpriseId, dto);
  }

  @Patch(':id')
  @RequirePermission('waste_management', 'waste_parties', 'edit')
  update(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpdateWastePartyDto) {
    return this.svc.updateParty(id, enterpriseId, dto);
  }

  @Delete(':id')
  @RequirePermission('waste_management', 'waste_parties', 'delete')
  delete(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deleteParty(id, enterpriseId);
  }

  @Get(':id/rates')
  @RequirePermission('waste_management', 'waste_parties', 'view')
  getRates(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.getRates(id, enterpriseId);
  }

  @Post(':id/rates')
  @RequirePermission('waste_management', 'waste_parties', 'edit')
  addRate(@Param('id', ParseIntPipe) id: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpsertRateDto) {
    return this.svc.addRate(id, enterpriseId, dto);
  }

  @Patch('rates/:rateId')
  @RequirePermission('waste_management', 'waste_parties', 'edit')
  updateRate(@Param('rateId', ParseIntPipe) rateId: number, @EnterpriseId() enterpriseId: number, @Body() dto: UpsertRateDto) {
    return this.svc.updateRate(rateId, enterpriseId, dto);
  }

  @Delete('rates/:rateId')
  @RequirePermission('waste_management', 'waste_parties', 'edit')
  deactivateRate(@Param('rateId', ParseIntPipe) rateId: number, @EnterpriseId() enterpriseId: number) {
    return this.svc.deactivateRate(rateId, enterpriseId);
  }
}
