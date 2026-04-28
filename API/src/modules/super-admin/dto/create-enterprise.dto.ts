import { IsString, IsEmail, IsOptional, IsNumber, IsNotEmpty, MinLength } from 'class-validator';

export class CreateEnterpriseDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  // Optional. If omitted, backend auto-generates a random temporary password.
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsOptional()
  cinNumber?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsNumber()
  planId: number;

  // Payment fields are optional — super-admin creation flow no longer collects
  // them on the UI (the enterprise is activated immediately). Kept in the DTO
  // so external callers can still pass them if they need to record a payment.
  @IsNumber()
  @IsOptional()
  paymentAmount?: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  paymentNotes?: string;

  @IsNumber()
  @IsOptional()
  resellerId?: number;
}
