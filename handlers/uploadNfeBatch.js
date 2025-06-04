const { uploadNfeBatch } = require('../services/uploadNfeBatch');
const { parseMultipart } = require('../utils/parseMultipart');

exports.handler = async (event) => {
  try {
    const { email, files } = await parseMultipart(event);

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email is required' }),
      };
    }

    if (!files || files.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'At least one file is required' }),
      };
    }

    await uploadNfeBatch(email, files);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Upload successful' }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
