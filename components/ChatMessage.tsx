// components/ChatMessage.tsx
import { Message } from '@/lib/types';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  // Procesar links en el contenido (convierte [Doc ID: nombre] en links)
  const procesarContenido = (texto: string) => {
    const regex = /\[Doc (\d+):\s*([^\]]+)\]/g;
    const partes = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(texto)) !== null) {
      // Texto antes del match
      if (match.index > lastIndex) {
        partes.push(
          <span key={`text-${lastIndex}`}>
            {texto.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Link del documento
      const docId = match[1];
      const docNombre = match[2];

      // Buscar el documento real en el array de documentos
      const docUrl = message.documentos?.find(d => d.id === parseInt(docId))?.url;

      partes.push(
        <a
          key={`doc-${docId}-${match.index}`}
          href={docUrl || `https://fastprotocolcr.com/workspace/template/${docId}/`}
          target="_blank"  // ← ABRIR EN NUEVA PESTAÑA
          rel="noopener noreferrer"  // ← SEGURIDAD
          className="inline-flex items-center gap-1 px-2 py-1 mx-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-sm font-medium transition-colors"
          title={`Abrir ${docNombre} en nueva pestaña`}
        >
          📄 {docNombre}
        </a>
      );

      lastIndex = match.index + match[0].length;
    }

    // Texto restante
    if (lastIndex < texto.length) {
      partes.push(
        <span key={`text-${lastIndex}`}>
          {texto.substring(lastIndex)}
        </span>
      );
    }

    return partes.length > 0 ? partes : texto;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-[#af99e1] text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
      >
        {/* Icono y rol */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold opacity-70">
            {isUser ? '👤 Tú' : '🤖 FastAI'}
          </span>
          <span className="text-xs opacity-50">
            {new Date(message.timestamp).toLocaleTimeString('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>

        {/* Contenido del mensaje */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {procesarContenido(message.content)}
        </div>

        {/* Documentos referenciados (si existen) */}
        {message.documentos && message.documentos.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-300/30">
            <p className="text-xs font-semibold mb-2 opacity-70">
              Documentos mencionados:
            </p>
            <div className="flex flex-wrap gap-2">
              {message.documentos.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url || `#doc-${doc.id}`}
                  className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded border border-white/30 transition-colors"
                >
                  📄 {doc.nombre}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}