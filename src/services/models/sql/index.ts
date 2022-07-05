import UserModel from './user'
import { Sequelize, Model } from 'sequelize';
import config from '../../../config';
import { DATABASE, GenericObject } from '../../../definations';


interface SqlStruct { Model: any, name: string, properties: GenericObject }


const structures: Array<SqlStruct> = [];

const models: Array<Model> = [];

export const initilize = async (sequelize: Sequelize) => {
    if (config.APP_CONFIG.userDatabase === DATABASE.POSTGRES) {
        structures.push(UserModel as SqlStruct);
    }
    structures.forEach(model => {
        models.push(model.Model.init(model.properties, { sequelize, modelName: model.name }));
    });
    return models;
};

export default initilize;