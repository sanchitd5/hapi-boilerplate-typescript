'use strict';

import HapiSwagger from 'hapi-swagger';
import 'dotenv/config';

const swaggerOptions = {
    pathPrefixSize: 2,
    info: {
        'title': `${process.env.APP_NAME} API Documentation`,
        'description': `${process.env.APP_NAME} API documentation.`,
        'version': '0.0.1'
    },
    documentationPath: "/swagger",
    securityDefinitions: {
        'user': {
            type: 'apiKey',    // apiKey is defined by the Swagger spec
            name: 'Authorization',    // the name of the query parameter / header
            in: 'header'        // how the key is passed
        },
        'admin': {
            type: 'apiKey',    // apiKey is defined by the Swagger spec
            name: 'Authorization',    // the name of the query parameter / header
            in: 'header'        // how the key is passed
        }
    }
};

export function register(server, options) {
    server.register({
        plugin: HapiSwagger,
        options: swaggerOptions
    }, {}, (err) => {
        if (err) server.log(['error'], 'hapi-swagger load error: ' + err)
        else server.log(['info'], 'hapi-swagger interface loaded')
    });
}

export const name = 'swagger-plugin';
