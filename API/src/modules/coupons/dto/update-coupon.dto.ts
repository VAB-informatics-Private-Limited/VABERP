import { IsString, IsOptional, IsIn, IsNumber, IsDateString, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsIn(['flat', 'percentage'])
  discountType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;
}
