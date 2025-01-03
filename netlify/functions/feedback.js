const { MongoClient } = require('mongodb');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async function(event, context) {
  // Set up CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await client.connect();

    const feedback = JSON.parse(event.body);
    
    // Store feedback in MongoDB
    const db = client.db('forensic-reports');
    const feedbackCollection = db.collection('feedback');
    
    await feedbackCollection.insertOne({
      ...feedback,
      processed: false,
      createdAt: new Date()
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Feedback stored successfully',
        success: true
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        success: false
      })
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
};
