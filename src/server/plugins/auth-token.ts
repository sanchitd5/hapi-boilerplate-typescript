import Hapi from '@hapi/hapi';
import TokenManager from '../../lib/tokenManager';
import AuthBearer from 'hapi-auth-bearer-token';

export const register = async function (server: Hapi.Server) {

  await server.register(AuthBearer as any)
  //Register Authorization Plugin
  server.auth.strategy('UserAuth', 'bearer-access-token', {
    allowQueryToken: false,
    allowMultipleHeaders: true,
    accessTokenName: 'accessToken',
    validate: async function (request: any, token: any) {
      let isValid = false;
      const credentials = await TokenManager.verifyToken(token)
      if (credentials && credentials['userData']) {
        isValid = true;
      }
      return { isValid, credentials };
    }
  });
};

export const name = 'auth-token-plugin'