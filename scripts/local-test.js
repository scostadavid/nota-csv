// Exercises the deployed Lambdas against LocalStack via direct invocation.
//
// LocalStack Community does not emulate API Gateway v2 (httpApi), so the
// handlers are invoked directly with API-Gateway-shaped events. This covers
// the handler logic plus the S3 / SQS / DynamoDB / SES integrations.
//
// Prerequisite: `npm run localstack:up` then `npm run deploy:local`.

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STAGE = process.env.STAGE || 'local';
const EMAIL = process.env.TEST_EMAIL || 'me@scostadavid.dev';

const lambda = new AWS.Lambda({
  endpoint: 'http://localhost:4566',
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
});

const fnName = (name) => `nfe-${STAGE}-${name}`;

async function invoke(name, event) {
  const res = await lambda.invoke({
    FunctionName: fnName(name),
    Payload: JSON.stringify(event),
  }).promise();
  if (res.FunctionError) {
    throw new Error(`${name} failed: ${res.Payload}`);
  }
  return JSON.parse(res.Payload);
}

// Builds a multipart/form-data body the same way a browser/curl would.
function buildMultipart(email, files) {
  const boundary = '----nota' + crypto.randomBytes(8).toString('hex');
  const chunks = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="email"\r\n\r\n${email}\r\n`),
  ];
  for (const file of files) {
    chunks.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="files"; ` +
      `filename="${file.name}"\r\nContent-Type: application/xml\r\n\r\n`
    ));
    chunks.push(file.buffer);
    chunks.push(Buffer.from('\r\n'));
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(chunks) };
}

(async () => {
  console.log('1) signup');
  const signup = await invoke('signup', { body: JSON.stringify({ email: EMAIL }) });
  console.log('  ', signup.statusCode, signup.body);
  const apiKey = JSON.parse(signup.body).apiKey;

  console.log('2) upload sem x-api-key (espera 401)');
  console.log('  ', (await invoke('upload', { headers: {} })).statusCode);

  console.log('3) upload com x-api-key invalida (espera 403)');
  console.log('  ', (await invoke('upload', { headers: { 'x-api-key': 'nope' } })).statusCode);

  console.log('4) upload valido (espera 200)');
  const xml = fs.readFileSync(path.join(__dirname, '..', 'example', 'nfe.xml'));
  const { boundary, body } = buildMultipart(EMAIL, [{ name: 'nfe.xml', buffer: xml }]);
  const upload = await invoke('upload', {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
      'x-api-key': apiKey,
    },
    body: body.toString('base64'),
    isBase64Encoded: true,
  });
  console.log('  ', upload.statusCode, upload.body);

  console.log('\nO CSV e o e-mail sao gerados de forma assincrona pelo processQueue.');
  console.log('Verifique apos alguns segundos:');
  console.log(`  aws --endpoint-url=http://localhost:4566 s3 ls s3://processed-csv-bucket-${STAGE}-nfe --recursive`);
  console.log('  curl -s http://localhost:4566/_aws/ses');
})().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
