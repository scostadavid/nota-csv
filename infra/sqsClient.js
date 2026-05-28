const AWS = require('aws-sdk');
const { clientOptions } = require('./config');
exports.sqs = new AWS.SQS(clientOptions);
