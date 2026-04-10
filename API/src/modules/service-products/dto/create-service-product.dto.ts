import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateServiceProductDto {
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  productTypeId?: number;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  modelNumber?: string;

  @IsDateString()
  dispatchDate: string;

  @IsOptional()
  @IsDateString()
  warrantyStartDate?: string;

  @IsOptional()
  @IsDateString()
  warrantyEndDate?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerMobile?: string;

  @IsOptional()
  @IsString()
  customerAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
