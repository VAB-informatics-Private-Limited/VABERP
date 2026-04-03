import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsIn } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  assignedTo?: number;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsNumber()
  relatedEntityId?: number;
}
