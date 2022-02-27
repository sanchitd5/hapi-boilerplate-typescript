import Log4js from "log4js";

declare global {
    var appRoot: string;
    var appLogger: Log4js.Logger;
    var uploadLogger: Log4js.Logger;
    var socketLogger: Log4js.Logger;
    var tokenLogger: Log4js.Logger;
    var mongoLogger: Log4js.Logger;
}
