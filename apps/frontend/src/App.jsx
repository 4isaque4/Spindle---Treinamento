// src/App.jsx

import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ChatWindow from './components/ChatWindow.jsx';
import ChatInput from './components/ChatInput.jsx';
import Sidebar from './components/Sidebar.jsx';
import FeedbackModal from './components/FeedbackModal.jsx';
import FeedbackDashboard from './components/FeedbackDashboard.jsx';
import LoginModal from './components/LoginModal.jsx';
import { useDifyAPI } from './hooks/userDifyAPI.js';
import './styles.css';

function App() {
  const {
    conversations,
    activeConversationId,
    isLoading,
    sendMessage,
    switchConversation,
    startNewConversation,
    renameConversation, // <-- Nova função
    deleteConversation  // <-- Nova função
  } = useDifyAPI();

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingLoginResolve, setPendingLoginResolve] = useState(null);

  // Verificar autenticação ao carregar, mas não bloquear o uso
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/verify-token`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
    }
  };

  const handleLogin = (token) => {
    setIsAuthenticated(true);
    setShowLogin(false);
    if (pendingLoginResolve) {
      pendingLoginResolve(token);
      setPendingLoginResolve(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setShowLogin(false);
  };

  const requestLogin = () => new Promise((resolve) => {
    setPendingLoginResolve(() => resolve);
    setShowLogin(true);
  });

  const activeConversation = conversations.find(c => c.id === activeConversationId) || { messages: [] };

  const handleFeedbackClick = () => {
    setShowFeedbackModal(true);
  };

  const handleDashboardClick = () => {
    setShowDashboard(true);
  };

  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
  };

  const closeDashboard = () => {
    setShowDashboard(false);
  };

  if (showDashboard) {
    return (
      <>
        <div className="dashboard-layout">
          <div className="dashboard-header">
            <button onClick={closeDashboard} className="back-button">← Voltar ao Chat</button>
            <h1>Dashboard de Feedbacks</h1>
            <button onClick={handleLogout} className="logout-button">Sair</button>
          </div>
          <FeedbackDashboard onRequireLogin={requestLogin} />
        </div>

        <LoginModal
          isOpen={showLogin}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <>
      <div className="app-layout">
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          switchConversation={switchConversation}
          startNewConversation={startNewConversation}
          renameConversation={renameConversation}
          deleteConversation={deleteConversation}
          onFeedbackClick={handleFeedbackClick}
          onDashboardClick={handleDashboardClick}
          onLogout={handleLogout}
        />
        <div className="chat-container">
          <Header onLogout={handleLogout} />
          <ChatWindow messages={activeConversation.messages} isLoading={isLoading} />
          <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
        </div>

        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={closeFeedbackModal}
          conversationId={activeConversationId}
        />
      </div>

      <LoginModal
        isOpen={showLogin}
        onLogin={handleLogin}
      />
    </>
  );
}

export default App;