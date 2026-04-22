import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { State } from './entities/state.entity';
import { City } from './entities/city.entity';
import { Pincode } from './entities/pincode.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(State)
    private stateRepository: Repository<State>,
    @InjectRepository(City)
    private cityRepository: Repository<City>,
    @InjectRepository(Pincode)
    private pincodeRepository: Repository<Pincode>,
  ) {}

  async getCountries() {
    const data = await this.countryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return { message: 'Countries fetched successfully', data };
  }

  async getStates(countryId: number) {
    const data = await this.stateRepository.find({
      where: { countryId, isActive: true },
      order: { name: 'ASC' },
    });
    return { message: 'States fetched successfully', data };
  }

  async getCities(stateId: number) {
    const data = await this.cityRepository.find({
      where: { stateId, isActive: true },
      order: { name: 'ASC' },
    });
    return { message: 'Cities fetched successfully', data };
  }

  async getPincodes(cityId: number) {
    const data = await this.pincodeRepository.find({
      where: { cityId, isActive: true },
      order: { code: 'ASC' },
    });
    return { message: 'Pincodes fetched successfully', data };
  }

  async createPincode(cityId: number, code: string) {
    const trimmed = (code ?? '').trim();
    if (!/^[0-9]{4,10}$/.test(trimmed)) {
      return { message: 'Invalid pincode', data: null };
    }
    const existing = await this.pincodeRepository.findOne({
      where: { cityId, code: trimmed },
    });
    if (existing) {
      return { message: 'Pincode already exists', data: existing };
    }
    const saved = await this.pincodeRepository.save(
      this.pincodeRepository.create({ cityId, code: trimmed, isActive: true }),
    );
    return { message: 'Pincode created', data: saved };
  }
}
