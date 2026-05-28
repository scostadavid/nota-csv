const { signup, isValidEmail } = require('../services/signup');

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    let email;
    try {
      ({ email } = JSON.parse(event.body || '{}'));
    } catch (err) {
      return response(400, { message: 'Invalid JSON body' });
    }

    if (!isValidEmail(email)) {
      return response(400, { message: 'A valid email is required' });
    }

    const apiKey = await signup(email);

    return response(200, { apiKey });
  } catch (err) {
    console.error('Signup error', err);
    return response(500, { message: 'Internal server error' });
  }
};
