import {
  Controller,
  Get,
  // UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
// import { AdminJwtGuard } from 'src/admin/admin-jwt.guard';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  // @UseGuards(AdminJwtGuard)
  @Get('/GetAllUserInfo')
  findAllUser() {
    return this.userService.findAllUser();
  }

  // @UseGuards(AdminJwtGuard)
  @Get('GetData')
  findOneUser(@Query('mobile_no') mobile_no: string) {
    return this.userService.findOneUser(mobile_no);
  }

  @Get('GetRelations')
  findRelations(@Query('username') username: string) {
    return this.userService.findRelations(username);
  }
}
