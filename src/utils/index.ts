import Hapi from '@hapi/hapi';
import { AuthType, RouteProperties } from '../definations';
import universalFunctions from './universalFunctions';

export const createRoute = (props: RouteProperties): Hapi.ServerRoute => {
    if (!props.validate || !props.validate.failAction) {
        props.validate = {
            ...props.validate,
            failAction: universalFunctions.failActionFunction
        }
    }
    return {
        method: props.method,
        path: props.path,
        options: {
            description: props.description,
            tags: props.tags,
            auth: (() => {
                switch (props.auth) {
                    case AuthType.USER:
                        return 'UserAuth';
                    case AuthType.ADMIN:
                        return 'AdminAuth';
                    default:
                        return false;
                }
            })(),
            validate: props.validate,
            handler: props.handler,
            plugins: {
                "hapi-swagger": {
                    responseMessages:
                        universalFunctions.CONFIG.APP_CONSTANTS.swaggerDefaultResponseMessages
                },
                ...props.plugins
            }
        },
    }
}