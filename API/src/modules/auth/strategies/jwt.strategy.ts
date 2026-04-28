import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Employee } from '../../employees/entities/employee.entity';
import { Enterprise } from '../../enterprises/entities/enterprise.entity';
import { SuperAdmin } from '../../super-admin/entities/super-admin.entity';
import { Reseller } from '../../resellers/entities/reseller.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  type: 'employee' | 'enterprise' | 'super_admin' | 'reseller';
  enterpriseId: number;
  name?: string;
}

// Prefer Authorization: Bearer header when explicitly set by the client, then
// fall back to the httpOnly access_token cookie. This avoids a stale main-app
// cookie shadowing a freshly issued super-admin / reseller bearer token when
// both auth surfaces are used in the same browser.
const extractJwtFromRequest = (req: Request): string | null => {
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (bearer) return bearer;
  if (req?.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Enterprise)
    private enterpriseRepository: Repository<Enterprise>,
    @InjectRepository(SuperAdmin)
    private superAdminRepository: Repository<SuperAdmin>,
    @InjectRepository(Reseller)
    private resellerRepository: Repository<Reseller>,
  ) {
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    let user: Employee | Enterprise | SuperAdmin | Reseller | null = null;

    if (payload.type === 'employee') {
      user = await this.employeeRepository.findOne({
        where: { id: payload.sub, status: 'active' },
        select: ['id', 'firstName', 'lastName', 'email', 'enterpriseId', 'status', 'isReportingHead', 'reportingTo'],
      });
    } else if (payload.type === 'enterprise') {
      user = await this.enterpriseRepository.findOne({
        where: { id: payload.sub, status: 'active' },
      });
    } else if (payload.type === 'super_admin') {
      user = await this.superAdminRepository.findOne({
        where: { id: payload.sub, status: 'active' },
      });
    } else if (payload.type === 'reseller') {
      user = await this.resellerRepository.findOne({
        where: { id: payload.sub, status: 'active' },
      });
    }

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const base = {
      id: payload.sub,
      email: payload.email,
      type: payload.type,
      enterpriseId: payload.enterpriseId,
      name: payload.name,
    };

    // For employees, attach reporting fields so services can scope data correctly
    if (payload.type === 'employee') {
      const emp = user as Employee;
      return {
        ...base,
        isReportingHead: emp.isReportingHead ?? false,
        reportingTo: emp.reportingTo ?? null,
      };
    }

    return base;
  }
}
