import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Employee } from '../employees/entities/employee.entity';
import { Enterprise } from '../enterprises/entities/enterprise.entity';
import { EnterpriseBranding } from '../enterprise-branding/entities/enterprise-branding.entity';
import { MenuPermission } from '../employees/entities/menu-permission.entity';
import {
  EmployeeLoginDto,
  EnterpriseLoginDto,
  RegisterEnterpriseDto,
  ResetPasswordDto,
  VerifyEnterpriseEmailDto,
  VerifyOtpDto,
} from './dto';
import { buildFullAccessPermissions, buildEmptyPermissions } from '../../common/constants/permissions';
import { EmailService } from '../email/email.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
    @InjectRepository(EnterpriseBranding)
    private brandingRepository: Repository<EnterpriseBranding>,
    @InjectRepository(MenuPermission)
    private permissionRepository: Repository<MenuPermission>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private auditLogsService: AuditLogsService,
  ) {}

  async employeeLogin(dto: EmployeeLoginDto) {
    const employee = await this.employeeRepository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.enterprise', 'enterprise')
      .addSelect('employee.password')
      .where('employee.email = :email', { email: dto.email })
      .getOne();

    if (!employee) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (employee.status !== 'active') {
      throw new UnauthorizedException('Your account is inactive');
    }

    if (employee.enterprise?.status !== 'active') {
      throw new UnauthorizedException('Your enterprise account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, employee.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const record = await this.permissionRepository.findOne({
      where: { employeeId: employee.id },
    });

    const employeeName = `${employee.firstName} ${employee.lastName || ''}`.trim();
    const payload = {
      sub: employee.id,
      email: employee.email,
      type: 'employee' as const,
      enterpriseId: employee.enterpriseId,
      name: employeeName,
    };

    this.auditLogsService.log({
      enterpriseId: employee.enterpriseId,
      userId: employee.id,
      userType: 'employee',
      userName: employeeName,
      entityType: 'auth',
      entityId: employee.id,
      action: 'login',
      description: `Employee "${employeeName}" logged in`,
    }).catch((err) => console.error('[audit/bg failed]', err?.message || err));

    return {
      message: 'Login successful',
      data: {
        user: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phoneNumber: employee.phoneNumber,
          enterpriseId: employee.enterpriseId,
          departmentId: employee.departmentId,
          designationId: employee.designationId,
          status: employee.status,
          isReportingHead: employee.isReportingHead,
          reportingTo: employee.reportingTo,
        },
        permissions: record?.permissions || buildEmptyPermissions(),
        token: this.jwtService.sign(payload),
        type: 'employee',
      },
    };
  }

  async verifyEnterpriseEmail(dto: VerifyEnterpriseEmailDto) {
    const enterprise = await this.enterpriseRepository.findOne({
      where: { email: dto.email },
    });

    if (!enterprise) {
      throw new UnauthorizedException('Enterprise not found');
    }

    if (enterprise.status === 'blocked') {
      throw new UnauthorizedException('Your enterprise account is blocked');
    }

    // Generate 6-digit OTP and save
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.enterpriseRepository.update(enterprise.id, { emailOtp: otp });

    // Send OTP via email
    if (this.emailService.isConfigured()) {
      await this.emailService.sendEmail({
        to: dto.email,
        subject: 'Your Login OTP',
        body: `Your OTP for login is: <b>${otp}</b>\n\nThis OTP is valid for a single use. Do not share it with anyone.\n\nRegards,\n${enterprise.businessName}`,
      });
    }

    const branding = await this.brandingRepository.findOne({
      where: { enterpriseId: enterprise.id },
    });

    return {
      message: 'OTP sent to your email',
      data: {
        email: dto.email,
        businessName: enterprise.businessName,
        slug: enterprise.slug,
        branding: branding || null,
      },
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const enterprise = await this.enterpriseRepository.findOne({
      where: { email: dto.email },
    });

    if (!enterprise) {
      throw new UnauthorizedException('Enterprise not found');
    }

    if (!enterprise.emailOtp) {
      throw new BadRequestException('No OTP was requested. Please verify your email first.');
    }

    if (enterprise.emailOtp !== dto.otp) {
      throw new BadRequestException('Invalid OTP');
    }

    // Clear OTP after verification
    await this.enterpriseRepository.update(enterprise.id, {
      emailOtp: null,
      emailVerified: true,
    });

    // Activate pending enterprises on successful OTP login
    if (enterprise.status === 'pending') {
      await this.enterpriseRepository.update(enterprise.id, { status: 'active' });
      enterprise.status = 'active';
    }

    const payload = {
      sub: enterprise.id,
      email: enterprise.email,
      type: 'enterprise' as const,
      enterpriseId: enterprise.id,
      name: enterprise.businessName,
    };

    return {
      message: 'Login successful',
      data: {
        user: {
          id: enterprise.id,
          businessName: enterprise.businessName,
          email: enterprise.email,
          mobile: enterprise.mobile,
          city: enterprise.city,
          state: enterprise.state,
          status: enterprise.status,
          expiryDate: enterprise.expiryDate,
          planId: enterprise.planId,
          subscriptionStartDate: enterprise.subscriptionStartDate,
          subscriptionStatus: this.computeEnterpriseSubscriptionStatus(enterprise),
          isLocked: enterprise.isLocked ?? false,
        },
        permissions: buildFullAccessPermissions(),
        token: this.jwtService.sign(payload),
        type: 'enterprise',
      },
    };
  }

  async enterpriseLogin(dto: EnterpriseLoginDto) {
    const enterprise = await this.enterpriseRepository
      .createQueryBuilder('enterprise')
      .addSelect('enterprise.password')
      .where('enterprise.email = :email', { email: dto.email })
      .getOne();

    if (!enterprise) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (enterprise.status === 'blocked') {
      throw new UnauthorizedException('Your enterprise account is blocked');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, enterprise.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Activate pending enterprises on successful login
    if (enterprise.status === 'pending') {
      await this.enterpriseRepository.update(enterprise.id, { status: 'active' });
      enterprise.status = 'active';
    }

    const payload = {
      sub: enterprise.id,
      email: enterprise.email,
      type: 'enterprise' as const,
      enterpriseId: enterprise.id,
      name: enterprise.businessName,
    };

    return {
      message: 'Login successful',
      data: {
        user: {
          id: enterprise.id,
          businessName: enterprise.businessName,
          email: enterprise.email,
          mobile: enterprise.mobile,
          city: enterprise.city,
          state: enterprise.state,
          status: enterprise.status,
          expiryDate: enterprise.expiryDate,
          planId: enterprise.planId,
          subscriptionStartDate: enterprise.subscriptionStartDate,
          subscriptionStatus: this.computeEnterpriseSubscriptionStatus(enterprise),
          isLocked: enterprise.isLocked ?? false,
        },
        permissions: buildFullAccessPermissions(),
        token: this.jwtService.sign(payload),
        type: 'enterprise',
      },
    };
  }

  private computeEnterpriseSubscriptionStatus(
    enterprise: Enterprise,
  ): 'active' | 'expired' | 'none' {
    if (!enterprise.planId) return 'none';
    if (!enterprise.expiryDate) return 'none';
    return new Date(enterprise.expiryDate) >= new Date() ? 'active' : 'expired';
  }

  async getEnterpriseStatus(enterpriseId: number) {
    const enterprise = await this.enterpriseRepository.findOne({ where: { id: enterpriseId } });
    if (!enterprise) throw new UnauthorizedException('Enterprise not found');

    return {
      message: 'Status fetched',
      data: {
        subscriptionStatus: this.computeEnterpriseSubscriptionStatus(enterprise),
        expiryDate: enterprise.expiryDate,
        planId: enterprise.planId,
        status: enterprise.status,
      },
    };
  }

  async registerEnterprise(dto: RegisterEnterpriseDto) {
    // Check if email already exists
    const existingEmail = await this.enterpriseRepository.findOne({
      where: { email: dto.businessEmail },
    });

    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Generate a temporary password (mobile number + first 3 chars of business name)
    const tempPassword = dto.businessMobile.slice(-4) + dto.businessName.slice(0, 3).toLowerCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Generate OTPs
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const mobileOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create enterprise
    const enterprise = this.enterpriseRepository.create({
      businessName: dto.businessName,
      email: dto.businessEmail,
      mobile: dto.businessMobile,
      password: hashedPassword,
      address: dto.businessAddress,
      city: dto.businessCity,
      state: dto.businessState,
      pincode: dto.pincode,
      gstNumber: dto.gstNumber,
      cinNumber: dto.cinNumber,
      status: 'active',
      emailOtp,
      mobileOtp,
    });

    await this.enterpriseRepository.save(enterprise);

    // Send OTP and credentials via email
    if (this.emailService.isConfigured()) {
      await this.emailService.sendEmail({
        to: dto.businessEmail,
        subject: 'VAB Enterprise - Registration Successful',
        body: `Welcome to VAB Enterprise!\n\nYour registration is complete.\n\nEmail OTP: ${emailOtp}\n\nTemporary Password: ${tempPassword}\n\nPlease login and change your password immediately.\n\nRegards,\nVAB Enterprise Team`,
      });
    }

    return {
      status: 'success',
      message: 'Registration successful. Your login credentials have been sent to your email.',
      data: {
        email: dto.businessEmail,
        mobile: dto.businessMobile,
      },
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Try enterprise first
    let enterprise = await this.enterpriseRepository
      .createQueryBuilder('enterprise')
      .addSelect('enterprise.password')
      .where('enterprise.email = :email', { email: dto.emailId })
      .getOne();

    if (enterprise) {
      const isOldPasswordValid = await bcrypt.compare(dto.oldpassword, enterprise.password);
      if (!isOldPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(dto.confirmpassword, 10);
      await this.enterpriseRepository.update(enterprise.id, { password: hashedPassword });

      return {
        status: 'success',
        message: 'Password updated successfully',
      };
    }

    // Try employee
    const employee = await this.employeeRepository
      .createQueryBuilder('employee')
      .addSelect('employee.password')
      .where('employee.email = :email', { email: dto.emailId })
      .getOne();

    if (employee) {
      const isOldPasswordValid = await bcrypt.compare(dto.oldpassword, employee.password);
      if (!isOldPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const hashedPassword = await bcrypt.hash(dto.confirmpassword, 10);
      await this.employeeRepository.update(employee.id, { password: hashedPassword });

      return {
        status: 'success',
        message: 'Password updated successfully',
      };
    }

    throw new UnauthorizedException('Account not found with this email');
  }

  async getPermissions(user: { id: number; type: string }) {
    if (user.type !== 'employee') {
      return {
        message: 'Permissions fetched successfully',
        data: buildFullAccessPermissions(),
        dataStartDate: null,
      };
    }

    const record = await this.permissionRepository.findOne({
      where: { employeeId: user.id },
    });

    return {
      message: 'Permissions fetched successfully',
      data: record?.permissions || buildEmptyPermissions(),
      dataStartDate: record?.dataStartDate ?? null,
    };
  }
}
