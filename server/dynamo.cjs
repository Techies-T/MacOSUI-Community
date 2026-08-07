const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-northeast-1';

// Create a raw DynamoDB client
const client = new DynamoDBClient({ region: REGION });

// Create a DocumentClient for easier interaction with JS objects
const docClient = DynamoDBDocumentClient.from(client, {
    marshallOptions: {
        removeUndefinedValues: true,
    }
});

module.exports = {
    docClient,
    TABLE_PREFIX: 'MacOSUI-'
};
