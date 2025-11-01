// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configuración Edge Runtime (más rápido y barato en Vercel)
export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { mensaje, historial } = await req.json();
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje inválido' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener índice desde Django
    const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
    
    let indice = '';
    let documentosUsuario = [];
    
    try {
      const contextResponse = await fetch(`${djangoApiUrl}/workspace/api/chat-context/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!contextResponse.ok) {
        const errorData = await contextResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${contextResponse.status}`);
      }

      const contextData = await contextResponse.json();
      
      if (!contextData.success) {
        throw new Error(contextData.error || 'Error obteniendo documentos');
      }
      
      indice = contextData.indice;
      documentosUsuario = contextData.documentos;
      
    } catch (error: any) {
      console.error('Error obteniendo contexto de Django:', error);
      
      // Retornar error al usuario
      return NextResponse.json({
        error: 'No se pudo conectar con tu workspace',
        details: error.message === 'signal timed out' 
          ? 'El servidor tardó demasiado en responder. Por favor intenta de nuevo.'
          : 'Hubo un problema al obtener tus documentos. Por favor intenta más tarde o contacta a soporte.',
        retry: true
      }, { status: 503 });
    }
    
    // Verificar que hay documentos
    if (!indice || documentosUsuario.length === 0) {
      return NextResponse.json({
        error: 'No tienes documentos analizados',
        details: 'Sube documentos en tu workspace para poder usar el chat.',
        retry: false
      }, { status: 404 });
    }

    // Construir mensajes para OpenAI
    const messages: Message[] = [
      {
        role: 'system',
        content: `Eres FastAI, un asistente especializado en ayudar con documentos legales del workspace del usuario.

DOCUMENTOS DISPONIBLES DEL USUARIO:
${indice}

INSTRUCCIONES CRÍTICAS:
- Ayuda al usuario a encontrar, comparar y entender sus documentos
- Responde preguntas sobre cantidad, tipos y contenido de documentos
- Cuando menciones un documento específico, usa SIEMPRE Y ÚNICAMENTE el formato: [Doc ID: Nombre]
  NO uses negritas, NO uses emojis dentro del formato
  Ejemplo CORRECTO: [Doc 5: Poder judicial Marcos Gonzales]
  Ejemplo INCORRECTO: **[Doc 5: Poder judicial]** o 👁️ [Doc 5: ...]
- NO uses markdown en tus respuestas (sin **, sin _, sin #)
- Escribe en texto plano, solo usa el formato [Doc ID: Nombre] para links
- Responde preguntas sobre cantidad, tipos y contenido de documentos
- Sé conversacional, amigable y útil
- Responde de forma CONCISA (máximo 200 palabras)
- Si te preguntan sobre temas fuera del workspace (noticias, clima, recetas, etc.), responde:
  "Mi especialidad es ayudarte con tus documentos del workspace. ¿Necesitas buscar algún documento?"
- Puedes hacer listas, comparaciones y resúmenes de los documentos disponibles
- Si no encuentras documentos específicos, sugiere alternativas similares

EJEMPLOS DE RESPUESTAS CORRECTAS:
Usuario: "¿Cuántos documentos tengo?"
Tú: "Tienes 5 documentos en tu workspace: 2 poderes, 2 contratos y 1 testamento."

Usuario: "¿Tengo documentos sobre poderes?"
Tú: "Sí, tienes 2 documentos de poderes:
- [Doc 1: Poder judicial Marcos Gonzales]
- [Doc 3: Poder especial vehicular]"

Usuario: "Lista mis documentos"
Tú: "Aquí están tus documentos:
1. [Doc 1: Poder judicial Marcos Gonzales] - Poder especial
2. [Doc 2: Contrato de compraventa] - Contrato
3. [Doc 3: Testamento] - Testamento"

Usuario: "Compara mis contratos"
Tú: "Tienes 2 contratos:
- [Doc 2: Contrato compraventa] es para venta de inmueble
- [Doc 4: Contrato arrendamiento] es para alquiler
¿Necesitas ver alguno en específico?"`
      },
      ...historial.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: mensaje
      }
    ];

    // Llamada a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500, // Aumentado de 400 a 500
    });

    const respuesta = completion.choices[0].message.content || 'No pude generar una respuesta.';

    // Procesar respuesta para agregar links reales de Django
    const docsReferenciados = extraerDocumentosReferenciados(respuesta);
    
    // Enriquecer con URLs reales
    const docsConUrls = docsReferenciados.map(doc => {
      const docReal = documentosUsuario.find((d: any) => d.id === doc.id);
      return {
        ...doc,
        url: docReal?.url || `#doc-${doc.id}`
      };
    });

    return NextResponse.json({
      respuesta,
      documentos: docsConUrls,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('Error en chat API:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud', details: error.message },
      { status: 500 }
    );
  }
}

// Función auxiliar para extraer IDs de documentos mencionados
function extraerDocumentosReferenciados(texto: string): Array<{id: number, nombre: string}> {
  const docs = [];
  const regex = /\[Doc (\d+):\s*([^\]]+)\]/g;
  let match;

  while ((match = regex.exec(texto)) !== null) {
    docs.push({
      id: parseInt(match[1]),
      nombre: match[2].trim()
    });
  }

  return docs;
}