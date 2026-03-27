import React, { useState } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ isOpen, onClose, conversationId }) => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('knowledge');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'knowledge', label: 'Resposta incorreta' },
    { value: 'incomplete', label: 'Resposta incompleta' },
    { value: 'bug', label: 'Erro técnico' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      alert('Por favor, descreva o problema encontrado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/webhook/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          feedback: {
            message: message.trim(),
            category,
            conversationId
          },
          source: 'chatbot'
        })
      });

      if (response.ok) {
        alert('Feedback enviado com sucesso! Obrigado pela sua contribuição.');
        setMessage('');
        setCategory('knowledge');
        onClose();
      } else {
        throw new Error('Erro ao enviar feedback');
      }
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      alert('Erro ao enviar feedback. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal">
        <div className="feedback-modal-header">
          <h2>Correção de resposta</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="feedback-form">
          <div className="category-section">
            <label htmlFor="category">Categoria do feedback:</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="message-section">
            <label htmlFor="message">Descreva o problema identificado:</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex.: a resposta confundiu produtos ou trouxe dados desatualizados."
              rows={4}
              required
            />
          </div>

          <div className="feedback-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
