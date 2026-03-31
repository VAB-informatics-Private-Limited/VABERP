import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload) {
    let user: Employee | Enterprise | SuperAdmin | Reseller | null = null;

    if (payload.type === 'employee') {
      user = await this.employeeRepository.findOne({
        where: { id: payload.sub, status: 'active' },
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

    return {
      id: payload.sub,
      email: payload.email,
      type: payload.type,
      enterpriseId: payload.enterpriseId,
      name: payload.name,
    };
  }
}
