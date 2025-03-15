import { DATABASE, GenericObject } from "../types";
import APP_CONSTANTS from "./app";
import AWS_S3_CONFIG from "./awsS3";
import DB_CONFIG from "./db";

class AppConfig {
    declare databases: GenericObject;
    declare userDatabase: DATABASE;
    declare adminDatabase: DATABASE;
    declare useSocket: boolean;
    declare noOfClusters: number;
    maxNoOfClusters = process.env.MAX_CLUSTER_SIZE ? parseInt(process.env.MAX_CLUSTER_SIZE) : 8;
    constructor() {
        this.databases = {
            mongo: false,
            postgres: false,
            mysql: false
        };
        this.userDatabase = DATABASE.NONE;
        this.adminDatabase = DATABASE.NONE;
        this.useSocket = false;
        this.noOfClusters = 4;
    }
}

export default {
    APP_CONSTANTS,
    AWS_S3_CONFIG,
    DB_CONFIG,
    APP_CONFIG: new AppConfig()
} as const;