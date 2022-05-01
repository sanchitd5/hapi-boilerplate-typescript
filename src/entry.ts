import './global';
import Server from "./server/server";
// Read .env file.
import 'dotenv/config';


/**
 * This is required in all environments since this is what mongoose uses to establish connection to a MongoDB instance.
 */

new Server().start();