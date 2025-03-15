import config from '../config';
import { DATABASE } from '../types';
import { ProcessQueueInterface } from '../types/processQueue';
import { TokenInterface } from '../types/token';
import { throwIfMongoDisabled, throwIfPostGresDisabled, throwIfMySQLDisabled } from '../utils';
import GenericMongoService from './genericServices/mongo';
import GenericSQLService from './genericServices/sql';

const getUserSevice = () => {
  switch (config.APP_CONFIG.userDatabase) {
    case DATABASE.MONGODB:
      throwIfMongoDisabled();
      return new GenericMongoService('User');

    case DATABASE.POSTGRES:
      throwIfPostGresDisabled();
      return new GenericSQLService('User');
    case DATABASE.MYSQL:
      throwIfMySQLDisabled();
      // TBI
      break;
    default:
    // none
  }
}

const getAdminService = () => {
  switch (config.APP_CONFIG.adminDatabase) {
    case DATABASE.MONGODB:
      return new GenericMongoService('Admin');
    case DATABASE.POSTGRES:
      throwIfPostGresDisabled();
      break;
    // TBI
    case DATABASE.MYSQL:
      throwIfMySQLDisabled();
      break;
    default:
    // none
  }
}

const services = {
  ProcessQueueService: new GenericMongoService<ProcessQueueInterface>('ProcessQueue'),
  TokenService: new GenericMongoService<TokenInterface>('Token'),
  UserService: getUserSevice(),
  AdminService: getAdminService(),
  ForgetPasswordService: new GenericMongoService('ForgetPassword'),
};


export default services;