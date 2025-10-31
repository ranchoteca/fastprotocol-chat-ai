// components/ChatInput.tsx
'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (mensaje: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [mensaje, setMensaje] = useState('');

  const handleSubmit = () => {
    const textoLimpio = mensaje.trim();
    if (textoLimpio && !disabled) {
      onSend(textoLimpio);
      setMensaje('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="flex gap-2">
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pregunta sobre tus documentos..."
          disabled={disabled}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          rows={2}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !mensaje.trim()}
          className="px-6 py-3 bg-purple-400 text-white rounded-lg font-medium 
          hover:bg-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 
          focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed 
          transition-colors"
        >
          {disabled ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Pensando...
            </span>
          ) : (
            'Enviar'
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Presiona Enter para enviar, Shift + Enter para nueva línea
      </p>
    </div>
  );
}