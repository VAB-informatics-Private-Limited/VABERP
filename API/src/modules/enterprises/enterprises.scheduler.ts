import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enterprise } from './entities/enterprise.entity';

@Injectable()
export class EnterprisesScheduler {
  constructor(
    @InjectRepository(Enterprise)
    private repo: Repository<Enterprise>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoLockExpired() {
    // Soft-lock expired enterprises (they can still login but get read-only access)
    await this.repo.manager.query(`
      UPDATE enterprises SET is_locked = true
      WHERE is_locked = false
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE
    `);

    // Soft-lock expired resellers
    await this.repo.manager.query(`
      UPDATE resellers SET is_locked = true
      WHERE is_locked = false
        AND expiry_date IS NOT NULL
        AND expiry_date < CURRENT_DATE
    `);
  }
}
