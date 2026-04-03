import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsNotEmpty()
  @IsIn(['pending', 'in_progress', 'completed', 'cancelled'])
  status: string;
}
