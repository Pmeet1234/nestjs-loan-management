import { Request } from 'express';

export interface RequestWithUser extends Request {
  user: {
    id: number;
    mobile_no: string;
    username: string;
  };
}
