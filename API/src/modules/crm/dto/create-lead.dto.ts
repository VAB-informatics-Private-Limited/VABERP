import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsNumber()
  expectedValue?: number;

  @IsOptional()
  @IsString()
  requirements?: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsDateString()
  nextFollowupDate?: string;

  @IsOptional()
  @IsNumber()
  assignedTo?: number;
}
