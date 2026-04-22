import { Controller, Get, Post, Body, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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

  @Get('pincodes/:cityId')
  @Public()
  @ApiOperation({ summary: 'Get pincodes for a city' })
  async getPincodes(@Param('cityId', ParseIntPipe) cityId: number) {
    return this.service.getPincodes(cityId);
  }

  @Post('pincodes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a pincode for a city (requires authenticated session)' })
  async createPincode(@Body() body: { cityId: number; code: string }) {
    if (!body || !Number.isInteger(Number(body.cityId)) || !body.code || typeof body.code !== 'string') {
      throw new BadRequestException('cityId (number) and code (string) are required');
    }
    const code = String(body.code).trim();
    if (!/^[A-Za-z0-9 \-]{3,10}$/.test(code)) {
      throw new BadRequestException('Invalid pincode format');
    }
    return this.service.createPincode(Number(body.cityId), code);
  }
}
