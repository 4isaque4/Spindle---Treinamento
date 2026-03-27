// src/components/Sidebar.jsx

import React, { useState, useEffect, useRef } from 'react';
import ConfirmationModal from './ConfirmationModal.jsx'; // Importa o novo modal
import { IconFeedback, IconDashboard, IconLogout, IconEdit, IconTrash } from './Icons.jsx';

const Sidebar = ({ 
  conversations, 
  activeConversationId, 
  switchConversation, 
  startNewConversation,
  renameConversation,
  deleteConversation,
  onFeedbackClick,
  onDashboardClick,
  onLogout,
  isAuthenticated = false
}) => {
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [deletingId, setDeletingId] = useState(null); // Estado para controlar o modal de deleção
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  const handleStartEdit = (conv) => {
    setEditingId(conv.id);
    setEditingText(conv.name);
  };

  const handleConfirmEdit = () => {
    if (editingId) {
      renameConversation(editingId, editingText);
      setEditingId(null);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      handleConfirmEdit();
    } else if (event.key === 'Escape') {
      setEditingId(null);
    }
  };
  
  const handleDeleteClick = (e, id) => {
    e.stopPropagation();
    setDeletingId(id); // Em vez de window.confirm, apenas define o ID para deleção
  }

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteConversation(deletingId);
      setDeletingId(null); // Fecha o modal
    }
  };

  return (
    <>
      <ConfirmationModal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={handleConfirmDelete}
        message="Tem certeza que deseja deletar esta conversa?"
      />
      <div className="sidebar">
        <button className="new-chat-button" onClick={startNewConversation}>
          Nova Conversa
        </button>
        
        <div className="sidebar-actions">
          <button className="feedback-button btn-icon" onClick={onFeedbackClick}>
            <IconFeedback />
            <span>Feedback</span>
          </button>
          <button className="dashboard-button btn-icon" onClick={onDashboardClick}>
            <IconDashboard />
            <span>Correções</span>
          </button>
          {isAuthenticated && (
            <button className="logout-sidebar-button btn-icon" onClick={onLogout}>
              <IconLogout />
              <span>Sair</span>
            </button>
          )}
        </div>
        
        <div className="sidebar-title">Conversas</div>
        <ul className="conversation-list">
          {conversations.map(conv => (
            <li
              key={conv.id}
              className={`conversation-item ${conv.id === activeConversationId ? 'active' : ''}`}
              onClick={() => editingId !== conv.id && switchConversation(conv.id)}
            >
              {editingId === conv.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="rename-input"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={handleConfirmEdit}
                  onKeyDown={handleKeyDown}
                />
              ) : (
                <span className="conversation-name">{conv.name}</span>
              )}

              <div className="conversation-actions">
                <button className="action-icon" onClick={() => handleStartEdit(conv)} title="Renomear">
                  <IconEdit />
                </button>
                <button className="action-icon" onClick={(e) => handleDeleteClick(e, conv.id)} title="Remover">
                  <IconTrash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Sidebar;