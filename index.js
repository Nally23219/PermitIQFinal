import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  try {
    // Sending a direct network request to Anthropic's gateway 
    // using the updated Claude model naming convention
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', // Updated to the correct current string
        max_tokens: 1000,
        messages: [{ role: 'user', content: 'Say hello!' }],
      }),
    });

    const data = await response.json();

    // If Anthropic returns an error object, display it clearly on the screen
    if (data.error) {
      return res.status(response.status).send(`
        <h1>API Direct Connection Rejected</h1>
        <p><strong>Status Code:</strong> ${response.status}</p>
        <p><strong>Error Type:</strong> ${data.error.type}</p>
        <p><strong>Message:</strong> ${data.error.message}</p>
      `);
    }

    // Success! Extract the text content from Claude's response payload
    const replyText = data.content[0].text;
    res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h1 style="color: #2b579a;">Your AI Website is Live!</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #333;"><strong>Claude says:</strong> ${replyText}</p>
      </div>
    `);

  } catch (error) {
    res.status(500).send(`<h1>Server Connection Error</h1><p>${error.message}</p>`);
  }
});

app.listen(port, () => {
  console.log(`Server running beautifully on port ${port}`);
});
