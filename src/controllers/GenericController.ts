import Services from '../services';
import async from "async";
import UniversalFunctions from "../utils/universalFunctions";
import lodash from 'lodash';
import GenericMongoService from '../services/genericServices/mongo';
import DataTypeConverters from '../utils/converters';

class GenericController {
    declare protected services: typeof Services;
    declare protected async: typeof async;
    declare protected universalFunctions: typeof UniversalFunctions;
    declare protected _: lodash.LoDashStatic;
    declare protected defaultService?: GenericMongoService;
    declare protected useAuth: boolean;
    declare protected converters: typeof DataTypeConverters;
    constructor(service?: GenericMongoService) {
        this.services = Services;
        this.async = async;
        this.universalFunctions = UniversalFunctions;
        this._ = lodash;
        this.defaultService = service;
        this.converters = DataTypeConverters;
    }
}

export default GenericController;