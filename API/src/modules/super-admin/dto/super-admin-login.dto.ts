import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SuperAdminLoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
