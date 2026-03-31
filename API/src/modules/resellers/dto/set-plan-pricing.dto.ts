import { IsNumber, Min } from 'class-validator';

export class SetPlanPricingDto {
  @IsNumber()
  planId: number;

  @IsNumber()
  @Min(0)
  resellerPrice: number;
}
