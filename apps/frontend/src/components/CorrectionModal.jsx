import React, { useState, useEffect } from 'react';
import './FeedbackModal.css';

const CorrectionModal = ({ isOpen, onClose, feedback, conversationId, onRequireLogin }) => {
  const [userQuestion, setUserQuestion] = useState('');
  const [botAnswer, setBotAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [category, setCategory] = useState('correcao_resposta');
  const [tags, setTags] = useState('');
  const [docName, setDocName] = useState('');
  const [publishNow, setPublishNow] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Preencher campos quando feedback for selecionado
  useEffect(() => {
    if (feedback && isOpen) {
      // Se o feedback tem uma mensagem, pode ser a pergunta do usuário
      if (feedback.message) {
        setUserQuestion(feedback.message);
      }
      // Mapear categoria do feedback para categoria de correção
      if (feedback.category === 'knowledge') {
        setCategory('correcao_resposta');
      } else if (feedback.category === 'incomplete') {
        setCategory('conteudo_novo');
      } else {
        setCategory('correcao_resposta');
      }
      // Gerar nome sugestivo baseado no feedback
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      setDocName(`correcao_${feedback.id || timestamp}`);
      // Limpar outros campos
      setBotAnswer('');
      setCorrectAnswer('');
      setTags('');
    } else if (!feedback && isOpen) {
      // Limpar campos quando abrir sem feedback
      setUserQuestion('');
      setBotAnswer('');
      setCorrectAnswer('');
      setCategory('correcao_resposta');
      setTags('');
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      setDocName(`conteudo_novo_${timestamp}`);
    }
  }, [feedback, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let token = localStorage.getItem('token');

      // Só forçar login se a publicação imediata estiver marcada
      if (!token && publishNow && onRequireLogin) {
        token = await onRequireLogin();
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/corrections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          feedbackId: feedback?.id,
          conversationId,
          userQuestion,
          botAnswer,
          correctAnswer,
          category,
          tags,
          docName,
          publishNow
        })
      });
      if (!res.ok) throw new Error('Falha ao enviar correção');
      alert('Correção enviada com sucesso!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar correção');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h2>Corrigir conhecimento no Dify</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="form-group">
            <label>Pergunta do usuário</label>
            <textarea 
              value={userQuestion} 
              onChange={(e) => setUserQuestion(e.target.value)} 
              rows={3}
              placeholder="Pergunta original do usuário"
            />
          </div>

          <div className="form-group">
            <label>Resposta dada pelo bot (opcional)</label>
            <textarea 
              value={botAnswer} 
              onChange={(e) => setBotAnswer(e.target.value)} 
              rows={3}
              placeholder="Resposta incorreta que o bot deu"
            />
          </div>

          <div className="form-group">
            <label>Resposta correta (novo conhecimento) *</label>
            <textarea 
              value={correctAnswer} 
              onChange={(e) => setCorrectAnswer(e.target.value)} 
              rows={6} 
              required
              placeholder="Digite a resposta correta que deve ser adicionada ao conhecimento"
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="correcao_resposta">Correção de Resposta</option>
              <option value="conteudo_novo">Conteúdo Novo</option>
              <option value="atualizacao">Atualização</option>
              <option value="esclarecimento">Esclarecimento</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="form-group">
            <label>Nome do arquivo no Dify *</label>
            <input 
              value={docName} 
              onChange={(e) => setDocName(e.target.value)}
              placeholder="ex: planos_assinatura_spindle"
              required
            />
            <small style={{ color: '#666', fontSize: '0.85em', marginTop: '4px', display: 'block' }}>
              Use um nome descritivo para identificar esta correção no Dify.ai
            </small>
          </div>

          <div className="form-group">
            <label>Tags (separadas por vírgula)</label>
            <input 
              value={tags} 
              onChange={(e) => setTags(e.target.value)}
              placeholder="ex: planos, assinatura, preços"
            />
          </div>

          <div className="form-group">
            <label>
              <input 
                type="checkbox" 
                checked={publishNow} 
                onChange={(e) => setPublishNow(e.target.checked)} 
              />
              Publicar imediatamente no Dify
            </label>
          </div>

        <div className="feedback-actions">
          <button type="button" className="cancel-button" onClick={onClose} disabled={submitting}>Cancelar</button>
          <button type="submit" className="submit-button" disabled={submitting || !correctAnswer.trim()}>
            {submitting ? 'Enviando...' : 'Enviar Correção'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default CorrectionModal;
