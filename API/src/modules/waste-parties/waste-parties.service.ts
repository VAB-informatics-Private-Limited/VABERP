import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { WasteParty } from './entities/waste-party.entity';
import { WastePartyRate } from './entities/waste-party-rate.entity';

@Injectable()
export class WastePartiesService {
  constructor(
    @InjectRepository(WasteParty) private partyRepo: Repository<WasteParty>,
    @InjectRepository(WastePartyRate) private rateRepo: Repository<WastePartyRate>,
  ) {}

  async getParties(enterpriseId: number, filters: any = {}) {
    const q = this.partyRepo.createQueryBuilder('p')
      .where('p.enterpriseId = :enterpriseId', { enterpriseId });

    if (filters.partyType) q.andWhere('p.partyType = :type', { type: filters.partyType });
    if (filters.status) q.andWhere('p.status = :status', { status: filters.status });
    if (filters.search) q.andWhere('(p.companyName ILIKE :s OR p.partyCode ILIKE :s)', { s: `%${filters.search}%` });

    const data = await q.orderBy('p.companyName', 'ASC').getMany();
    return { message: 'Parties fetched', data, totalRecords: data.length };
  }

  async getParty(id: number, enterpriseId: number) {
    const party = await this.partyRepo.findOne({
      where: { id, enterpriseId },
      relations: ['rates', 'rates.category'],
    });
    if (!party) throw new NotFoundException('Party not found');
    return { message: 'Party fetched', data: party };
  }

  async createParty(enterpriseId: number, dto: any) {
    const existing = await this.partyRepo.findOne({ where: { enterpriseId, partyCode: dto.partyCode } });
    if (existing) throw new ConflictException(`Party code '${dto.partyCode}' already exists`);
    const party = this.partyRepo.create({ ...dto, enterpriseId });
    return { message: 'Party created', data: await this.partyRepo.save(party) };
  }

  async updateParty(id: number, enterpriseId: number, dto: any) {
    const party = await this.partyRepo.findOne({ where: { id, enterpriseId } });
    if (!party) throw new NotFoundException('Party not found');
    Object.assign(party, dto);
    return { message: 'Party updated', data: await this.partyRepo.save(party) };
  }

  async deleteParty(id: number, enterpriseId: number) {
    const party = await this.partyRepo.findOne({ where: { id, enterpriseId } });
    if (!party) throw new NotFoundException('Party not found');
    party.status = 'inactive';
    await this.partyRepo.save(party);
    return { message: 'Party deactivated' };
  }

  async getRates(partyId: number, enterpriseId: number) {
    const party = await this.partyRepo.findOne({ where: { id: partyId, enterpriseId } });
    if (!party) throw new NotFoundException('Party not found');
    const data = await this.rateRepo.find({
      where: { partyId },
      relations: ['category'],
      order: { effectiveFrom: 'DESC' },
    });
    return { message: 'Rates fetched', data };
  }

  async addRate(partyId: number, enterpriseId: number, dto: any) {
    const party = await this.partyRepo.findOne({ where: { id: partyId, enterpriseId } });
    if (!party) throw new NotFoundException('Party not found');
    const rate = this.rateRepo.create({ ...dto, partyId });
    return { message: 'Rate added', data: await this.rateRepo.save(rate) };
  }

  async updateRate(rateId: number, enterpriseId: number, dto: any) {
    const rate = await this.rateRepo
      .createQueryBuilder('r')
      .innerJoin('r.party', 'p')
      .where('r.id = :rateId AND p.enterpriseId = :enterpriseId', { rateId, enterpriseId })
      .getOne();
    if (!rate) throw new NotFoundException('Rate not found');
    Object.assign(rate, dto);
    return { message: 'Rate updated', data: await this.rateRepo.save(rate) };
  }

  async deactivateRate(rateId: number, enterpriseId: number) {
    const rate = await this.rateRepo
      .createQueryBuilder('r')
      .innerJoin('r.party', 'p')
      .where('r.id = :rateId AND p.enterpriseId = :enterpriseId', { rateId, enterpriseId })
      .getOne();
    if (!rate) throw new NotFoundException('Rate not found');
    rate.effectiveTo = new Date();
    await this.rateRepo.save(rate);
    return { message: 'Rate deactivated' };
  }

  async getExpiringCerts(enterpriseId: number, days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    const data = await this.partyRepo
      .createQueryBuilder('p')
      .where('p.enterpriseId = :enterpriseId', { enterpriseId })
      .andWhere('p.handlesHazardous = TRUE')
      .andWhere('p.certExpiryDate IS NOT NULL')
      .andWhere('p.certExpiryDate <= :future', { future: future.toISOString().split('T')[0] })
      .andWhere("p.status = 'active'")
      .orderBy('p.certExpiryDate', 'ASC')
      .getMany();
    return { message: 'Expiring certs fetched', data };
  }

  async getRateForPartyCategory(partyId: number, categoryId: number, rateType: string): Promise<number | null> {
    const rate = await this.rateRepo
      .createQueryBuilder('r')
      .where('r.partyId = :partyId AND r.categoryId = :categoryId AND r.rateType = :rateType', { partyId, categoryId, rateType })
      .andWhere('r.effectiveFrom <= CURRENT_DATE')
      .andWhere('(r.effectiveTo IS NULL OR r.effectiveTo >= CURRENT_DATE)')
      .orderBy('r.effectiveFrom', 'DESC')
      .getOne();
    return rate ? Number(rate.rate) : null;
  }
}
