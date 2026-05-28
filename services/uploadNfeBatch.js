const { s3 } = require('../infra/s3Client');
const { sqs } = require('../infra/sqsClient');
const { dynamo } = require('../infra/dynamoClient');

const BUCKET = process.env.INCOMING_BUCKET;
const QUEUE_URL = process.env.QUEUE_URL;
const TABLE_NAME = process.env.TABLE_NAME;

exports.uploadNfeBatch = async (email, files) => {
  const createdAt = Date.now();

  await Promise.all(
    files.map(({ filename, fileBuffer }) =>
      s3.putObject({
        Bucket: BUCKET,
        Key: `uploads/${email}/${createdAt}_${filename}`,
        Body: fileBuffer,
        ContentType: 'application/xml',
      }).promise()
    )
  );

  await dynamo.put({
    TableName: TABLE_NAME,
    Item: {
      email,
      createdAt,
      filesUploaded: files.map(f => f.filename),
      status: 'uploaded',
    },
  }).promise();

  await sqs.sendMessage({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify({ email, createdAt }),
  }).promise();
};
