import type {
	FindOneAndReplaceOptions,
	FindOneAndUpdateOptions,
	UpdateOptions,
	Sort,
} from 'mongodb';
import { ObjectId } from 'mongodb';
import type { Document } from 'mongodb';
import type {
	IExecuteFunctions,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeCredentialTestResult,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';

import {
	buildParameterizedConnString,
	connectMongoClient,
	parseJsonToEjson,
	prepareFields,
	prepareItems,
	stringifyObjectIDs,
	validateAndResolveMongoCredentials,
} from './GenericFunctions';
import type { IMongoParametricCredentials } from './mongoDb.types';
import { nodeProperties } from './MongoDbProperties';
import { generatePairedItemData } from '../../utils/utilities';

export class MongoDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Better MongoDB',
		name: 'mongoDb',
		icon: 'file:mongodb.svg',
		group: ['input'],
		version: [2, 2.0],
		description: 'Better MongoDB node version 1.0-NDL54 (Latest)',
		defaults: {
			name: 'Better MongoDB',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mongoDB',
				required: true,
				testedBy: 'mongoDbCredentialTest',
			},
		],
		properties: nodeProperties,
	};

	methods = {
		credentialTest: {
			async mongoDbCredentialTest(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const credentials = credential.data as IDataObject;

				try {
					const database = ((credentials.database as string) || '').trim();
					let connectionString = '';

					if (credentials.configurationType === 'connectionString') {
						connectionString = ((credentials.connectionString as string) || '').trim();
					} else {
						connectionString = buildParameterizedConnString(
							credentials as unknown as IMongoParametricCredentials,
						);
					}

					const client = await connectMongoClient(connectionString, credentials);

					const { databases } = await client.db().admin().listDatabases();

					if (!(databases as IDataObject[]).map((db) => db.name).includes(database)) {
						throw new Error(`Database "${database}" does not exist`);
					
					}
					await client.close();
				} catch (error) {
					return {
						status: 'Error',
						message: (error as Error).message,
					};
				}
				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('mongoDb');
		const { database, connectionString } = validateAndResolveMongoCredentials(this, credentials);

		const client = await connectMongoClient(connectionString, credentials);

		const mdb = client.db(database);

		let returnData: INodeExecutionData[] = [];

		const items = this.getInputData();
		const operation = this.getNodeParameter('operation', 0);
		const nodeVersion = this.getNode().typeVersion;

		let itemsLength = items.length ? 1 : 0;
		let fallbackPairedItems;

		if (nodeVersion >= 1.1) {
			itemsLength = items.length;
		} else {
			fallbackPairedItems = generatePairedItemData(items.length);
		}

		if (operation === 'aggregate') {
			for (let i = 0; i < itemsLength; i++) {
				try {
					const queryParameter = JSON.parse(
						this.getNodeParameter('query', i) as string,
					) as IDataObject;

					if (queryParameter._id && typeof queryParameter._id === 'string') {
						queryParameter._id = new ObjectId(queryParameter._id);
					}

					const query = mdb
						.collection(this.getNodeParameter('collection', i) as string)
						.aggregate(parseJsonToEjson(queryParameter) as unknown as Document[]);

					for (const entry of await query.toArray()) {
						returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as JsonObject).message },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
						continue;
					}
					throw error;
				}
			}
		}

		if (operation === 'delete') {
			for (let i = 0; i < itemsLength; i++) {
				try {
					const queryParameter = JSON.parse(
						this.getNodeParameter('query', i) as string,
					) as IDataObject;

					const { deletedCount } = await mdb
						.collection(this.getNodeParameter('collection', i) as string)
						.deleteMany(parseJsonToEjson(queryParameter) as unknown as Document);

					returnData.push({
						json: { deletedCount },
						pairedItem: fallbackPairedItems ?? [{ item: i }],
					});
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as JsonObject).message },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
						continue;
					}
					throw error;
				}
			}
		}

		if (operation === 'find') {
			for (let i = 0; i < itemsLength; i++) {
				try {
					const queryParameter = JSON.parse(
						this.getNodeParameter('query', i) as string,
					) as IDataObject;

					if (queryParameter._id && typeof queryParameter._id === 'string') {
						queryParameter._id = new ObjectId(queryParameter._id);
					}

					let query = mdb
						.collection(this.getNodeParameter('collection', i) as string)
						.find(parseJsonToEjson(queryParameter) as unknown as Document);

					const options = this.getNodeParameter('options', i);
					const limit = typeof options === 'object' && options !== null && 'limit' in options ? (options as any).limit as number : 0;
					const skip = typeof options === 'object' && options !== null && 'skip' in options ? (options as any).skip as number : 0;
					const projection = typeof options === 'object' && options !== null && 'projection' in options && (options as any).projection ? (JSON.parse((options as any).projection as string) as Document) : undefined;
					const sort = typeof options === 'object' && options !== null && 'sort' in options && (options as any).sort ? (JSON.parse((options as any).sort as string) as Sort) : undefined;

					if (skip > 0) {
						query = query.skip(skip);
					}
					if (limit > 0) {
						query = query.limit(limit);
					}
					if (sort && Object.keys(sort).length !== 0 && sort.constructor === Object) {
						query = query.sort(sort);
					}

					if (
						projection &&
						Object.keys(projection).length !== 0 &&
						projection.constructor === Object
					) {
						query = query.project(projection);
					}

					const queryResult = await query.toArray();

					for (const entry of queryResult) {
						returnData.push({ json: entry, pairedItem: fallbackPairedItems ?? [{ item: i }] });
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({
							json: { error: (error as JsonObject).message },
							pairedItem: fallbackPairedItems ?? [{ item: i }],
						});
						continue;
					}
					throw error;
				}
			}
		}

		if (operation === 'findOneAndReplace') {
			fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
			const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
			const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
			const dateFields = prepareFields(
				this.getNodeParameter('options.dateFields', 0, '') as string,
			);

			const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true }
				: undefined;

			const updateItems = prepareItems(items, fields, updateKey, useDotNotation, dateFields);

			for (const item of updateItems) {
				try {
					const filter = { [updateKey]: item[updateKey] };
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectId(item[updateKey] as string);
						delete item._id;
					}

					// Parse EJSON cho item trước khi replace
					const parsedItem = parseJsonToEjson(item);
					await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.findOneAndReplace(filter, parsedItem, updateOptions as FindOneAndReplaceOptions);
				} catch (error) {
					if (this.continueOnFail()) {
						item.json = { error: (error as JsonObject).message };
						continue;
					}
					throw error;
				}
			}

			returnData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(updateItems),
				{ itemData: fallbackPairedItems },
			);
		}

		if (operation === 'findOneAndUpdate') {
			fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
			const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
			const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
			const dateFields = prepareFields(
				this.getNodeParameter('options.dateFields', 0, '') as string,
			);

			const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true }
				: undefined;

			const updateItems = prepareItems(items, fields, updateKey, useDotNotation, dateFields);

			for (const item of updateItems) {
				try {
					const filter = { [updateKey]: item[updateKey] };
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectId(item[updateKey] as string);
						delete item._id;
					}

					// Parse EJSON cho item trước khi update
					const parsedItem = parseJsonToEjson(item);
					await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.findOneAndUpdate(filter, { $set: parsedItem }, updateOptions as FindOneAndUpdateOptions);
				} catch (error) {
					if (this.continueOnFail()) {
						item.json = { error: (error as JsonObject).message };
						continue;
					}
					throw error;
				}
			}

			returnData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(updateItems),
				{ itemData: fallbackPairedItems },
			);
		}

		if (operation === 'insert') {
			fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
			let responseData: IDataObject[] = [];
			try {
				// Prepare the data to insert and copy it to be returned
				const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
				const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
				const dateFields = prepareFields(
					this.getNodeParameter('options.dateFields', 0, '') as string,
				);

				const insertItems = prepareItems(items, fields, '', useDotNotation, dateFields);

				// Parse EJSON cho toàn bộ object đầu vào
				const parsedInsertItems = insertItems.map(item => parseJsonToEjson(item));

				const { insertedIds } = await mdb
					.collection(this.getNodeParameter('collection', 0) as string)
					.insertMany(parsedInsertItems);

				// Add the id to the data
				for (const i of Object.keys(insertedIds)) {
					responseData.push({
						...insertItems[parseInt(i, 10)],
						id: insertedIds[parseInt(i, 10)] as unknown as string,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData = [{ error: (error as JsonObject).message }];
				} else {
					throw error;
				}
			}

			returnData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: fallbackPairedItems },
			);
		}

		if (operation === 'update') {
			fallbackPairedItems = fallbackPairedItems ?? generatePairedItemData(items.length);
			const fields = prepareFields(this.getNodeParameter('fields', 0) as string);
			const useDotNotation = this.getNodeParameter('options.useDotNotation', 0, false) as boolean;
			const dateFields = prepareFields(
				this.getNodeParameter('options.dateFields', 0, '') as string,
			);

			const updateKey = ((this.getNodeParameter('updateKey', 0) as string) || '').trim();

			const updateOptions = (this.getNodeParameter('upsert', 0) as boolean)
				? { upsert: true }
				: undefined;

			const updateItems = prepareItems(items, fields, updateKey, useDotNotation, dateFields);

			for (const item of updateItems) {
				try {
					const filter = { [updateKey]: item[updateKey] };
					if (updateKey === '_id') {
						filter[updateKey] = new ObjectId(item[updateKey] as string);
						delete item._id;
					}

					// Parse EJSON cho item trước khi update
					const parsedItem = parseJsonToEjson(item);
					console.log('DATA SENDING TO MONGO:', JSON.stringify(parsedItem, null, 2));
					await mdb
						.collection(this.getNodeParameter('collection', 0) as string)
						.updateOne(filter, { $set: parsedItem }, updateOptions as UpdateOptions);
				} catch (error) {
					if (this.continueOnFail()) {
						item.json = { error: (error as JsonObject).message };
						continue;
					}
					throw error;
				}
			}

			returnData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(updateItems),
				{ itemData: fallbackPairedItems },
			);
		}

		await client.close();

		return [stringifyObjectIDs(returnData)];
	}
}
