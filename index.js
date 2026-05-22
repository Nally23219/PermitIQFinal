import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = process.env.PORT || 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get('/', async (req, res) => {
  try {
    // Testing using Haiku to isolate connection issues
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say hello!' }],
    });

    res.send(`<h1>Success!</h1><p>Claude says: ${message.content[0].text}</p>`);
  } catch (error) {
    res.status(500).send(`
      <h1>Server is Running, but API Call Failed</h1>
      <p><strong>Error type:</strong> ${error.name}</p>
      <p><strong>Message:</strong> ${error.message}</p>
    `);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
