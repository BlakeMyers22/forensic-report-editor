const { MongoClient } = require('mongodb');

exports.handler = async function(event, context) {
  console.log('Function started');
  console.log('Event body:', event.body);
  
  const headers = {.
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  console.log('HTTP Method:', event.httpMethod);

  let client;
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'exists' : 'missing');
    
    client = new MongoClient(process.env.MONGODB_URI);
    console.log('MongoDB client created');
    
    await client.connect();
    console.log('Connected to MongoDB');

    const feedback = JSON.parse(event.body);
    console.log('Parsed feedback:', feedback);
    
    const db = client.db('forensic-reports');
    const feedbackCollection = db.collection('feedback');
    
    const result = await feedbackCollection.insertOne({
      ...feedback,
      processed: false,
      createdAt: new Date()
    });
    
    console.log('Feedback stored, result:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Feedback stored successfully',
        success: true 
      })
    };

  } catch (error) {
    console.error('Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        success: false
      })
    };
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
};
