import { IsString, IsOptional, IsNumber, IsDateString, IsArray, ValidateNested, IsEmail, Matches, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class QuotationItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  productId?: number;

  @ApiProperty({ example: 'Industrial Motor 5HP' })
  @IsString()
  itemName: string;

  @ApiPropertyOptional({ example: 'High-efficiency motor for industrial use' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '8501' })
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'PCS' })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  discountPercent?: number;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsNumber()
  taxPercent?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateQuotationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  enquiryId?: number;

  @ApiPropertyOptional({ example: '2026-02-23' })
  @IsOptional()
  @IsDateString()
  quotationDate?: string;

  @ApiPropertyOptional({ example: '2026-03-23' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ example: 'ABC Industries' })
  @IsString()
  customerName: string;

  @ApiPropertyOptional({ example: 'contact@abc.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Mobile must be a valid 10-digit Indian number' })
  mobile?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Mumbai 400001' })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional({ example: '456 Industrial Area, Pune 411001' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'percentage', enum: ['percentage', 'amount'] })
  @IsOptional()
  @IsString()
  discountType?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  discountValue?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  shippingCharges?: number;

  @ApiPropertyOptional({ example: 'Delivery within 15 days. Payment: 50% advance.' })
  @IsOptional()
  @IsString()
  termsConditions?: string;

  @ApiPropertyOptional({ example: 'Priority customer - expedite delivery' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'draft', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ type: [QuotationItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}

export class UpdateQuotationStatusDto {
  @ApiProperty({ example: 'sent', enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'] })
  @IsString()
  @IsIn(['draft', 'sent', 'accepted', 'rejected', 'expired'])
  status: string;

  @ApiPropertyOptional({ example: 'Price is too high for current budget' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
