import { IsString, IsNotEmpty, IsIn, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @IsNotEmpty()
  couponCode: string;

  @IsIn(['flat', 'percentage'])
  discountType: string;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsDateString()
  expiryDate: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxUses?: number;
}
