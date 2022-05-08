import { DATABASE, GenericObject } from "../definations";
import APP_CONSTANTS from "./appConstants";
import AWS_S3_CONFIG from "./awsS3Config";
import DB_CONFIG from "./dbConfig";

class AppConfig {
    declare databases: GenericObject;
    declare userDatabase: DATABASE;
    declare adminDatabase: DATABASE;
    declare useSocket: boolean;
    constructor() {
        this.databases = {
            mongo: false,
            postgres: false,
            mysql: false
        };
        this.userDatabase = DATABASE.NONE;
        this.adminDatabase = DATABASE.NONE;
        this.useSocket = false;
    }
}



export default {
    APP_CONSTANTS,
    AWS_S3_CONFIG,
    DB_CONFIG,
    APP_CONFIG: new AppConfig()
} as const;