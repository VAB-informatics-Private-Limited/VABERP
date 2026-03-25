import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from './entities/country.entity';
import { State } from './entities/state.entity';
import { City } from './entities/city.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Country)
    private countryRepository: Repository<Country>,
    @InjectRepository(State)
    private stateRepository: Repository<State>,
    @InjectRepository(City)
    private cityRepository: Repository<City>,
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
}
