import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { Public } from '../../common/decorators';

@ApiTags('Locations')
@Controller('locations')
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Get('countries')
  @Public()
  @ApiOperation({ summary: 'Get all active countries' })
  async getCountries() {
    return this.service.getCountries();
  }

  @Get('states/:countryId')
  @Public()
  @ApiOperation({ summary: 'Get states for a country' })
  async getStates(@Param('countryId', ParseIntPipe) countryId: number) {
    return this.service.getStates(countryId);
  }

  @Get('cities/:stateId')
  @Public()
  @ApiOperation({ summary: 'Get cities for a state' })
  async getCities(@Param('stateId', ParseIntPipe) stateId: number) {
    return this.service.getCities(stateId);
  }
}
