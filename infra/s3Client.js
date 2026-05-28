const AWS = require('aws-sdk');
const { clientOptions } = require('./config');
exports.s3 = new AWS.S3(clientOptions);
