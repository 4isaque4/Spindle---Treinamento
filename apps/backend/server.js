const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const feedbackController = require('./controllers/feedbackController');

// Lista de origens permitidas atualizada
const allowedOrigins = [
  'https://www.spindl.me',
  'https://spindl.me',
  'https://spindle.spinengenharia.com.br',
  'http://spindle.spinengenharia.com.br',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://192.168.0.90',
  'http://192.168.0.90'
];

// Configuração robusta de CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sem origem (como apps mobile ou Postman)
    if (!origin) return callback(null, true);
    
    // Permitir todas as origens da rede local (192.168.*.*)
    const isLocalNetwork = origin && origin.match(/https?:\/\/(192\.168\.\d+\.\d+|localhost)(:\d+)?/);
    
    if (allowedOrigins.indexOf(origin) !== -1 || 
        isLocalNetwork ||
        (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',').includes(origin))) {
      callback(null, true);
    } else {
      console.log("Origem bloqueada pelo CORS:", origin);
      callback(new Error('Não permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200 // Importante para navegadores legados e alguns preflights
};

// Aplicar CORS antes de qualquer rota
app.use(cors(corsOptions));

// Tratar explicitamente requisições OPTIONS (Preflight)
app.options('*', cors(corsOptions));

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'Spindle Backend API', 
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Rota principal da API
app.use('/api', require('./routes/api'));

// Webhooks públicos (sem autenticação)
app.post('/api/webhook/feedback', feedbackController.submitPublicFeedback);

// Inicia o servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor seguro rodando na porta ${PORT}`);
});