
import MODELS from "./../models/mongo/index";
import { Callback, CallbackError, FilterQuery, PipelineStage, ProjectionType, QueryOptions, UpdateQuery, UpdateWithAggregationPipeline } from "mongoose";

type MongoServiceCallback<Schema> = ((err: CallbackError, doc: Schema | Schema[], res: any) => void)

/**
 * @author Sanchit Dang
 * @description Generic MongoDB Service Template
 */
export default class GenericMongoService<Schema> {
    declare modelName: string;
    declare objects: Array<any>;

    constructor(modelName: string) {

        if (!this.#isModelValid(modelName)) {
            console.debug(`Invalid model name ${modelName}`);
            throw new Error("Invalid model name '" + modelName + "'. Terminating app...")
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
     */
    updateRecord(criteria: FilterQuery<Partial<Schema>> = {}, data: UpdateQuery<Partial<Schema>> = {}, options: QueryOptions = {},
        callback?: MongoServiceCallback<Schema>): Promise<Schema | Schema[]> | undefined {
        options.lean = true;
        options.new = true;
        if (!callback) {
            return new Promise((resolve: (data: Schema | Schema[]) => void, reject: (error: NativeError) => void) => {
                MODELS[this.modelName].findOneAndUpdate(criteria, data, options, (err: CallbackError, doc: Schema | Schema[]) => {
                    if (err) reject(err);
                    else resolve(doc);
                });
            });
        }
        MODELS[this.modelName].findOneAndUpdate(criteria, data, options, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Insert a record in DB
     */
    async createRecord(data: Partial<Schema>, callback?: MongoServiceCallback<Schema>) {
        if (!callback) {
            return new Promise((resolve, reject) => {
                new MODELS[this.modelName](data).save((err: CallbackError, doc: Schema) => {
                    if (err) reject(err);
                    else resolve(doc);
                });
            })
        }
        return new MODELS[this.modelName](data).save(callback);
    }

    /**
     * @author Sanchit Dang
     * @description Hard delete a record
     */
    deleteRecord(criteria: FilterQuery<any>, callback?: Function) {
        if (!callback) {
            return new Promise((resolve, reject) => {
                MODELS[this.modelName].deleteOne(criteria, (err: CallbackError) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            });
        }
        MODELS[this.modelName].findOneAndRemove(criteria, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Retrive records
     */
    async getRecord(criteria: FilterQuery<Partial<Schema>> = {}, projection: ProjectionType<any> | null = {}, options: QueryOptions = {}, callback?: Callback<any>) {
        options.lean = true;
        if (!callback) {
            return new Promise((resolve: (data: Schema[]) => void, reject: (error: NativeError) => void) => {
                MODELS[this.modelName].find(criteria, projection, options, (err: CallbackError, data: Schema[]) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
        }
        MODELS[this.modelName].find(criteria, projection, options, callback);
    }

    /**
     * @author Sanchit Dang
     * @description Retrive records while populating them
     */
    getPopulatedRecords(criteria: FilterQuery<any> = {}, projection: ProjectionType<any> | null = {}, populate: string | string[], callback: Callback<Omit<Schema, never>[]>) {
        MODELS[this.modelName].find(criteria).select(projection).populate(populate).exec(callback)
    }

    /**
     * @author Sanchit Dang
     * @description Aggregate Records
     */
    aggregate(pipeline: PipelineStage[], options: any, callback: Callback<any>) {
        MODELS[this.modelName].aggregate(pipeline, options, callback);
    }


    /**
     * @author Sanchit Dang
     * @description get records using promise
     */
    getRecordUsingPromise(criteria: FilterQuery<Partial<Schema>> = {}, projection: ProjectionType<any> | null = {}, options: QueryOptions = {}): Promise<Schema[]> {
        options.lean = true;
        return new Promise((resolve, reject) => {
            MODELS[this.modelName].find(criteria, projection, options, (err: CallbackError, data: Schema[]) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    async updateMany(criteria: FilterQuery<Partial<Schema>>, data: UpdateQuery<Partial<Schema>> | UpdateWithAggregationPipeline, options: QueryOptions, callback?: Callback<Schema>) {
        options.lean = true;
        options.new = true;
        return MODELS[this.modelName].updateMany(criteria, data, options, callback);
    }

    async empty() {
        await MODELS[this.modelName].deleteMany().exec()
    }

}