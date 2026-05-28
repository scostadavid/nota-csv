const { dynamo } = require('../infra/dynamoClient');

const USAGE_TABLE = process.env.USAGE_TABLE;
const MONTHLY_LIMIT = parseInt(process.env.MONTHLY_LIMIT || '100', 10);
const NINETY_DAYS_SECONDS = 60 * 60 * 24 * 90;

// Current monthly window, e.g. "2026-05".
const currentWindow = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
};

class QuotaExceededError extends Error {
  constructor() {
    super('Monthly quota exceeded');
    this.name = 'QuotaExceededError';
  }
}

// Atomically counts one request against the API key's monthly quota.
// Throws QuotaExceededError when the limit is already reached.
const checkAndIncrement = async (apiKey) => {
  const windowKey = currentWindow();
  const ttl = Math.floor(Date.now() / 1000) + NINETY_DAYS_SECONDS;

  try {
    await dynamo.update({
      TableName: USAGE_TABLE,
      Key: { apiKey, windowKey },
      UpdateExpression: 'ADD #count :one SET #ttl = if_not_exists(#ttl, :ttl)',
      ConditionExpression: 'attribute_not_exists(#count) OR #count < :limit',
      ExpressionAttributeNames: { '#count': 'count', '#ttl': 'ttl' },
      ExpressionAttributeValues: {
        ':one': 1,
        ':limit': MONTHLY_LIMIT,
        ':ttl': ttl,
      },
    }).promise();
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      throw new QuotaExceededError();
    }
    throw err;
  }
};

module.exports = { checkAndIncrement, QuotaExceededError, currentWindow };
