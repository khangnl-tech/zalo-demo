const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const { CHAT_APP_API_KEY, ZALO_OA_ACCESS_TOKEN } = process.env;

app.post('/zalo-webhook', async (req, res) => {
    const { message, sender } = req.body;
    const userMessage = message.text;

    try {
        const response = await axios.post(
            'http://workflow.aiwow.vn/v1/chat-messages',
            {
                query: userMessage,
                response_mode: 'blocking',
                user: sender.id,
                conversation_id: sender.id
            },
            {
                headers: {
                    'Authorization': `Bearer ${CHAT_APP_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const reply = response.data.answer;

        await axios.post(
            'https://openapi.zalo.me/v2.0/oa/message',
            {
                recipient: { user_id: sender.id },
                message: { text: reply }
            },
            {
                headers: {
                    'access_token': ZALO_OA_ACCESS_TOKEN
                }
            }
        );

        res.status(200).send('Message sent');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing message');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
