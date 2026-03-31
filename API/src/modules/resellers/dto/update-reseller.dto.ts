import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateResellerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
