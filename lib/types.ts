// lib/types.ts

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  documentos?: DocumentoRef[];
  todosDocumentos?: DocumentoRef[]; // Array completo de documentos con URLs correctas
}

export interface DocumentoRef {
  id: number;
  nombre: string;
  url?: string;
}

export interface ChatRequest {
  mensaje: string;
  historial: Message[];
}

export interface ChatResponse {
  respuesta: string;
  documentos?: DocumentoRef[];
  todosDocumentos?: DocumentoRef[];
}