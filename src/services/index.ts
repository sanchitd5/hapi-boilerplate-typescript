import config from '../config';
import { DATABASE } from '../definations';
import GenericMongoService from './genericServices/mongo';
import GenericSQLService from './genericServices/sql';

const services: { [key: string]: GenericMongoService | GenericSQLService } = {
  ForgetPasswordService: new GenericMongoService('ForgetPassword'),
  TokenService: new GenericMongoService('Token')
};

(() => {
  console.info('Initializing services');
  console.debug('User :' + config.APP_CONFIG.userDatabase);
  switch (config.APP_CONFIG.userDatabase) {
    case DATABASE.MONGODB:
      services.UserService = new GenericMongoService('User');
      break;
    case DATABASE.POSTGRES:
      services.UserService = new GenericSQLService('User');
      break;
    default:
    // none
  }
  console.debug('Admin :' + config.APP_CONFIG.adminDatabase);
  switch (config.APP_CONFIG.adminDatabase) {
    case DATABASE.MONGODB:
      services.AdminService = new GenericMongoService('Admin');
      break;
    case DATABASE.POSTGRES:
    // TBI
    default:
    // none
  }
})();

export default services;