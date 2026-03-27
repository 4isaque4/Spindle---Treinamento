import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Componente customizado para destacar aspas
const HighlightQuotes = ({ children }) => {
  if (typeof children === 'string') {
    // Encontra texto entre aspas duplas e destaca
    const parts = children.split(/"([^"]*)"/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // Texto entre aspas - destacar
        return (
          <span
            key={index}
            style={{
              backgroundColor: '#e3f2fd',
              color: '#1976d2',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              fontSize: '0.95em',
              border: '1px solid #bbdefb'
            }}
          >
            "{part}"
          </span>
        );
      }
      return part;
    });
  }
  return children;
};

const ChatMessage = ({ message }) => {
  const messageClass = message.sender === 'user' ? 'user-message' : 'bot-message';
  
  return (
    <div className={`message ${messageClass}`}>
      {message.sender === 'bot' ? (
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Estilização customizada para elementos markdown
            strong: ({ children }) => <strong style={{ fontWeight: 'bold' }}>{children}</strong>,
            em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
            ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>,
            li: ({ children }) => (
              <li style={{ 
                margin: '6px 0', 
                lineHeight: '1.6',
                padding: '4px 0',
                position: 'relative'
              }}>
                <HighlightQuotes>{children}</HighlightQuotes>
              </li>
            ),
            p: ({ children }) => (
              <p style={{ margin: '8px 0', lineHeight: '1.6' }}>
                <HighlightQuotes>{children}</HighlightQuotes>
              </p>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code style={{ 
                  backgroundColor: '#f4f4f4', 
                  padding: '2px 4px', 
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em'
                }}>{children}</code>
              ) : (
                <code className={className} style={{
                  backgroundColor: '#f8f8f8',
                  padding: '8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9em',
                  display: 'block',
                  margin: '8px 0'
                }}>{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre style={{
                backgroundColor: '#f8f8f8',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                margin: '8px 0',
                border: '1px solid #e0e0e0'
              }}>{children}</pre>
            ),
            blockquote: ({ children }) => (
              <blockquote style={{
                borderLeft: '4px solid #007bff',
                paddingLeft: '16px',
                margin: '8px 0',
                fontStyle: 'italic',
                color: '#666'
              }}>{children}</blockquote>
            ),
            h1: ({ children }) => <h1 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '12px 0 8px 0' }}>{children}</h1>,
            h2: ({ children }) => <h2 style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '12px 0 8px 0' }}>{children}</h2>,
            h3: ({ children }) => <h3 style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '10px 0 6px 0' }}>{children}</h3>,
            h4: ({ children }) => <h4 style={{ fontSize: '1em', fontWeight: 'bold', margin: '8px 0 4px 0' }}>{children}</h4>,
            h5: ({ children }) => <h5 style={{ fontSize: '0.9em', fontWeight: 'bold', margin: '8px 0 4px 0' }}>{children}</h5>,
            h6: ({ children }) => <h6 style={{ fontSize: '0.9em', fontWeight: 'bold', margin: '8px 0 4px 0' }}>{children}</h6>
          }}
        >
          {message.text}
        </ReactMarkdown>
      ) : (
        message.text
      )}
    </div>
  );
};

export default ChatMessage;