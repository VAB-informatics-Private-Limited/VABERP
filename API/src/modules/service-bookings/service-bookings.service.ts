import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceBooking } from './entities/service-booking.entity';
import { ServiceEventsService } from '../service-events/service-events.service';
import { SmsService } from '../sms/sms.service';
import {
  CreateServiceBookingDto,
  AssignTechnicianDto,
  CompleteBookingDto,
} from './dto/create-service-booking.dto';

@Injectable()
export class ServiceBookingsService {
  constructor(
    @InjectRepository(ServiceBooking)
    private repo: Repository<ServiceBooking>,
    private serviceEventsService: ServiceEventsService,
    private smsService: SmsService,
  ) {}

  async findAll(
    enterpriseId: number,
    page = 1,
    limit = 20,
    status?: string,
    technicianId?: number,
    fromDate?: string,
    toDate?: string,
  ) {
    const query = this.repo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.serviceProduct', 'sp')
      .leftJoinAndSelect('b.technician', 'tech')
      .leftJoinAndSelect('b.serviceEvent', 'event')
      .where('b.enterpriseId = :enterpriseId', { enterpriseId });

    if (status) query.andWhere('b.status = :status', { status });
    if (technicianId) query.andWhere('b.technicianId = :technicianId', { technicianId });
    if (fromDate) query.andWhere('b.scheduledDate >= :fromDate', { fromDate });
    if (toDate) query.andWhere('b.scheduledDate <= :toDate', { toDate });

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('b.scheduledDate', 'ASC')
      .getManyAndCount();

    return { message: 'Service bookings fetched successfully', data, totalRecords: total, page };
  }

  async findOne(id: number, enterpriseId: number) {
    const booking = await this.repo.findOne({
      where: { id, enterpriseId },
      relations: ['serviceProduct', 'technician', 'serviceEvent'],
    });
    if (!booking) throw new NotFoundException('Service booking not found');
    return { message: 'Service booking fetched successfully', data: booking };
  }

  async create(enterpriseId: number, dto: CreateServiceBookingDto, userId?: number) {
    const booking = this.repo.create({
      enterpriseId,
      serviceProductId: dto.serviceProductId,
      serviceEventId: dto.serviceEventId,
      scheduledDate: new Date(dto.scheduledDate),
      scheduledSlot: dto.scheduledSlot,
      serviceCharge: dto.serviceCharge ?? 0,
      notes: dto.notes,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdBy: userId,
    });

    const saved = await this.repo.save(booking);

    // Mark linked event as booked
    if (dto.serviceEventId) {
      await this.serviceEventsService.markBooked(dto.serviceEventId, enterpriseId);
    }

    // Send SMS confirmation
    const full = await this.repo.findOne({
      where: { id: saved.id },
      relations: ['serviceProduct'],
    });
    if (full?.serviceProduct?.customerMobile) {
      const dateStr = new Date(dto.scheduledDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const msg = `Hi ${full.serviceProduct.customerName || 'Customer'}, your service has been booked for ${dateStr}${dto.scheduledSlot ? ' (' + dto.scheduledSlot + ')' : ''}. We will confirm shortly.`;
      this.smsService.sendSms(full.serviceProduct.customerMobile, msg).catch((err) => console.error('[audit/bg failed]', err?.message || err));
    }

    return this.findOne(saved.id, enterpriseId);
  }

  async assignTechnician(id: number, enterpriseId: number, dto: AssignTechnicianDto) {
    const booking = await this.repo.findOne({ where: { id, enterpriseId } });
    if (!booking) throw new NotFoundException('Service booking not found');

    booking.technicianId = dto.technicianId;
    booking.status = 'assigned';
    if (dto.scheduledSlot) booking.scheduledSlot = dto.scheduledSlot;
    await this.repo.save(booking);

    return this.findOne(id, enterpriseId);
  }

  async updateStatus(id: number, enterpriseId: number, status: string) {
    const booking = await this.repo.findOne({ where: { id, enterpriseId } });
    if (!booking) throw new NotFoundException('Service booking not found');
    booking.status = status;
    await this.repo.save(booking);
    return this.findOne(id, enterpriseId);
  }

  async complete(id: number, enterpriseId: number, dto: CompleteBookingDto) {
    const booking = await this.repo.findOne({ where: { id, enterpriseId } });
    if (!booking) throw new NotFoundException('Service booking not found');

    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.completionNotes = dto.completionNotes ?? booking.completionNotes;
    if (dto.serviceCharge !== undefined) booking.serviceCharge = dto.serviceCharge;
    if (dto.paymentMethod) booking.paymentMethod = dto.paymentMethod;
    if (dto.paymentStatus) booking.paymentStatus = dto.paymentStatus;
    await this.repo.save(booking);

    // Mark linked event as completed
    if (booking.serviceEventId) {
      await this.serviceEventsService.markCompleted(booking.serviceEventId, enterpriseId);
    }

    return this.findOne(id, enterpriseId);
  }

  async cancel(id: number, enterpriseId: number) {
    const booking = await this.repo.findOne({ where: { id, enterpriseId } });
    if (!booking) throw new NotFoundException('Service booking not found');
    booking.status = 'cancelled';
    await this.repo.save(booking);
    return { message: 'Booking cancelled' };
  }
}
