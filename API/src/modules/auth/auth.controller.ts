import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  EmployeeLoginDto,
  EnterpriseLoginDto,
  RegisterEnterpriseDto,
  ResetPasswordDto,
  VerifyEnterpriseEmailDto,
  VerifyOtpDto,
} from './dto';
import { Public } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('employee/login')
  @ApiOperation({ summary: 'Employee login' })
  async employeeLogin(@Body() dto: EmployeeLoginDto) {
    return this.authService.employeeLogin(dto);
  }

  @Public()
  @Post('enterprise/verify-email')
  @ApiOperation({ summary: 'Verify enterprise email and send OTP' })
  async verifyEnterpriseEmail(@Body() dto: VerifyEnterpriseEmailDto) {
    return this.authService.verifyEnterpriseEmail(dto);
  }

  @Public()
  @Post('enterprise/verify-otp')
  @ApiOperation({ summary: 'Verify OTP for enterprise login' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('enterprise/login')
  @ApiOperation({ summary: 'Enterprise login with password' })
  async enterpriseLogin(@Body() dto: EnterpriseLoginDto) {
    return this.authService.enterpriseLogin(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new enterprise' })
  async register(@Body() dto: RegisterEnterpriseDto) {
    return this.authService.registerEnterprise(dto);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with old password verification' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user permissions' })
  async getPermissions(@CurrentUser() user: any) {
    return this.authService.getPermissions(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user info' })
  async getMe(@CurrentUser() user: any) {
    return {
      message: 'User info fetched successfully',
      data: user,
    };
  }

  @Get('enterprise/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get enterprise subscription status (fresh from DB)' })
  async getEnterpriseStatus(@Request() req: { user: { enterpriseId: number } }) {
    return this.authService.getEnterpriseStatus(req.user.enterpriseId);
  }
}
