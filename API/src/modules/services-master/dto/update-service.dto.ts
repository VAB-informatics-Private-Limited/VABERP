import { IsString, IsOptional, IsIn } from 'class-validator';

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
