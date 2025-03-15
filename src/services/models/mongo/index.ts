/**
 * Created by Sanchit
 */
import User from './user';
import Admin from './admin';
import Token from './token';
import ForgetPassword from './forgotPasswordRequest';
import ProcessQueue from './processQueue';

const models: { [key: string]: any } = {
  User,
  ForgetPassword,
  Admin,
  Token,
  ProcessQueue
};

export default models;