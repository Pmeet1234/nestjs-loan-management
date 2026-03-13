import {
  Controller,
  Get,
  // Param,
  // UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from '../auth/dto/user.dto';
// import { AdminJwtGuard } from 'src/admin/admin-jwt.guard';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // @UseGuards(AdminJwtGuard)
  @Get('/GetAllUserInfo')
  findAllUser(): Promise<UserDto[]> {
    return this.userService.findAllUser();
  }

  // @UseGuards(AdminJwtGuard)
  @Get('GetData')
  findOneUser(@Query('mobile_no') mobile_no: string): Promise<UserDto> {
    return this.userService.findOneUser(mobile_no);
  }
}
