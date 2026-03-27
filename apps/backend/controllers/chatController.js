// /controllers/chatController.js

const path = require('path');
const { readArray, writeArray } = require('../utils/jsonStore');
const MESSAGES_FILE = path.join(__dirname, '..', 'data', 'messages.json');
let messages = readArray(MESSAGES_FILE);

exports.proxyToDify = async (req, res) => {
  const { query, conversation_id, user } = req.body;
  
  const fetch = (await import('node-fetch')).default;

  const chatApiKey = process.env.DIFY_CHAT_API_KEY || process.env.DIFY_API_KEY;
  if (!chatApiKey) {
    return res.status(500).json({ message: 'Configure DIFY_CHAT_API_KEY ou DIFY_API_KEY para o chat.' });
  }

  try {
    const difyResponse = await fetch('https://api.dify.ai/v1/chat-messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chatApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: {},
        query: query,
        user: req.user?.email || user || 'anonymous',
        response_mode: "streaming",
        conversation_id: conversation_id
      })
    });

    if (!difyResponse.ok) {
        const errorBody = await difyResponse.text();
        console.error('Erro da API do Dify:', errorBody);
        return res.status(difyResponse.status).json({ message: 'Erro ao se comunicar com o assistente.' });
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    difyResponse.body.on('data', (chunk) => {
      try {
        const text = chunk.toString('utf8');
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const json = JSON.parse(line.replace('data: ', ''));
          if (json.event === 'message' || json.event === 'agent_message') {
            messages.push({
              conversationId: conversation_id || json.conversation_id,
              role: 'assistant',
              text: json.answer || '',
              timestamp: new Date().toISOString()
            });
          }
          if (json.event === 'message' && json.query) {
            messages.push({
              conversationId: conversation_id || json.conversation_id,
              role: 'user',
              text: json.query,
              timestamp: new Date().toISOString()
            });
          }
        }
        writeArray(MESSAGES_FILE, messages);
      } catch {}
    });
    difyResponse.body.pipe(res);

  } catch (error) {
    console.error('Erro no proxy de chat:', error);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
};

exports.deleteConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const initialLength = messages.length;
    messages = messages.filter(m => m.conversationId !== conversationId);
    writeArray(MESSAGES_FILE, messages);
    res.json({ removed: initialLength - messages.length });
  } catch (error) {
    console.error('Erro ao apagar mensagens:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};
