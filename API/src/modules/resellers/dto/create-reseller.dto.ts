import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateResellerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsOptional()
  @IsString()
  companyName?: string;
}
