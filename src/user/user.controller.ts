import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDto } from 'src/auth/dto/user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // GET /users
  @Get('/userInfo')
  findAll(): Promise<UserDto[]> {
    return this.userService.findAll();
  }

  // GET /users/:mobile_no
  @Get(':mobile_no')
  findOne(@Param('mobile_no') mobile_no: string): Promise<UserDto> {
    return this.userService.findOne(mobile_no);
  }
}
