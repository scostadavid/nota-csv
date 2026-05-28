const Busboy = require('busboy');

const isXml = (filename, mimeType) => {
  const name = (filename || '').toLowerCase();
  return name.endsWith('.xml') || mimeType === 'text/xml' || mimeType === 'application/xml';
};

exports.parseMultipart = (event) => {
  return new Promise((resolve, reject) => {
    if (!event.body) {
      return reject(new Error('Empty request body'));
    }

    const busboy = Busboy({
      headers: event.headers
    });

    const files = [];
    const rejectedFiles = [];
    let email = null;

    busboy.on('field', (fieldname, val) => {
      if (fieldname === 'email') {
        email = val;
      }
    });

    // busboy v1: file event is (name, stream, info), info = { filename, encoding, mimeType }
    busboy.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info;

      if (files.length >= 5) {
        file.resume();
        return;
      }

      if (!isXml(filename, mimeType)) {
        rejectedFiles.push(filename);
        file.resume();
        return;
      }

      const chunks = [];

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        const fileBuffer = Buffer.concat(chunks);
        files.push({ filename, fileBuffer, mimeType });
      });
    });

    busboy.on('error', reject);

    busboy.on('finish', () => {
      resolve({ email, files, rejectedFiles });
    });

    busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
  });
};
