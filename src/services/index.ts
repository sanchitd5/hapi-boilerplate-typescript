import GenericService from './genericService';

import ForgetPasswordService from './forgetPasswordService';

const services: { [key: string]: any } = {
  UserService: new GenericService('User'),
  ForgetPasswordService,
  AdminService: new GenericService('Admin'),
  TokenService: new GenericService('Token')
}

export default services;