import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    userId: number;
    mobile_no: string;
    username: string;
  };
}
