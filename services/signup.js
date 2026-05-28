const crypto = require('crypto');
const { dynamo } = require('../infra/dynamoClient');

const API_KEYS_TABLE = process.env.API_KEYS_TABLE;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (email) => typeof email === 'string' && EMAIL_REGEX.test(email);

exports.isValidEmail = isValidEmail;

// Registers an email and returns its API key. If the email already signed up,
// the existing key is returned instead of creating a new one.
exports.signup = async (email) => {
  const existing = await dynamo.query({
    TableName: API_KEYS_TABLE,
    IndexName: 'EmailIndex',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
    Limit: 1,
  }).promise();

  if (existing.Items && existing.Items.length > 0) {
    return existing.Items[0].apiKey;
  }

  const apiKey = crypto.randomBytes(24).toString('hex');

  await dynamo.put({
    TableName: API_KEYS_TABLE,
    Item: {
      apiKey,
      email,
      plan: 'free',
      createdAt: Date.now(),
    },
  }).promise();

  return apiKey;
};
