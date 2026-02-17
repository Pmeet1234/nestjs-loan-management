import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    mobile_no: string;
    username: string;
  };
}
