import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceMaster } from './entities/service-master.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesMasterService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(ServiceMaster)
    private repo: Repository<ServiceMaster>,
  ) {}

  async onApplicationBootstrap() {
    await this.repo.manager.query(`
      CREATE TABLE IF NOT EXISTS services_master (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'active',
        created_date TIMESTAMP NOT NULL DEFAULT now(),
        updated_date TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await this.repo.manager.query(`
      CREATE TABLE IF NOT EXISTS plan_services (
        id SERIAL PRIMARY KEY,
        plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
        service_id INTEGER NOT NULL REFERENCES services_master(id) ON DELETE CASCADE,
        UNIQUE(plan_id, service_id)
      )
    `);
  }

  async findAll() {
    const services = await this.repo.find({ order: { serviceName: 'ASC' } });
    return { message: 'Services fetched', data: services };
  }

  async findAllActive() {
    return this.repo.find({ where: { status: 'active' }, order: { serviceName: 'ASC' } });
  }

  async create(dto: CreateServiceDto) {
    const service = this.repo.create({ serviceName: dto.serviceName, status: dto.status ?? 'active' });
    await this.repo.save(service);
    return { message: 'Service created', data: service };
  }

  async update(id: number, dto: UpdateServiceDto) {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    await this.repo.update(id, dto);
    return { message: 'Service updated' };
  }

  async remove(id: number) {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');

    const [{ count }]: [{ count: string }] = await this.repo.manager.query(
      `SELECT COUNT(*) as count FROM plan_services WHERE service_id = $1`,
      [id],
    );
    if (parseInt(count, 10) > 0) {
      throw new BadRequestException('Cannot delete: service is linked to one or more plans');
    }

    await this.repo.delete(id);
    return { message: 'Service deleted' };
  }
}
