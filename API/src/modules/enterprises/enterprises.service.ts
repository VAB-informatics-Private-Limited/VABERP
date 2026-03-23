import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enterprise } from './entities/enterprise.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

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
}
