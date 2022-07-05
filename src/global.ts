import { Logger } from "log4js";
import { BaseEnvironment } from "./definations";

declare global {
    var appRoot: string;
    var appLogger: Logger;
    var uploadLogger: Logger;
    var socketLogger: Logger;
    var tokenLogger: Logger;
    var mongoLogger: Logger;
    // declare custom global variables here
    namespace NodeJS {
        interface ProcessEnv extends BaseEnvironment {

        }
    }
}
