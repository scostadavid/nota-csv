const xml2js = require('xml2js');
const { s3 } = require('../infra/s3Client');
const { dynamo } = require('../infra/dynamoClient');
const { ses } = require('../infra/sesClient');

const BUCKET = process.env.INCOMING_BUCKET
const TABLE_NAME = process.env.TABLE_NAME
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET;
const FROM_EMAIL = process.env.FROM_EMAIL;

const DOWNLOAD_URL_TTL = 60 * 60 * 24 * 7; // 7 days

const {parse, transformXmlToJson} = require('../lib/nfe');

// Sends an email, but never throws — an email failure must not fail the job.
const sendEmail = async (to, subject, html) => {
  try {
    await ses.sendEmail({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html } },
      },
    }).promise();
  } catch (err) {
    console.error('Failed to send email', err);
  }
};

module.exports.handler = async (event) => {
  for (const record of event.Records) {
    const { email, createdAt } = JSON.parse(record.body);

    try {
      const { Item } = await dynamo.get({
        TableName: TABLE_NAME,
        Key: { email, createdAt }
      }).promise();

      if (!Item || !Item.filesUploaded) throw new Error('No item found');

      const allData = [];

      for (const filename of Item.filesUploaded) {
        const key = `uploads/${email}/${createdAt}_${filename}`;
        const xmlObject = await s3.getObject({
          Bucket: BUCKET,
          Key: key
        }).promise();

        const parsedXml = await xml2js.parseStringPromise(xmlObject.Body.toString());
        const data = transformXmlToJson(parsedXml);
        allData.push(data);
      }

      const csvFull = parse(allData);

      const csvKey = `csv/${email}/${createdAt}.csv`;
      await s3.putObject({
        Bucket: PROCESSED_BUCKET,
        Key: csvKey,
        Body: csvFull,
        ContentType: 'text/csv'
      }).promise();

      await dynamo.update({
        TableName: TABLE_NAME,
        Key: { email, createdAt },
        UpdateExpression: 'set #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'done' }
      }).promise();

      const downloadUrl = s3.getSignedUrl('getObject', {
        Bucket: PROCESSED_BUCKET,
        Key: csvKey,
        Expires: DOWNLOAD_URL_TTL
      });

      console.log(`CSV ready at ${downloadUrl}`);

      await sendEmail(
        email,
        'Seu CSV do NotaCSV está pronto',
        `<p>Olá!</p>
         <p>Seus arquivos XML foram convertidos com sucesso.</p>
         <p><a href="${downloadUrl}">Clique aqui para baixar o CSV</a> (link válido por 7 dias).</p>
         <p>— NotaCSV</p>`
      );

    } catch (err) {
      console.error('Processing error', err);

      await dynamo.update({
        TableName: TABLE_NAME,
        Key: { email, createdAt },
        UpdateExpression: 'set #s = :s',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':s': 'error' }
      }).promise();

      await sendEmail(
        email,
        'Erro ao processar seus arquivos no NotaCSV',
        `<p>Olá,</p>
         <p>Não conseguimos processar os arquivos XML que você enviou.</p>
         <p>Verifique se os arquivos são NFS-e válidas e tente novamente.</p>
         <p>— NotaCSV</p>`
      );
    }
  }
}
