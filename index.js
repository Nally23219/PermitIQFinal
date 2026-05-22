import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  try {
    // We send a direct, raw network request to bypass any SDK routing glitches
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Say hello!' }],
      }),
    });

    const data = await response.json();

    // If Anthropic returns an error object, display it clearly
    if (data.error) {
      return res.status(response.status).send(`
        <h1>API Direct Connection Rejected</h1>
        <p><strong>Status Code:</strong> ${response.status}</p>
        <p><strong>Error Type:</strong> ${data.error.type}</p>
        <p><strong>Message:</strong> ${data.error.message}</p>
      `);
    }

    // Success! Extract the text content from the response
    const replyText = data.content[0].text;
    res.send(`<h1>Your AI Website is Live!</h1><p>Claude says: ${replyText}</p>`);

  } catch (error) {
    res.status(500).send(`<h1>Server Connection Error</h1><p>${error.message}</p>`);
  }
});

app.listen(port, () => {
  console.log(`Server running beautifully on port ${port}`);
});
