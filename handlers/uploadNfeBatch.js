const { uploadNfeBatch } = require('../services/uploadNfeBatch');
const { parseMultipart } = require('../utils/parseMultipart');
const { dynamo } = require('../infra/dynamoClient');
const { checkAndIncrement, QuotaExceededError } = require('../lib/usage');

const API_KEYS_TABLE = process.env.API_KEYS_TABLE;

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    // httpApi (API Gateway v2) lowercases all header names.
    const apiKey = event.headers && event.headers['x-api-key'];
    if (!apiKey) {
      return response(401, { message: 'Missing x-api-key header' });
    }

    const { Item: keyItem } = await dynamo.get({
      TableName: API_KEYS_TABLE,
      Key: { apiKey },
    }).promise();

    if (!keyItem) {
      return response(403, { message: 'Invalid API key' });
    }

    const { email, files, rejectedFiles } = await parseMultipart(event);

    if (!email) {
      return response(400, { message: 'Email is required' });
    }

    if (!files || files.length === 0) {
      const message = rejectedFiles && rejectedFiles.length > 0
        ? 'Only .xml files are accepted'
        : 'At least one file is required';
      return response(400, { message });
    }

    try {
      await checkAndIncrement(apiKey);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return response(429, { message: 'Monthly quota exceeded' });
      }
      throw err;
    }

    await uploadNfeBatch(email, files);

    return response(200, { message: 'Upload successful' });
  } catch (err) {
    console.error('Upload error', err);
    return response(500, { message: 'Internal server error' });
  }
};
