const OpenAI = require('openai');
const { MongoClient } = require('mongodb');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getLatestModelId() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const configCollection = client.db('forensic-reports').collection('config');
    const config = await configCollection.findOne({ key: 'latest_model' });
    return config?.modelId || 'gpt-3.5-turbo';
  } catch (error) {
    console.error('Error fetching latest model ID:', error);
    return 'gpt-3.5-turbo';
  } finally {
    await client.close();
  }
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { section, context } = JSON.parse(event.body);
    const modelId = await getLatestModelId();

    const completion = await openai.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: 'You are an expert forensic engineer generating professional report sections. Use formal technical language and provide detailed analysis.'
        },
        {
          role: 'user',
          content: `Generate the "${section}" section for a forensic engineering report with the following context: ${JSON.stringify(context)}`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: completion.choices[0].message.content,
        section: section
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate report section',
        details: error.message
      })
    };
  }
};
