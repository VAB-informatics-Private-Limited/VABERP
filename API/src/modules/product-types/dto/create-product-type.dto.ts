import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';

export class ServiceRuleDto {
  @IsNumber()
  @Min(1)
  dayOffset: number;

  @IsString()
  eventType: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  warrantyMonths?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceRuleDto)
  serviceRules?: ServiceRuleDto[];
}
