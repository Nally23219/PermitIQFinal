import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  // 1. Check if Render can even see your key
  const rawKey = process.env.ANTHROPIC_API_KEY;
  const keyExists = !!rawKey;
  const keyLength = rawKey ? rawKey.length : 0;
  const keyStart = rawKey ? rawKey.substring(0, 7) : 'None';
  const keyEnd = rawKey ? rawKey.substring(rawKey.length - 4) : 'None';

  // 2. Safely attempt the API call
  let apiError = 'None';
  try {
    const anthropic = new Anthropic({ apiKey: rawKey });
    await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
  } catch (error) {
    apiError = `${error.name}: ${error.message}`;
  }

  // 3. Print everything out cleanly on the webpage
  res.send(`
    <h1>Developer Diagnostic Dashboard</h1>
    <hr />
    <h3>1. Environment Variable Check</h3>
    <ul>
      <li><strong>Key Detected by Render:</strong> ${keyExists ? '✅ YES' : '❌ NO'}</li>
      <li><strong>Character Count:</strong> ${keyLength} characters</li>
      <li><strong>Key Starts With:</strong> <code>${keyStart}</code> (Should look like sk-ant-)</li>
      <li><strong>Key Ends With:</strong> <code>${keyEnd}</code></li>
    </ul>
    
    <h3>2. Anthropic API Response</h3>
    <p><strong>Error Message:</strong> <code>${apiError}</code></p>
    
    <hr />
    <p><em>Note: If Key Detected is NO, or if Character Count looks wrong, Render is failing to inject your Environment Variable into the code.</em></p>
  `);
});

app.listen(port, () => {
  console.log(`Debug server running on port ${port}`);
});
