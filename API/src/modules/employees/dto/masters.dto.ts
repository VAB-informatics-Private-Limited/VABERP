import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, IsBoolean, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Simple master-data DTOs used for departments / designations / reporting managers.
// They all accept a name + optional description; designations additionally accept departmentId.

export class CreateNameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateNameDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateDesignationDto extends CreateNameDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  departmentId?: number;
}

export class UpdateDesignationDto extends UpdateNameDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  departmentId?: number;
}

// Full employee DTOs
export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(200)
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  designationId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  reportingTo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isReportingHead?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateEmployeeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  departmentId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  designationId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  reportingTo?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isReportingHead?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
