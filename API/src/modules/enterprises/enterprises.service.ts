import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enterprise } from './entities/enterprise.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';

@Injectable()
export class EnterprisesService {
  constructor(
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
  ) {}

  async findOne(id: number) {
    const enterprise = await this.enterpriseRepository.findOne({
      where: { id },
    });

    if (!enterprise) {
      throw new NotFoundException('Enterprise not found');
    }

    return {
      message: 'Enterprise fetched successfully',
      data: enterprise,
    };
  }

  async update(id: number, updateDto: UpdateProfileDto) {
    const enterprise = await this.enterpriseRepository.findOne({
      where: { id },
    });

    if (!enterprise) {
      throw new NotFoundException('Enterprise not found');
    }

    // Only update fields that are provided
    if (updateDto.businessName !== undefined) enterprise.businessName = updateDto.businessName;
    if (updateDto.email !== undefined) enterprise.email = updateDto.email;
    if (updateDto.mobile !== undefined) enterprise.mobile = updateDto.mobile;
    if (updateDto.website !== undefined) enterprise.website = updateDto.website;
    if (updateDto.address !== undefined) enterprise.address = updateDto.address;
    if (updateDto.city !== undefined) enterprise.city = updateDto.city;
    if (updateDto.state !== undefined) enterprise.state = updateDto.state;
    if (updateDto.pincode !== undefined) enterprise.pincode = updateDto.pincode;
    if (updateDto.gstNumber !== undefined) enterprise.gstNumber = updateDto.gstNumber;
    if (updateDto.cinNumber !== undefined) enterprise.cinNumber = updateDto.cinNumber;
    if (updateDto.contactPerson !== undefined) enterprise.contactPerson = updateDto.contactPerson;

    await this.enterpriseRepository.save(enterprise);

    return {
      message: 'Enterprise profile updated successfully',
      data: enterprise,
    };
  }

  // Called by an authenticated enterprise whose status is
  // 'approved_pending_completion'. Saves the full business details and
  // promotes the enterprise to 'active'.
  async completeRegistration(id: number, dto: CompleteRegistrationDto) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id } });
    if (!enterprise) throw new NotFoundException('Enterprise not found');

    if (enterprise.status !== 'approved_pending_completion') {
      throw new BadRequestException(
        'Enterprise is not in a state to complete registration. Current status: ' + enterprise.status,
      );
    }

    enterprise.address = dto.businessAddress;
    enterprise.state = dto.businessState;
    enterprise.city = dto.businessCity;
    enterprise.pincode = dto.pincode;
    if (dto.gstNumber !== undefined) enterprise.gstNumber = dto.gstNumber;
    if (dto.cinNumber !== undefined) enterprise.cinNumber = dto.cinNumber;
    if (dto.contactPerson !== undefined) enterprise.contactPerson = dto.contactPerson;
    if (dto.website !== undefined) enterprise.website = dto.website;
    enterprise.status = 'active';

    await this.enterpriseRepository.save(enterprise);

    return {
      message: 'Registration completed. Welcome to VAB Enterprise.',
      data: enterprise,
    };
  }
}
