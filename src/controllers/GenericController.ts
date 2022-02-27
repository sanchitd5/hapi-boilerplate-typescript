import Services from '../services';
import async from "async";
import UniversalFunctions from "../utils/universalFunctions";
import lodash from 'lodash';

class GenericController {
    declare protected services;
    declare protected async;
    declare protected universalFunctions;
    declare protected _: lodash.LoDashStatic;
    constructor() {
        this.services = Services;
        this.async = async;
        this.universalFunctions = UniversalFunctions;
        this._ = lodash;
    }
}

export default GenericController;