import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class AdminJwtGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any): any {
    if (err || !user) throw new UnauthorizedException('Admin access required');

    // ✅ Only allow if role is admin
    if ((user as { role: string }).role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }

    return user;
  }
}
