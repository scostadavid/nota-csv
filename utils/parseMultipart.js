const Busboy = require('busboy');

exports.parseMultipart = (event) => {
    return new Promise((resolve, reject) => {
      const busboy = Busboy({
        headers: event.headers
      });

      const files = [];
      let email = null;

      busboy.on('field', (fieldname, val) => {
        if (fieldname === 'email') {
          email = val;
        }
      });

      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        if (files.length >= 5) {
            file.resume();
            return;
          }

          const chunks = [];
          
          file.on('data', (data) => {
            chunks.push(data);
          });

          file.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);
            files.push({ filename, fileBuffer, mimetype });
          });
      });

      busboy.on('error', reject);



      busboy.on('finish', async () => {
        resolve({ email, files });
      });

      busboy.end(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
    });
}