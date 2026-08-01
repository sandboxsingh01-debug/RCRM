import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix for MUI/emotion "addListener" crash on some browsers
if (typeof window !== 'undefined' && typeof window.MediaQueryList !== 'undefined') {
  const proto = window.MediaQueryList.prototype;
  if (!proto.addEventListener && proto.addListener) {
    proto.addEventListener = function(type, fn) { this.addListener(fn); };
    proto.removeEventListener = function(type, fn) { this.removeListener(fn); };
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
