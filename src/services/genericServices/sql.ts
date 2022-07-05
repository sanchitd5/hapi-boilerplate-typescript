import SQLModels from '../models/sql/index';
import GenericDBService from './generic';
import { GenericObject, GenericServiceCallback } from '../../definations';

export default class GenericSQLService extends GenericDBService {
    declare model: any;
    constructor(modelName: string) {
        super();
        if (!this.isModelValid(SQLModels, modelName)) {
            console.error(`Invalid model name ${modelName}`);
            throw "Invalid model name '" + modelName + "'. Terminating app..."
        }
        this.model = SQLModels[modelName];

    }

    async createRecord(data: GenericObject, callback?: GenericServiceCallback) {
        try {
            const result = await this.model.create(data);
            if (callback) callback(null, result);
            return result;
        } catch (error) {
            if (callback) callback(error);
            else throw error;
        }
    }

    async updateRecord(criteria: GenericObject, data: GenericObject, options: GenericObject, callback?: GenericServiceCallback) {
        try {
            const result = await this.model.findOneAndUpdate(criteria, data);
            if (callback) callback(null, result);
            return result;
        } catch (error) {
            if (callback) callback(error);
            else throw error;
        }
    }

    async getRecord(criteria: GenericObject, options: GenericObject, callback?: GenericServiceCallback) {
        try {
            const result = await this.model.findAll(criteria);
            if (callback) callback(null, result);
            return result;
        } catch (error) {
            if (callback) callback(error);
            else throw error;
        }
    }

    async deleteRecord(criteria: GenericObject, options: GenericObject, callback?: GenericServiceCallback) {
        try {
            const result = await this.model.destroy(criteria);
            if (callback) callback(null, result);
            return result;
        } catch (error) {
            if (callback) callback(error);
            else throw error;
        }
    }
}