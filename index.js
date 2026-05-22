import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = process.env.PORT || 3000;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.get('/', async (req, res) => {
  try {
    // This asks Anthropic to send back a list of models your key has access to
    const response = await anthropic.models.list();
    
    // Format the list neatly so we can read it on the screen
    const modelNames = response.data.map(m => `<li>${m.id}</li>`).join('');
    
    res.send(`
      <h1>Diagnostic Test: Connection Successful!</h1>
      <p>Your API key is working. Here are the models your account is allowed to use right now:</p>
      <ul>${modelNames}</ul>
    `);
  } catch (error) {
    res.status(500).send(`
      <h1>Diagnostic Test Failed</h1>
      <p><strong>Error Message:</strong> ${error.message}</p>
      <p>If you see a 404 'Not Found' here, your key is being completely rejected by Anthropic.</p>
    `);
  }
});

app.listen(port, () => {
  console.log(`Diagnostic server running on port ${port}`);
});
