import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnterprisesService } from './enterprises.service';
import { EnterpriseId } from '../../common/decorators';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Enterprises')
@Controller('enterprises')
@ApiBearerAuth('JWT-auth')
export class EnterprisesController {
  constructor(private readonly enterprisesService: EnterprisesService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get enterprise profile' })
  async getProfile(@EnterpriseId() enterpriseId: number) {
    return this.enterprisesService.findOne(enterpriseId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update enterprise profile' })
  async updateProfile(
    @EnterpriseId() enterpriseId: number,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.enterprisesService.update(enterpriseId, updateDto);
  }
}
