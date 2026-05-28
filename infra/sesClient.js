const AWS = require('aws-sdk');
const { clientOptions } = require('./config');
exports.ses = new AWS.SES(clientOptions);
