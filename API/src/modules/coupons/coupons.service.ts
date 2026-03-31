import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Coupon)
    private repo: Repository<Coupon>,
  ) {}

  async onApplicationBootstrap() {
    await this.repo.manager.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id SERIAL PRIMARY KEY,
        coupon_code VARCHAR NOT NULL UNIQUE,
        discount_type VARCHAR NOT NULL DEFAULT 'flat',
        discount_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        expiry_date DATE NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'active',
        max_uses INTEGER NOT NULL DEFAULT 0,
        used_count INTEGER NOT NULL DEFAULT 0,
        created_date TIMESTAMP NOT NULL DEFAULT now(),
        updated_date TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
  }

  async findAll() {
    const coupons = await this.repo.find({ order: { createdDate: 'DESC' } });
    return { message: 'Coupons fetched', data: coupons };
  }

  async create(dto: CreateCouponDto) {
    const existing = await this.repo.findOne({ where: { couponCode: dto.couponCode } });
    if (existing) throw new BadRequestException('Coupon code already exists');

    const coupon = this.repo.create({
      couponCode: dto.couponCode.toUpperCase(),
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      expiryDate: new Date(dto.expiryDate),
      status: dto.status ?? 'active',
      maxUses: dto.maxUses ?? 0,
      usedCount: 0,
    });
    await this.repo.save(coupon);
    return { message: 'Coupon created', data: coupon };
  }

  async update(id: number, dto: UpdateCouponDto) {
    const coupon = await this.repo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    const update: Partial<Coupon> = {};
    if (dto.discountType !== undefined) update.discountType = dto.discountType;
    if (dto.discountValue !== undefined) update.discountValue = dto.discountValue;
    if (dto.expiryDate !== undefined) update.expiryDate = new Date(dto.expiryDate);
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.maxUses !== undefined) update.maxUses = dto.maxUses;
    await this.repo.update(id, update);
    return { message: 'Coupon updated' };
  }

  async remove(id: number) {
    const coupon = await this.repo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    await this.repo.delete(id);
    return { message: 'Coupon deleted' };
  }

  async validate(couponCode: string, amount: number): Promise<{
    couponId: number;
    discountedAmount: number;
    discountApplied: number;
  }> {
    const coupon = await this.repo.findOne({ where: { couponCode: couponCode.toUpperCase() } });
    if (!coupon) throw new NotFoundException('Invalid coupon code');
    if (coupon.status !== 'active') throw new BadRequestException('Coupon is inactive');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(coupon.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (expiry < today) throw new BadRequestException('Coupon has expired');

    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const discountValue = Number(coupon.discountValue);
    let discountApplied: number;
    if (coupon.discountType === 'percentage') {
      discountApplied = parseFloat(((amount * discountValue) / 100).toFixed(2));
    } else {
      discountApplied = Math.min(discountValue, amount);
    }
    const discountedAmount = parseFloat((amount - discountApplied).toFixed(2));

    return { couponId: coupon.id, discountedAmount, discountApplied };
  }

  async incrementUsage(id: number) {
    await this.repo.manager.query(
      `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1`,
      [id],
    );
  }
}
