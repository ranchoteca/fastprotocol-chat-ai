// app/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Message } from '@/lib/types';

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [cargando, setCargando] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial de localStorage al iniciar
  useEffect(() => {
    const historialGuardado = localStorage.getItem('chat_historial');
    if (historialGuardado) {
      try {
        const parsed = JSON.parse(historialGuardado);
        setMensajes(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch (error) {
        console.error('Error cargando historial:', error);
      }
    }
  }, []);

  // Guardar historial en localStorage cuando cambia
  useEffect(() => {
    if (mensajes.length > 0) {
      localStorage.setItem('chat_historial', JSON.stringify(mensajes));
    }
  }, [mensajes]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  // Obtener token de URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      localStorage.setItem('django_jwt', token);
      // Limpiar URL
      window.history.replaceState({}, '', '/chat');
    }
  }, []);

  const enviarMensaje = async (texto: string) => {
    // Agregar mensaje del usuario
    const mensajeUsuario: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: texto,
      timestamp: new Date()
    };

    setMensajes(prev => [...prev, mensajeUsuario]);
    setCargando(true);

    try {
      // Obtener token
      const token = localStorage.getItem('django_jwt');
      
      if (!token) {
        throw new Error('No estás autenticado. Por favor inicia sesión en Django.');
      }

      // Llamar a la API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mensaje: texto,
          historial: mensajes.map(m => ({
            role: m.role,
            content: m.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();

      // Manejar errores del servidor
      if (data.error) {
        const mensajeError: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ ${data.error}\n\n${data.details || ''}${data.retry ? '\n\nPor favor intenta de nuevo en unos momentos.' : ''}`,
          timestamp: new Date()
        };
        setMensajes(prev => [...prev, mensajeError]);
        setCargando(false);
        return;
      }

      // Agregar respuesta del asistente
      const mensajeAsistente: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.respuesta,
        timestamp: new Date(),
        documentos: data.documentos
      };

      setMensajes(prev => [...prev, mensajeAsistente]);

    } catch (error) {
      console.error('Error:', error);
      
      // Mensaje de error
      const mensajeError: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
        timestamp: new Date()
      };

      setMensajes(prev => [...prev, mensajeError]);
    } finally {
      setCargando(false);
    }
  };

  const limpiarChat = () => {
    if (confirm('¿Estás seguro de que quieres limpiar el historial del chat?')) {
      setMensajes([]);
      localStorage.removeItem('chat_historial');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Header con degradado y mejorado */}
      <div className="bg-gradient-to-r from-[#7762a3] via-[#8b75b8] to-[#9b87c9] border-b border-purple-300/30 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          {/* Logo/Icono */}
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <span className="text-lg">✨</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              FastAI
            </h1>
            <p className="text-xs text-purple-100">
              Tu asistente de documentos legales
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Botón minimizar/expandir */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            title={isMinimized ? "Expandir" : "Minimizar"}
          >
            {isMinimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
          
          {/* Botón limpiar */}
          <button
            onClick={limpiarChat}
            className="px-3 py-1.5 text-xs text-white hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Limpiar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {mensajes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-[#7762a3] to-[#9b87c9] rounded-full flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
                <h2 className="text-lg font-semibold text-gray-800 mb-2">
                  ¡Hola! Soy FastAI
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Pregunta sobre tus documentos, búscalos por tema o solicita comparaciones entre ellos.
                </p>
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4 text-left">
                  <p className="text-xs font-semibold text-[#7762a3] mb-2">
                    💡 Ejemplos de preguntas:
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>¿Tengo documentos sobre poderes vehiculares?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>¿Qué tipos de contratos tengo?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>Muéstrame documentos de compraventa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400 mt-0.5">•</span>
                      <span>¿Cuál poder usar para trámites ante MOPT?</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <>
              {mensajes.map((mensaje) => (
                <ChatMessage key={mensaje.id} message={mensaje} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Input */}
      {!isMinimized && <ChatInput onSend={enviarMensaje} disabled={cargando} />}
    </div>
  );
}