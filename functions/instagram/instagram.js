const process = require('process');
const axios   = require('axios');
const qs      = require('qs');

const handler = async function (event) {

  console.log('instagram.js was called...')
  const params = qs.stringify(event.queryStringParameters)
  console.log('params', params)

  // Get env var values defined in our Netlify site UI
  const endpoint = 'https://graph.instagram.com';
  const userId = process.env.INSTAGRAM_USER_ID;
  const fields = 'caption,media_url,media_type,permalink';
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const url = `${endpoint}/${userId}/media/?fields=${fields}&access_token=${token}`;
  console.log('Constructed URL is ...', url)

  try {
    const { data } = await axios.get(url)
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow from anywhere 
      },
      body: JSON.stringify(data),
    }
  } catch (error) {
    // axios only populates error.response when a response was received.
    // Network errors, timeouts and DNS failures have no response object, so
    // reading it unconditionally would throw a second time inside the catch.
    if (error.response) {
      const { data, headers, status, statusText } = error.response
      return {
        statusCode: status,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, statusText, headers, data }),
      }
    }
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    }
  }
}

module.exports = { handler }
