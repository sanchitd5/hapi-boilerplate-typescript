import GenericMongoService from './genericServices/mongo';

const services: { [key: string]: GenericMongoService } = {
  UserService: new GenericMongoService('User'),
  ForgetPasswordService: new GenericMongoService('ForgetPassword'),
  AdminService: new GenericMongoService('Admin'),
  TokenService: new GenericMongoService('Token')
}

export default services;