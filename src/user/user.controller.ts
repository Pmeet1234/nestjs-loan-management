import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from '../auth/dto/user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('/GetAllUserInfo')
  findAllUser(): Promise<UserDto[]> {
    return this.userService.findAllUser();
  }

  @Get(':mobile_no')
  findOneUser(@Param('mobile_no') mobile_no: string): Promise<UserDto> {
    return this.userService.findOneUser(mobile_no);
  }
}
