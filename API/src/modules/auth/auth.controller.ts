import { Controller, Post, Body, Get, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
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

  // Helper: set the JWT as a secure httpOnly cookie on the response.
  private setAuthCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h, matches typical JWT TTL
      path: '/',
    });
  }

  private clearAuthCookie(res: Response) {
    res.clearCookie('access_token', { path: '/' });
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('employee/login')
  @ApiOperation({ summary: 'Employee login' })
  async employeeLogin(
    @Body() dto: EmployeeLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.employeeLogin(dto);
    if (result?.data?.token) {
      this.setAuthCookie(res, result.data.token);
    }
    return result;
  }

  @Public()
  @Post('enterprise/verify-email')
  @ApiOperation({ summary: 'Verify enterprise email and send OTP' })
  async verifyEnterpriseEmail(@Body() dto: VerifyEnterpriseEmailDto) {
    return this.authService.verifyEnterpriseEmail(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('enterprise/verify-otp')
  @ApiOperation({ summary: 'Verify OTP for enterprise login' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @Post('enterprise/login')
  @ApiOperation({ summary: 'Enterprise login with password' })
  async enterpriseLogin(
    @Body() dto: EnterpriseLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.enterpriseLogin(dto);
    if (result?.data?.token) {
      this.setAuthCookie(res, result.data.token);
    }
    return result;
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Clear httpOnly auth cookie (safe to call even without valid JWT)' })
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearAuthCookie(res);
    return { message: 'Logged out' };
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new enterprise' })
  async register(@Body() dto: RegisterEnterpriseDto) {
    return this.authService.registerEnterprise(dto);
  }

  @Public()
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
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
