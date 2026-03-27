import React from 'react';
import logoSpindle from '../img/logospindle.png';

const Header = () => {
  return (
    <header className="chat-header">
      <div className="header-left">
        <img src={logoSpindle} alt="Logo Spindle" className="spindle-logo" />
        <h1>Assistente Spindle</h1>
      </div>
    </header>
  );
};

export default Header;