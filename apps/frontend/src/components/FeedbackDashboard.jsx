import React, { useState, useEffect } from 'react';
import { IconRotate, IconEdit, IconCheck, IconTrash } from './Icons.jsx';
import CorrectionModal from './CorrectionModal.jsx';
import './FeedbackDashboard.css';

const FeedbackDashboard = ({ onRequireLogin }) => {
  const [corrections, setCorrections] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingCorrections, setLoadingCorrections] = useState(true);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [errorCorrections, setErrorCorrections] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    userQuestion: '',
    correctAnswer: '',
    tags: '',
    docName: ''
  });
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const categoryLabels = {
    knowledge: 'Correção de conhecimento',
    incomplete: 'Resposta incompleta',
    bug: 'Erro técnico',
    general: 'Geral'
  };

  const statusLabels = {
    pending: 'Pendente',
    queued: 'Na fila',
    publishing: 'Publicando',
    failed: 'Falhou',
    published: 'Publicado'
  };

  useEffect(() => {
    fetchCorrections();
    fetchFeedbacks();
  }, [statusFilter]);
  
  const buildCorrectionsUrl = () => {
    const base = `${import.meta.env.VITE_API_URL || ''}/api/corrections`;
    if (statusFilter === 'all') return base;
    return `${base}?status=${statusFilter}`;
  };

  const fetchCorrections = async () => {
    try {
      setErrorCorrections(null);
      const token = localStorage.getItem('token');
      const response = await fetch(buildCorrectionsUrl(), {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const data = await response.json();
        setCorrections(data.corrections || []);
      } else {
        // Tratar diferentes tipos de erro
        if (response.status === 401 || response.status === 403) {
          setErrorCorrections('Erro de autenticação. Por favor, faça login novamente.');
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
          setErrorCorrections(`Erro ao carregar correções: ${errorData.message || `Status ${response.status}`}`);
        }
        setCorrections([]);
      }
    } catch (error) {
      console.error('Erro ao buscar correções:', error);
      setErrorCorrections(`Erro ao conectar com o servidor: ${error.message}`);
      setCorrections([]);
    } finally {
      setLoadingCorrections(false);
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/feedbacks?limit=30`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (error) {
      console.error('Erro ao buscar feedbacks:', error);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const startEdit = (correction) => {
    setEditingId(correction.id);
    setEditForm({
      userQuestion: correction.userQuestion || '',
      correctAnswer: correction.correctAnswer || '',
      tags: Array.isArray(correction.tags) ? correction.tags.join(', ') : '',
      docName: correction.docName || `spindle_correction_${correction.id}.md`
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      userQuestion: '',
      correctAnswer: '',
      tags: '',
      docName: ''
    });
  };

  const saveEdit = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/corrections/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userQuestion: editForm.userQuestion,
          correctAnswer: editForm.correctAnswer,
          tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          docName: editForm.docName
        })
      });

      if (response.ok) {
        fetchCorrections();
        setEditingId(null);
        setEditForm({
          userQuestion: '',
          correctAnswer: '',
          tags: '',
          docName: ''
        });
      } else {
        alert('Erro ao salvar correção');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar correção');
    }
  };

  const deleteCorrection = async (id) => {
    if (!confirm('Excluir esta correção? Essa ação não pode ser desfeita.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/corrections/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        fetchCorrections();
      } else {
        const error = await response.json();
        alert(`❌ Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir correção:', error);
      alert('❌ Erro ao excluir correção');
    }
  };

  const publishCorrection = async (id) => {
    if (!confirm('Publicar esta correção no Dify?')) return;
    
    try {
      let token = localStorage.getItem('token');
      if (!token && onRequireLogin) {
        token = await onRequireLogin();
      }
      if (!token) {
        alert('Login é necessário para publicar uma correção.');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/corrections/${id}/publish`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('✅ Correção publicada com sucesso!');
        fetchCorrections();
      } else {
        const error = await response.json();
        alert(`❌ Erro ao publicar: ${error.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao publicar:', error);
      alert('❌ Erro ao publicar correção');
    }
  };

  const refreshAll = () => {
    setLoadingCorrections(true);
    setLoadingFeedbacks(true);
    setErrorCorrections(null);
    fetchCorrections();
    fetchFeedbacks();
  };

  const createCorrectionFromFeedback = (feedback) => {
    setSelectedFeedback(feedback);
    setShowCorrectionModal(true);
  };

  const deleteFeedback = async (id) => {
    if (!confirm('Excluir este feedback? Essa ação não pode ser desfeita.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/feedbacks/${id}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (response.ok) {
        fetchFeedbacks();
        alert('✅ Feedback excluído com sucesso!');
      } else {
        const error = await response.json();
        alert(`❌ Erro ao excluir: ${error.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao excluir feedback:', error);
      alert('❌ Erro ao excluir feedback');
    }
  };

  if (loadingCorrections) {
    return (
      <div className="feedback-dashboard">
        <div className="loading">Carregando correções...</div>
      </div>
    );
  }

  return (
    <div className="feedback-dashboard">
      <div className="dashboard-content-header">
        <h2>Correções Pendentes</h2>
        <button onClick={refreshAll} className="refresh-button">
          <IconRotate />
          Atualizar
        </button>
      </div>

      <div className="status-filters">
        {[
          { value: 'pending', label: 'Pendentes' },
          { value: 'failed', label: 'Falhas' },
          { value: 'published', label: 'Publicadas' },
          { value: 'all', label: 'Todas' }
        ].map((option) => (
          <button
            key={option.value}
            className={`status-filter-button ${statusFilter === option.value ? 'active' : ''}`}
            onClick={() => {
              setLoadingCorrections(true);
              setErrorCorrections(null);
              setStatusFilter(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {errorCorrections ? (
        <div className="no-corrections" style={{ borderColor: '#ff6b6b', background: '#fff5f5' }}>
          <p style={{ color: '#c92a2a' }}>❌ {errorCorrections}</p>
          <small>Verifique sua conexão e tente novamente</small>
          <button 
            onClick={() => {
              setLoadingCorrections(true);
              setErrorCorrections(null);
              fetchCorrections();
            }} 
            className="refresh-button"
            style={{ marginTop: '16px' }}
          >
            Tentar novamente
          </button>
        </div>
      ) : corrections.length === 0 ? (
        <div className="no-corrections">
          <p>Sem registros neste filtro</p>
          <small>Altere o filtro acima ou aguarde novos feedbacks</small>
        </div>
      ) : (
        <div className="corrections-list">
          {corrections.map((correction) => (
            <div key={correction.id} className="correction-card">
              
              {editingId === correction.id ? (
                // Modo edição
                <div className="correction-editor">
                  <label>
                    Pergunta do usuário:
                    <input
                      type="text"
                      value={editForm.userQuestion}
                      onChange={(e) => setEditForm({ ...editForm, userQuestion: e.target.value })}
                    />
                  </label>
                  <label>
                    Resposta correta:
                    <textarea
                      value={editForm.correctAnswer}
                      onChange={(e) => setEditForm({ ...editForm, correctAnswer: e.target.value })}
                      rows="4"
                    />
                  </label>
                  <label>
                    Tags (separadas por vírgula):
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      placeholder="ex: energia, solar, instalação"
                    />
                  </label>
                  <label>
                    Nome do arquivo:
                    <input
                      type="text"
                      value={editForm.docName}
                      onChange={(e) => setEditForm({ ...editForm, docName: e.target.value })}
                      placeholder="spindle_correction_4.md"
                    />
                    <span className="input-hint">Esse nome será usado no Dify (mantenha .md).</span>
                  </label>
                  <div className="correction-actions">
                    <button onClick={() => saveEdit(correction.id)} className="action-button approve">
                      Salvar
                    </button>
                    <button onClick={cancelEdit} className="action-button">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualização
                <>
                  <div className="correction-meta">
                    <span>ID: {correction.id}</span>
                    <span>{new Date(correction.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span className={`status-badge status-${correction.status}`}>
                      {statusLabels[correction.status] || correction.status}
                    </span>
                  </div>
                  
                  <div className="correction-content">
                    <p><strong>Pergunta:</strong> {correction.userQuestion || '(não informada)'}</p>
                    <p><strong>Resposta atual do bot:</strong> {correction.botAnswer || '(não informada)'}</p>
                    <p><strong>Resposta correta:</strong> {correction.correctAnswer}</p>
                    <p><strong>Arquivo:</strong> {correction.docName || `spindle_correction_${correction.id}.md`}</p>
                    {correction.tags && correction.tags.length > 0 && (
                      <p><strong>Tags:</strong> {correction.tags.join(', ')}</p>
                    )}
                  </div>
                  
                  <div className="correction-actions">
                    <button onClick={() => startEdit(correction)} className="action-button btn-icon">
                      <IconEdit />
                      Editar
                    </button>
                    <button onClick={() => publishCorrection(correction.id)} className="action-button approve btn-icon">
                      <IconCheck />
                      {correction.status === 'published' ? 'Republicar' : 'Publicar no Dify'}
                    </button>
                    <button onClick={() => deleteCorrection(correction.id)} className="action-button danger btn-icon">
                      <IconTrash />
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="feedbacks-section">
        <div className="section-header">
          <h3>Feedbacks enviados</h3>
          <button onClick={fetchFeedbacks} className="refresh-button secondary">
            <IconRotate />
            Recarregar
          </button>
        </div>

        {loadingFeedbacks ? (
          <div className="loading loading-inline">Carregando feedbacks...</div>
        ) : feedbacks.length === 0 ? (
          <div className="no-corrections">
            <p>Nenhum feedback recebido ainda</p>
            <small>Feedbacks enviados pelo modal aparecem aqui automaticamente</small>
          </div>
        ) : (
          <div className="feedbacks-list">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="feedback-card">
                <div className="feedback-meta">
                  <span>Feedback #{fb.id}</span>
                  <span>{new Date(fb.timestamp).toLocaleString('pt-BR')}</span>
                </div>
                <p><strong>Categoria:</strong> {categoryLabels[fb.category] || 'Não informado'}</p>
                <p><strong>Mensagem:</strong> {fb.message}</p>
                {fb.rating && (
                  <p><strong>Avaliação:</strong> {fb.rating}</p>
                )}
                
                <div className="feedback-actions">
                  <button 
                    onClick={() => createCorrectionFromFeedback(fb)} 
                    className="feedback-btn feedback-btn-primary"
                  >
                    <IconCheck />
                    Criar Correção
                  </button>
                  <button 
                    onClick={() => deleteFeedback(fb.id)} 
                    className="feedback-btn feedback-btn-secondary"
                  >
                    <IconTrash />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => {
          setShowCorrectionModal(false);
          setSelectedFeedback(null);
          fetchCorrections();
        }}
        feedback={selectedFeedback}
        conversationId={selectedFeedback?.conversationId}
      />
    </div>
  );
};

export default FeedbackDashboard;
