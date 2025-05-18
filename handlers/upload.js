const AWS = require('aws-sdk');
const Busboy = require('busboy');

const s3 = new AWS.S3()
const sqs = new AWS.SQS()
const dynamo = new AWS.DynamoDB.DocumentClient()

const BUCKET = process.env.INCOMING_BUCKET
const QUEUE_URL = process.env.QUEUE_URL
const TABLE_NAME = process.env.TABLE_NAME

module.exports.index = async (event) => {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: event.headers
    })

    const files = [];
    let email = null;

    busboy.on('field', (fieldname, val) => {
      if (fieldname === 'email') {
        email = val;
      }
    })

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      if (files.length >= 5) {
        file.resume();
        return;
      }

      const chunks = []
      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        files.push({ filename, fileBuffer, mimetype });
      });
    });

    busboy.on('finish', async () => {
      if (!email) {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ message: 'Email is required' }),
        });
      }
      if (files.length === 0) {
        return resolve({
          statusCode: 400,
          body: JSON.stringify({ message: 'At least one file is required' }),
        });
      }

      try {
        const createdAt = Date.now();

        const uploadPromises = files.map(({ filename, fileBuffer }) =>
        {
          return s3.putObject({
            Bucket: BUCKET,
            Key: `uploads/${email}/${createdAt}_${filename.filename}`,
            Body: fileBuffer,
            ContentType: 'application/xml',
          }).promise();
        }
        )
        await Promise.all(uploadPromises);

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

        return resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'Upload successful' }),
        });

      } catch (error) {
        console.error('Upload error', error)
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: 'Internal server error' }),
        });
      }
    })

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  })
}
