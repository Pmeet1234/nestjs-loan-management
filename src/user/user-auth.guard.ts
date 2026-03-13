import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class UserAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any): any {
    if (err || !user) throw new UnauthorizedException('User access required');

    if ((user as { role: string }).role === 'admin') {
      throw new UnauthorizedException('Admin cannot access user routes');
    }

    return user;
  }
}
