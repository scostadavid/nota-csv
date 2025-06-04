const AWS = require('aws-sdk');
const xml2js = require('xml2js');
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const BUCKET = process.env.INCOMING_BUCKET
const TABLE_NAME = process.env.TABLE_NAME
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET;

const {parse, transformXmlToJson} = require('../lib/nfe');

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    const { email, createdAt } = JSON.parse(record.body);

    try {
      const { Item } = await dynamo.get({
        TableName: TABLE_NAME,
        Key: { email, createdAt }
      }).promise();

      if (!Item || !Item.filesUploaded) throw new Error('No item found');

      const allData = [];
      
      for (const file of Item.filesUploaded) {
        const key = `uploads/${email}/${createdAt}_${file.filename}`;
        const xmlObject = await s3.getObject({
          Bucket: BUCKET,
          Key: key
        }).promise();

        const parsedXml = await xml2js.parseStringPromise(xmlObject.Body.toString());
        const data = transformXmlToJson(parsedXml);
        allData.push(data);
      }

      const csvFull = parse(allData); 

      const csvKey = `csv/${email}/${createdAt}.csv`;
      await s3.putObject({
        Bucket: PROCESSED_BUCKET,
        Key: csvKey,
        Body: csvFull,
        ContentType: 'text/csv'
      }).promise();

      await dynamo.update({
        TableName: TABLE_NAME,
        Key: { email, createdAt },
        UpdateExpression: 'set #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'done' }
      }).promise();

      console.log(`CSV ready at https://${PROCESSED_BUCKET}.s3.amazonaws.com/${csvKey}`);

    } catch (err) {
      console.error('Processing error', err);

      await dynamo.update({
        TableName: TABLE_NAME,
        Key: { email, createdAt },
        UpdateExpression: 'set #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'error' }
      }).promise();
    }
  }
}
