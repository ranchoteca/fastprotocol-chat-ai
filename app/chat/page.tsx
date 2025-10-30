// app/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { Message } from '@/lib/types';

export default function ChatPage() {
  const [mensajes, setMensajes] = useState<Message[]>([]);
  const [cargando, setCargando] = useState(false);
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            💬 Chat del Workspace
          </h1>
          <p className="text-sm text-gray-600">
            Pregunta sobre tus documentos legales
          </p>
        </div>
        <button
          onClick={limpiarChat}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          🗑️ Limpiar chat
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {mensajes.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">💼</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Bienvenido al Chat del Workspace
              </h2>
              <p className="text-gray-600 mb-6">
                Pregunta sobre tus documentos, búscalos por tema, o solicita
                comparaciones entre ellos.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Ejemplos de preguntas:
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• ¿Tengo documentos sobre poderes vehiculares?</li>
                  <li>• ¿Qué tipos de contratos tengo?</li>
                  <li>• Muéstrame documentos de compraventa</li>
                  <li>• ¿Cuál poder usar para trámites ante MOPT?</li>
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

      {/* Input */}
      <ChatInput onSend={enviarMensaje} disabled={cargando} />
    </div>
  );
}