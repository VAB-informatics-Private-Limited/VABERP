import { IsString, IsNotEmpty } from 'class-validator';

export class ResellerLoginDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
