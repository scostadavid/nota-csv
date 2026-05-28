// Shared AWS SDK client options.
//
// aws-sdk v2 does not read AWS_ENDPOINT_URL automatically (unlike v3), so when
// the code runs against LocalStack we build the endpoint explicitly from the
// env vars LocalStack injects into Lambda containers.
const endpoint =
  process.env.AWS_ENDPOINT_URL ||
  (process.env.LOCALSTACK_HOSTNAME
    ? `http://${process.env.LOCALSTACK_HOSTNAME}:4566`
    : null);

const clientOptions = endpoint
  ? {
      endpoint,
      region: process.env.AWS_REGION || 'us-east-1',
      s3ForcePathStyle: true, // ignored by non-S3 clients
    }
  : {};

module.exports = { clientOptions, endpoint };
