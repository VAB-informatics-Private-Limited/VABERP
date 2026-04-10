import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateServiceBookingDto {
  @IsNumber()
  serviceProductId: number;

  @IsOptional()
  @IsNumber()
  serviceEventId?: number;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  scheduledSlot?: string;

  @IsOptional()
  @IsNumber()
  serviceCharge?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignTechnicianDto {
  @IsNumber()
  technicianId: number;

  @IsOptional()
  @IsString()
  scheduledSlot?: string;
}

export class CompleteBookingDto {
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @IsOptional()
  @IsNumber()
  serviceCharge?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string;
}
