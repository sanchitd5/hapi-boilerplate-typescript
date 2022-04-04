import MODELS from "../../models/index";
import { GenericObject } from '../../definations';

interface GenericServceCallback {
    (err: Error, data: any): void;
}

/**
 * @author Sanchit Dang
 * @description Generic MongoDB Service Template
 */
export default class GenericMongoService {
    declare modelName: string;
    declare objects: Array<any>;

    /**
     * 
     * @param {String} modelName Name of the Model
     */
    constructor(modelName: string) {
        if (!this.#isModelValid(modelName)) {
            console.error(`Invalid model name ${modelName}`);
            throw "Invalid model name '" + modelName + "'. Terminating app..."
        }

        this.modelName = modelName;
        this.objects = [];
    }

    /**
     * @private
     * @author Sanchit Dang
     * @description Validate if models exists
     * @param {String} modelName name of the model 
     */
    #isModelValid(modelName: string) {
        return !(!modelName || 0 === modelName.length || !MODELS.hasOwnProperty(modelName as PropertyKey));
    }

    /**
     * @author Sanchit Dang
     * @description Update a record in DB
     * @param {Object} criteria 
     * @param {Object} data 
     * @param {Object} options 
     * @param {Function} callback 
     */
    updateRecord(criteria: GenericObject, data: GenericObject, options: GenericObject, callback: GenericServceCallback) {
        options.lean = true;
        options.new = true;
        MODELS[this.modelName].findOneAndUpdate(criteria, data, options, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Insert a record in DB
     * @param {Object} data 
     * @param {Function} callback 
     */
    createRecord(data: GenericObject, callback: GenericServceCallback) {
        MODELS[this.modelName](data).save(callback);
    }

    /**
     * @author Sanchit Dang
     * @description Hard delete a record
     * @param {Object} criteria 
     * @param {Function} callback 
     */
    deleteRecord(criteria: GenericObject, callback: Function) {
        MODELS[this.modelName].findOneAndRemove(criteria, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Retrive records
     * @param {Object} criteria 
     * @param {Object} projection 
     * @param {Object} options 
     * @param {Function} callback 
     */
    getRecord(criteria: GenericObject, projection: GenericObject, options: GenericObject, callback: GenericServceCallback) {
        options.lean = true;
        MODELS[this.modelName].find(criteria, projection, options, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Retrive records while populating them
     * @param {Object} criteria 
     * @param {Object} projection 
     * @param {Object|string} populate 
     * @param {Function} callback 
     */
    getPopulatedRecords(criteria: GenericObject, projection: GenericObject, populate: GenericObject | string, callback: GenericServceCallback) {
        MODELS[this.modelName].find(criteria).select(projection).populate(populate).exec(callback)
    }

    /**
     * @author Sanchit Dang
     * @description Aggregate Records
     * @param {Object} criteria 
     * @param {Function} callback 
     */
    aggregate(criteria: GenericObject, callback: Function) {
        MODELS[this.modelName].aggregate(criteria, callback);
    }


    /**
     * @author Sanchit Dang
     * @description get records using promise
     * @param {Object} criteria 
     * @param {Object} projection 
     * @param {Object} options 
     */
    getRecordUsingPromise(criteria: GenericObject, projection: GenericObject, options: GenericObject): Promise<any> {
        options.lean = true;
        return new Promise((resolve, reject) => {
            MODELS[this.modelName].find(criteria, projection, options, (err: Error, data: any) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

}