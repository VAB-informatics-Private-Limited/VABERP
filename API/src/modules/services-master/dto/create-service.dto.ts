import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
