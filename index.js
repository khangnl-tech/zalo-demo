const express = require('express');
const axios = require('axios');
require('dotenv').config();

const { v5: uuidv5 } = require('uuid');

const app = express();
app.use(express.json());

const { API_KEY, ZALO_OA_ACCESS_TOKEN } = process.env;
const NAMESPACE = 'e8e10f1e-79b0-4c1d-98ad-8f892b12b4af'; // Một UUID cố định dùng làm namespace

// Lưu conversation_id theo user_id để duy trì hội thoại
const conversationMap = {};

// Route để nhận webhook từ Zalo OA
app.post('/zalo-webhook', async (req, res) => {
    const { message, sender } = req.body;
    const userMessage = message.text;
    const userId = sender.id;

    console.log("conversationMap[userId]", conversationMap[userId]);
    // Tạo UUID cho conversation_id dựa trên user_id
    const conversationId = conversationMap[userId] || "";
    console.log(conversationId);

    try {
        // Gửi yêu cầu tới Dify API
        const chatbotResponse = await axios.post(
            'https://api.dify.ai/v1/chat-messages',
            {
                query: userMessage,
                inputs: {},
                response_mode: 'blocking',  // hoặc "blocking/ streaming" nếu muốn nhận toàn bộ kết quả ngay lập tức
                user: sender.id,
                conversation_id: conversationId,  // sử dụng conversation_id để duy trì hội thoại
                files: [
                    {
                        type: "image",
                        transfer_method: "remote_url",
                        url: "https://cloud.dify.ai/logo/logo-site.png"
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("conversationMap[userId]", conversationMap[userId])
        // Cập nhật lại conversation_id nếu hội thoại mới được khởi tạo
        if (!conversationMap[userId]) {
            conversationMap[userId] = chatbotResponse.data.conversation_id;
        }

        const reply = chatbotResponse.data.answer;
        console.log("Chatbot response:", reply);

        // Gửi phản hồi về cho người dùng qua Zalo OA
        const zaloResponse = await axios.post(
            'https://openapi.zalo.me/v3.0/oa/message/cs',
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
    
        console.log("Zalo OA response:", zaloResponse.data); // In phản hồi từ Zalo
        res.status(200).send('Message sent');
    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
        res.status(500).send('Error processing message');
    }
});

// Khởi chạy server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
