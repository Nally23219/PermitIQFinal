import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = process.env.PORT || 3000; // Render provides this port automatically

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// This creates a basic webpage when someone visits your Render URL
app.get('/', async (req, res) => {
  try {
    // This is just a test to prove your AI connection works
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Say hello!' }],
    });

    res.send(`<h1>Your AI Website is Live!</h1><p>Claude says: ${message.content[0].text}</p>`);
  } catch (error) {
    res.status(500).send(`Server is running, but AI failed: ${error.message}`);
  }
});

// This keeps the server alive and listening for visitors
app.listen(port, () => {
  console.log(`Server is running beautifully on port ${port}`);
});
