const path = require('path');
const { readArray, writeArray } = require('../utils/jsonStore');

const CORRECTIONS_FILE = path.join(__dirname, '..', 'data', 'corrections.json');
let corrections = readArray(CORRECTIONS_FILE);
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'https://api.dify.ai';
let difyDatasetInfoCache = null;
let difyProcessRuleCache = null;
let isProcessingQueue = false;
const MAX_ATTEMPTS = 3;

// Helper fetch (compatível com node-fetch@3 em CJS)
const fetchCompat = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function sanitizeDocName(name, fallback) {
  const base = (name || fallback || '').trim();
  if (!base) return fallback || `spindle_correction_${Date.now()}.md`;

  let safe = base.replace(/[^\w.\-]/gi, '_').replace(/_+/g, '_');

  if (!safe.toLowerCase().endsWith('.md')) {
    safe = `${safe}.md`;
  }

  return safe;
}

function normalizeCorrectionsState() {
  let changed = false;

  corrections = corrections.map((correction) => {
    if (correction.status === 'publishing') {
      changed = true;
      return { ...correction, status: 'queued' };
    }

    if (correction.status === 'queued' && (correction.publishAttempts || 0) >= MAX_ATTEMPTS) {
      changed = true;
      return { ...correction, status: 'failed' };
    }

    return correction;
  });

  if (changed) {
    writeArray(CORRECTIONS_FILE, corrections);
    console.log('♻️ Correções em andamento foram reconfiguradas para a fila após o restart.');
  }
}

normalizeCorrectionsState();

exports.listCorrections = async (req, res) => {
  const { status } = req.query;
  const filtered = status
    ? corrections.filter((correction) => correction.status === status)
    : corrections;

  res.json({ corrections: filtered });
};

exports.createCorrection = async (req, res) => {
  try {
    const {
      feedbackId,
      conversationId,
      userQuestion = '',
      botAnswer = '',
      correctAnswer,
      category = 'alucinacao',
      tags = [],
      publishNow = false
    } = req.body;

    if (!correctAnswer || !correctAnswer.trim()) {
      return res.status(400).json({ message: 'correctAnswer é obrigatório' });
    }

    const newId = corrections.length ? corrections[corrections.length - 1].id + 1 : 1;
    const docName = sanitizeDocName(req.body?.docName, `spindle_correction_${newId}.md`);

    const newCorrection = {
      id: newId,
      feedbackId: feedbackId || null,
      conversationId: conversationId || null,
      userQuestion,
      botAnswer,
      correctAnswer: correctAnswer.trim(),
      category,
      tags: Array.isArray(tags) ? tags : String(tags || '')
        .split(',').map(t => t.trim()).filter(Boolean),
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email || 'unknown',
      docName
    };

    corrections.push(newCorrection);
    writeArray(CORRECTIONS_FILE, corrections);

    // Enviar para Windmill via webhook
    try {
      const CORRECTION_WEBHOOK_URL =
        process.env.CORRECTION_WEBHOOK_URL ||
        'https://windmill.spindl.me/api/r/admins/correction';
      
      await fetchCompat(CORRECTION_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: String(newCorrection.id),
          category: newCorrection.category,
          tags: newCorrection.tags,
          feedbackId: newCorrection.feedbackId || '',
          conversationId: newCorrection.conversationId || '',
          userQuestion: newCorrection.userQuestion,
          correctAnswer: newCorrection.correctAnswer,
          botAnswer: newCorrection.botAnswer,
          publishNow: publishNow,
          createdBy: newCorrection.createdBy,
          status: newCorrection.status
        })
      });
      console.log('✅ Correção enviada para Windmill:', newCorrection.id);
    } catch (webhookError) {
      console.error('❌ Erro ao enviar correção para Windmill:', webhookError);
      // Continua mesmo se webhook falhar
    }

    if (publishNow) {
      try {
        const published = await publishToDifyInternal(newCorrection);
        return res.status(201).json({ message: 'Correção criada e publicada', correction: published });
      } catch (err) {
        return res.status(201).json({ message: 'Correção criada, mas falhou publicar', error: err?.message, correction: newCorrection });
      }
    }

    res.status(201).json({ message: 'Correção criada', correction: newCorrection });
  } catch (error) {
    console.error('Erro ao criar correção:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

exports.publishCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const correctionIndex = corrections.findIndex(c => c.id === parseInt(id) || c.id === id);
    if (correctionIndex === -1) {
      return res.status(404).json({ message: 'Correção não encontrada' });
    }

    corrections[correctionIndex] = {
      ...corrections[correctionIndex],
      status: 'queued',
      publishAttempts: 0,
      publishError: null
    };
    writeArray(CORRECTIONS_FILE, corrections);

    console.log(`🚀 Correção ${corrections[correctionIndex].id} adicionada à fila para publicação`);

    res.json({ message: 'Correção adicionada à fila para publicação', correction: corrections[correctionIndex] });
  } catch (error) {
    console.error('Erro ao publicar correção:', error);
    res.status(500).json({ message: error?.message || 'Erro ao enfileirar publicação' });
  }
};

exports.updateCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const correctionIndex = corrections.findIndex(
      (c) => c.id === parseInt(id) || c.id === id || c.id?.toString() === id
    );

    if (correctionIndex === -1) {
      return res.status(404).json({ message: 'Correção não encontrada' });
    }

    const payload = req.body || {};
    const current = corrections[correctionIndex];

    if (typeof payload.userQuestion === 'string') {
      current.userQuestion = payload.userQuestion;
    }

    if (typeof payload.botAnswer === 'string') {
      current.botAnswer = payload.botAnswer;
    }

    if (typeof payload.correctAnswer === 'string' && payload.correctAnswer.trim()) {
      current.correctAnswer = payload.correctAnswer.trim();
    }

    if (typeof payload.category === 'string' && payload.category.trim()) {
      current.category = payload.category.trim();
    }

    if (payload.tags !== undefined) {
      current.tags = Array.isArray(payload.tags)
        ? payload.tags
        : String(payload.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }

    if (payload.docName !== undefined) {
      current.docName = sanitizeDocName(
        payload.docName,
        current.docName || `spindle_correction_${current.id}.md`
      );
    }

    current.updatedAt = new Date().toISOString();
    writeArray(CORRECTIONS_FILE, corrections);

    res.json({ message: 'Correção atualizada', correction: current });
  } catch (error) {
    console.error('Erro ao atualizar correção:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

exports.deleteCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const correctionIndex = corrections.findIndex(
      (c) => c.id === parseInt(id) || c.id === id || c.id?.toString() === id
    );

    if (correctionIndex === -1) {
      return res.status(404).json({ message: 'Correção não encontrada' });
    }

    const [removed] = corrections.splice(correctionIndex, 1);
    writeArray(CORRECTIONS_FILE, corrections);

    res.json({ message: 'Correção removida', correction: removed });
  } catch (error) {
    console.error('Erro ao remover correção:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

async function publishToDifyInternal(correction) {
  const datasetId = process.env.DIFY_DATASET_ID;
  const apiKey = process.env.DIFY_DATASET_API_KEY || process.env.DIFY_API_KEY;
  
  // 🔍 DEBUG: Logs para rastreamento
  console.log('🔍 DEBUG PUBLICAÇÃO:');
  console.log('   Dataset ID:', datasetId);
  console.log('   API Key (primeiros 20 chars):', apiKey?.substring(0, 20) + '...');
  console.log('   URL Base:', DIFY_BASE_URL);
  
  if (!datasetId || !apiKey) {
    throw new Error('Defina DIFY_DATASET_ID e DIFY_DATASET_API_KEY (ou DIFY_API_KEY) no backend');
  }

  const { datasetInfo, processRule } = await getDatasetConfig(datasetId, apiKey);

  const content = [
    `# Correção de conhecimento (Spindle)`,
    `Categoria: ${correction.category}`,
    `Tags: ${(Array.isArray(correction.tags) ? correction.tags : []).join(', ')}`,
    correction.feedbackId ? `Feedback ID: ${correction.feedbackId}` : '',
    correction.conversationId ? `Conversation ID: ${correction.conversationId}` : '',
    '',
    '## Pergunta do usuário',
    correction.userQuestion || '(não informado)',
    '',
    '## Resposta correta',
    correction.correctAnswer,
    '',
    '## Resposta anterior do bot (para referência)',
    correction.botAnswer || '(não informado)'
  ].join('\n');

  const resolvedDocName = sanitizeDocName(correction.docName, `spindle_correction_${correction.id}.md`);

  const docFormEnv = process.env.DIFY_DOC_FORM;
  const resolvedDocForm = docFormEnv && docFormEnv !== 'null'
    ? docFormEnv
    : (datasetInfo.doc_form && datasetInfo.doc_form !== 'null' ? datasetInfo.doc_form : undefined);

  const indexingTechnique =
    datasetInfo.indexing_technique ||
    process.env.DIFY_INDEXING_TECHNIQUE ||
    'high_quality';

  const payload = {
    text: content,
    name: resolvedDocName,
    indexing_technique: indexingTechnique
  };

  if (processRule) {
    payload.process_rule = processRule;
  }

  if (resolvedDocForm) {
    payload.doc_form = resolvedDocForm;
  }

  if (process.env.DIFY_DOC_LANGUAGE) {
    payload.doc_language = process.env.DIFY_DOC_LANGUAGE;
  }

  if (datasetInfo.retrieval_model_dict) {
    payload.retrieval_model = datasetInfo.retrieval_model_dict;
  }

  if (datasetInfo.embedding_model && datasetInfo.embedding_model_provider) {
    payload.embedding_model = datasetInfo.embedding_model;
    payload.embedding_model_provider = datasetInfo.embedding_model_provider;
  }

  const url = `${DIFY_BASE_URL}/v1/datasets/${encodeURIComponent(datasetId)}/document/create-by-text`;

  // 🔍 DEBUG: URL final
  console.log('   URL Requisição:', url);
  console.log('   Documento:', resolvedDocName);

  const resp = await fetchCompat(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const body = await resp.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = { raw: body }; }

  // 🔍 DEBUG: Resposta do Dify
  console.log('   Status Resposta:', resp.status);
  console.log('   Resposta Dify:', JSON.stringify(parsed).substring(0, 200));

  if (!resp.ok) {
    throw new Error(`Dify respondeu ${resp.status}: ${body}`);
  }

  const difyDocumentId = parsed?.document?.id || parsed?.document_id || parsed?.id || parsed?.data?.id;

  correction.status = 'published';
  correction.publishedAt = new Date().toISOString();
  correction.docName = resolvedDocName;
  correction.remote = parsed;
  if (difyDocumentId) {
    correction.difyDocumentId = difyDocumentId;
  }
  writeArray(CORRECTIONS_FILE, corrections);
  return correction;
}

exports.updateCorrectionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, publishedAt, difyDocumentId } = req.body;
    
    // Aceita tanto ID numérico quanto string
    const correctionIndex = corrections.findIndex(c => 
      c.id === parseInt(id) || c.id === id || c.id.toString() === id
    );
    if (correctionIndex === -1) {
      return res.status(404).json({ message: 'Correção não encontrada' });
    }

    corrections[correctionIndex].status = status || corrections[correctionIndex].status;
    if (publishedAt) corrections[correctionIndex].publishedAt = publishedAt;
    if (difyDocumentId) corrections[correctionIndex].difyDocumentId = difyDocumentId;
    
    writeArray(CORRECTIONS_FILE, corrections);
    res.json({ message: 'Status atualizado', correction: corrections[correctionIndex] });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

async function processQueuedCorrections() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    for (const correction of corrections) {
      if (correction.status !== 'queued') continue;

      correction.status = 'publishing';
      correction.publishAttempts = (correction.publishAttempts || 0) + 1;
      writeArray(CORRECTIONS_FILE, corrections);

      try {
        await publishToDifyInternal(correction);
        console.log(`✅ Correção ${correction.id} publicada com sucesso`);
      } catch (err) {
        console.error(`❌ Erro ao publicar ${correction.id}:`, err.message);
        if (correction.publishAttempts >= MAX_ATTEMPTS) {
          correction.status = 'failed';
          correction.publishError = err.message;
        } else {
          correction.status = 'queued';
        }
        writeArray(CORRECTIONS_FILE, corrections);
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

setInterval(processQueuedCorrections, 10000);

async function getDatasetConfig(datasetId, apiKey) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`
  };

  const datasetInfo = await loadDatasetInfo(datasetId, headers);
  const processRule = await loadProcessRule(datasetId, headers, datasetInfo);

  return { datasetInfo, processRule };
}

async function loadDatasetInfo(datasetId, headers) {
  if (difyDatasetInfoCache) {
    return difyDatasetInfoCache;
  }

  const url = `${DIFY_BASE_URL}/v1/datasets/${encodeURIComponent(datasetId)}`;
  const resp = await fetchCompat(url, { headers });
  const body = await resp.text();

  if (!resp.ok) {
    throw new Error(`Falha ao buscar detalhes do dataset (${resp.status}): ${body}`);
  }

  try {
    const parsed = JSON.parse(body);
    difyDatasetInfoCache = parsed?.data || parsed;
    return difyDatasetInfoCache;
  } catch (err) {
    throw new Error(`Não foi possível interpretar detalhes do dataset: ${err.message || err}`);
  }
}

async function loadProcessRule(datasetId, headers, datasetInfo) {
  if (difyProcessRuleCache) {
    return difyProcessRuleCache;
  }

  const inlineRule =
    datasetInfo?.dataset_process_rule ||
    datasetInfo?.process_rule ||
    datasetInfo?.processRule;

  if (inlineRule) {
    difyProcessRuleCache = inlineRule;
    return difyProcessRuleCache;
  }

  const docsUrl = `${DIFY_BASE_URL}/v1/datasets/${encodeURIComponent(datasetId)}/documents?limit=1`;
  const resp = await fetchCompat(docsUrl, { headers });
  const raw = await resp.text();

  if (resp.ok) {
    try {
      const json = JSON.parse(raw);
      const collection = Array.isArray(json?.data) ? json.data : Array.isArray(json?.items) ? json.items : [];
      const rule = collection?.[0]?.dataset_process_rule || collection?.[0]?.process_rule;
      if (rule) {
        difyProcessRuleCache = rule;
        return difyProcessRuleCache;
      }
    } catch (err) {
      console.warn('⚠️ Não foi possível interpretar dataset_process_rule:', err);
    }
  } else {
    console.warn(`⚠️ Não foi possível buscar documentos para obter process_rule (${resp.status}): ${raw}`);
  }

  if (process.env.DIFY_PROCESS_RULE_JSON) {
    try {
      difyProcessRuleCache = JSON.parse(process.env.DIFY_PROCESS_RULE_JSON);
      return difyProcessRuleCache;
    } catch (err) {
      console.error('❌ DIFY_PROCESS_RULE_JSON inválido:', err);
    }
  }

  console.warn('⚠️ process_rule não encontrado; a publicação usará as regras padrão do dataset.');
  return null;
}

