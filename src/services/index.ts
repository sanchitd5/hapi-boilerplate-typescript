import GenericMongoService from './genericServices/mongo';
import ForgetPasswordService from './forgetPasswordService';

const services: { [key: string]: any } = {
  UserService: new GenericMongoService('User'),
  ForgetPasswordService,
  AdminService: new GenericMongoService('Admin'),
  TokenService: new GenericMongoService('Token')
}

export default services;