import { Callback, CallbackError, FilterQuery, PipelineStage, ProjectionType, QueryOptions, UpdateQuery, UpdateWithAggregationPipeline } from "mongoose";
import GenericDBService from "./generic";
import MongoModels from "./../models/mongo/index";

type MongoServiceCallback = ((err: CallbackError, doc: any, res: any) => void)



/**
 * @author Sanchit Dang
 * @description Generic MongoDB Service Template
 */
export default class GenericMongoService extends GenericDBService {
    declare modelName: string;
    declare objects: Array<any>;

    constructor(modelName: string) {
        super();
        if (!this.#isModelValid(modelName)) {
            appLogger.fatal(`Invalid model name ${modelName}`);
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
        return !(!modelName || 0 === modelName.length || !MongoModels.hasOwnProperty(modelName as PropertyKey));
    }

    /**
     * @author Sanchit Dang
     * @description Update a record in DB
     */
    updateRecord(criteria: FilterQuery<any> = {}, data: UpdateQuery<any> = {}, options: QueryOptions = {}, callback: MongoServiceCallback) {
        options.lean = true;
        options.new = true;
        MongoModels[this.modelName].findOneAndUpdate(criteria, data, options, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Insert a record in DB
     */
    createRecord(data: any, callback: MongoServiceCallback) {
        new MongoModels[this.modelName](data).save(callback);
    }

    /**
     * @author Sanchit Dang
     * @description Hard delete a record
     */
    deleteRecord(criteria: FilterQuery<any>, callback: Function) {
        MongoModels[this.modelName].findOneAndRemove(criteria, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Retrive records
     */
    async getRecord(criteria: FilterQuery<any> = {}, projection: ProjectionType<any> | null = {}, options: QueryOptions = {}): Promise<any[]> {
        options.lean = true;
        return MongoModels[this.modelName].find(criteria, projection, options);
    }

    /**
     * @author Sanchit Dang
     * @description Retrive records while populating them
     */
    getPopulatedRecords(criteria: FilterQuery<any> = {}, projection: ProjectionType<any> | null = {}, populate: string | string[], callback: Callback<Omit<any, never>[]>) {
        MongoModels[this.modelName].find(criteria).select(projection).populate(populate).exec(callback)
    }

    /**
     * @author Sanchit Dang
     * @description Aggregate Records
     */
    aggregate(pipeline: PipelineStage[], options: any, callback: Callback<any>) {
        MongoModels[this.modelName].aggregate(pipeline, options, callback);
    }


    /**
     * @deprecated Use getRecord instead
     * @author Sanchit Dang
     * @description get records using promise
     */
    getRecordUsingPromise(criteria: FilterQuery<any> = {}, projection: ProjectionType<any> | null = {}, options: QueryOptions = {}): Promise<any> {
        options.lean = true;
        return this.getRecord(criteria, projection, options);
    }

    updateMany(criteria: FilterQuery<any>, data: UpdateQuery<any> | UpdateWithAggregationPipeline, options: QueryOptions, callback: Callback<any>) {
        options.lean = true;
        options.new = true;
        MongoModels[this.modelName].updateMany(criteria, data, options, callback);
    }

    async empty() {
        await MongoModels[this.modelName].deleteMany().exec()
    }

}