import { PartialType } from '@nestjs/mapped-types';
import { CreateServiceProductDto } from './create-service-product.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdateServiceProductDto extends PartialType(CreateServiceProductDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  productTypeId?: number;
}
