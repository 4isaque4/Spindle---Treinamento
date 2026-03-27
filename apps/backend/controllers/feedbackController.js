// /controllers/feedbackController.js
const fetch = require('node-fetch');

// Persistência simples em disco (JSON)
const path = require('path');
const { readArray, writeArray } = require('../utils/jsonStore');
const FEEDBACKS_FILE = path.join(__dirname, '..', 'data', 'feedbacks.json');
let feedbacks = readArray(FEEDBACKS_FILE);

// URLs de automação Windmill
const FEEDBACK_WEBHOOK_URL =
  process.env.FEEDBACK_WEBHOOK_URL ||
  'https://windmill.spindl.me/api/r/admins/feedback';

const DEFAULT_SOURCE_ADMIN = 'admin';
const DEFAULT_SOURCE_PUBLIC = 'chatbot';

const getNextFeedbackId = () => {
  if (!feedbacks.length) return 1;
  return Math.max(...feedbacks.map(f => Number(f.id) || 0)) + 1;
};

const normalizeFeedbackBody = (body = {}) => body.feedback ? body.feedback : body;

const normalizeRating = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

async function persistFeedback({ message, rating, category, conversationId, userId, source }) {
  const newFeedback = {
    id: getNextFeedbackId(),
    userId: userId || 'anonymous',
    message,
    rating,
    category,
    conversationId,
    source,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  feedbacks.push(newFeedback);
  writeArray(FEEDBACKS_FILE, feedbacks);

  try {
    await fetch(FEEDBACK_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: String(newFeedback.id),
        userId: newFeedback.userId,
        conversationId: newFeedback.conversationId || '',
        rating: newFeedback.rating ?? 0,
        comment: newFeedback.message,
        category: newFeedback.category,
        timestamp: newFeedback.timestamp,
        source: newFeedback.source
      })
    });

    console.log('✅ Feedback enviado para Windmill:', newFeedback.id);
  } catch (webhookError) {
    console.error('❌ Erro ao enviar feedback para Windmill:', webhookError);
    // Continua mesmo se webhook falhar
  }

  return newFeedback;
}

exports.createFeedback = async (req, res) => {
  try {
    const payload = normalizeFeedbackBody(req.body);
    const message = (payload.message || '').trim();
    const rating = normalizeRating(payload.rating);
    const category = payload.category || 'general';

    if (!message) {
      return res.status(400).json({ 
        message: 'Mensagem é obrigatória' 
      });
    }

    if (rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        message: 'Avaliação deve ser entre 1 e 5' 
      });
    }

    const newFeedback = await persistFeedback({
      message,
      rating,
      category,
      conversationId: payload.conversationId,
      userId: req.user?.email || payload.userId || 'anonymous',
      source: payload.source || DEFAULT_SOURCE_ADMIN
    });

    res.status(201).json({
      message: 'Feedback enviado com sucesso!',
      feedback: newFeedback
    });

  } catch (error) {
    console.error('Erro ao criar feedback (autenticado):', error);
    res.status(500).json({ 
      message: 'Erro interno no servidor' 
    });
  }
};

exports.submitPublicFeedback = async (req, res) => {
  try {
    const payload = normalizeFeedbackBody(req.body);
    const message = (payload.message || '').trim();
    const rating = normalizeRating(payload.rating);
    const category = payload.category || 'general';

    if (!message) {
      return res.status(400).json({ 
        message: 'Mensagem é obrigatória' 
      });
    }

    if (rating !== null && (rating < 1 || rating > 5)) {
      return res.status(400).json({ 
        message: 'Avaliação deve ser entre 1 e 5' 
      });
    }

    const newFeedback = await persistFeedback({
      message,
      rating,
      category,
      conversationId: payload.conversationId,
      userId: payload.userEmail || payload.email || payload.userId || 'anonymous',
      source: payload.source || req.body?.source || DEFAULT_SOURCE_PUBLIC
    });

    res.status(201).json({
      message: 'Feedback enviado com sucesso!',
      feedback: newFeedback
    });
  } catch (error) {
    console.error('Erro ao criar feedback (público):', error);
    res.status(500).json({ 
      message: 'Erro interno no servidor' 
    });
  }
};

exports.getFeedbacks = async (req, res) => {
  try {
    const { status, category, limit = 50, offset = 0 } = req.query;
    
    let filteredFeedbacks = [...feedbacks];

    // Filtros
    if (status) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.status === status);
    }
    
    if (category) {
      filteredFeedbacks = filteredFeedbacks.filter(f => f.category === category);
    }

    // Ordenação por timestamp (mais recentes primeiro)
    filteredFeedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Paginação
    const paginatedFeedbacks = filteredFeedbacks.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );

    // Estatísticas
    const stats = {
      total: filteredFeedbacks.length,
      averageRating: filteredFeedbacks.reduce((sum, f) => sum + f.rating, 0) / filteredFeedbacks.length || 0,
      byCategory: {},
      byStatus: {}
    };

    // Agrupar por categoria e status
    filteredFeedbacks.forEach(feedback => {
      stats.byCategory[feedback.category] = (stats.byCategory[feedback.category] || 0) + 1;
      stats.byStatus[feedback.status] = (stats.byStatus[feedback.status] || 0) + 1;
    });

    res.json({
      feedbacks: paginatedFeedbacks,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: filteredFeedbacks.length
      },
      stats
    });

  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error);
    res.status(500).json({ 
      message: 'Erro interno no servidor' 
    });
  }
};

exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const feedback = feedbacks.find(f => f.id === parseInt(id));
    
    if (!feedback) {
      return res.status(404).json({ 
        message: 'Feedback não encontrado' 
      });
    }

    feedback.status = status;
    feedback.updatedAt = new Date().toISOString();
    writeArray(FEEDBACKS_FILE, feedbacks);
    res.json({
      message: 'Status atualizado com sucesso',
      feedback
    });

  } catch (error) {
    console.error('Erro ao atualizar feedback:', error);
    res.status(500).json({ 
      message: 'Erro interno no servidor' 
    });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const initialLength = feedbacks.length;
    feedbacks = feedbacks.filter(f => f.id !== parseInt(id));
    if (feedbacks.length === initialLength) {
      return res.status(404).json({ message: 'Feedback não encontrado' });
    }
    writeArray(FEEDBACKS_FILE, feedbacks);
    res.json({ message: 'Feedback removido' });
  } catch (error) {
    console.error('Erro ao remover feedback:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

exports.getFeedbackStats = async (req, res) => {
  try {
    const stats = {
      total: feedbacks.length,
      averageRating: feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length || 0,
      byRating: {},
      byCategory: {},
      byStatus: {},
      recent: feedbacks
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
    };

    // Agrupar por avaliação
    feedbacks.forEach(feedback => {
      stats.byRating[feedback.rating] = (stats.byRating[feedback.rating] || 0) + 1;
      stats.byCategory[feedback.category] = (stats.byCategory[feedback.category] || 0) + 1;
      stats.byStatus[feedback.status] = (stats.byStatus[feedback.status] || 0) + 1;
    });

    res.json(stats);

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      message: 'Erro interno no servidor' 
    });
  }
};
