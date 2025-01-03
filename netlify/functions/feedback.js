const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const AWS = require('aws-sdk');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const s3 = new AWS.S3({
  accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.MY_AWS_SECRET_KEY
});

async function checkAndTriggerFineTuning(client) {
  const feedbackCollection = client.db('forensic-reports').collection('feedback');
  const configCollection = client.db('forensic-reports').collection('config');

  // Get unprocessed feedback
  const feedbackData = await feedbackCollection
    .find({ processed: { $ne: true }, rating: { $gte: 6 } })
    .toArray();

  if (feedbackData.length >= 10) { // Adjust threshold as needed
    // Format data for fine-tuning
    const trainingData = feedbackData.map(item => ({
      messages: [
        {
          role: 'system',
          content: 'You are an expert forensic engineer generating professional report sections.'
        },
        {
          role: 'user',
          content: `Generate ${item.section} section`
        },
        {
          role: 'assistant',
          content: item.content
        }
      ]
    }));

    // Save to S3
    const timestamp = new Date().toISOString();
    const s3Key = `training-data/${timestamp}.jsonl`;
    
    await s3.putObject({
      Bucket: process.env.S3_BUCKET,
      Key: s3Key,
      Body: trainingData.map(JSON.stringify).join('\n'),
      ContentType: 'application/jsonl'
    }).promise();

    try {
      // Create OpenAI file
      const file = await openai.files.create({
        file: Buffer.from(trainingData.map(JSON.stringify).join('\n')),
        purpose: 'fine-tune'
      });

      // Start fine-tuning
      const fineTuningJob = await openai.fineTuning.jobs.create({
        model: 'gpt-3.5-turbo',
        training_file: file.id
      });

      // Update config with new model info
      await configCollection.updateOne(
        { key: 'latest_model' },
        {
          $set: {
            modelId: fineTuningJob.fine_tuned_model,
            lastFineTuned: new Date(),
            trainingSize: feedbackData.length
          }
        },
        { upsert: true }
      );

      // Mark feedback as processed
      const feedbackIds = feedbackData.map(item => item._id);
      await feedbackCollection.updateMany(
        { _id: { $in: feedbackIds } },
        { $set: { processed: true } }
      );
    } catch (error) {
      console.error('Fine-tuning error:', error);
      throw error;
    }
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

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();
    const feedbackCollection = client.db('forensic-reports').collection('feedback');

    const feedback = JSON.parse(event.body);
    await feedbackCollection.insertOne({
      ...feedback,
      processed: false,
      createdAt: new Date()
    });

    // Check if we should trigger fine-tuning
    await checkAndTriggerFineTuning(client);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Feedback stored successfully' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to store feedback' })
    };
  } finally {
    await client.close();
  }
};
