// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Configuración Edge Runtime (más rápido y barato en Vercel)
export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Mock de índice de documentos (después vendrá de Django)
const MOCK_INDICE = `
ID 1: Contrato_Compraventa_Inmueble.docx
Tipo: Contrato
Resumen: Contrato para transferencia de propiedades inmobiliarias. Incluye cláusulas de garantía, forma de pago, vicios ocultos y entrega del bien.
Keywords: compraventa, inmueble, escritura, garantías

ID 2: Poder_General_Notarial.docx
Tipo: Poder
Resumen: Poder amplio para representación legal en trámites diversos. Permite al apoderado actuar en nombre del otorgante.
Keywords: poder, representación, trámites, legal

ID 3: Poder_Especial_Vehiculos.docx
Tipo: Poder
Resumen: Poder específico para trámites vehiculares ante MOPT. Incluye traspasos, cambios de propietario y gestión de placas.
Keywords: poder, vehículos, MOPT, traspaso, placas

ID 4: Testamento_Abierto.docx
Tipo: Testamento
Resumen: Testamento abierto con disposiciones de bienes. Incluye herederos, legados y disposiciones finales.
Keywords: testamento, herederos, legados, sucesión

ID 5: Contrato_Arrendamiento.docx
Tipo: Contrato
Resumen: Contrato de arrendamiento de inmueble. Incluye cláusulas de pago, duración, obligaciones del arrendador y arrendatario.
Keywords: arrendamiento, alquiler, renta, inmueble
`;

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { mensaje, historial } = await req.json();

    if (!mensaje || typeof mensaje !== 'string') {
      return NextResponse.json(
        { error: 'Mensaje inválido' },
        { status: 400 }
      );
    }

    // Construir mensajes para OpenAI
    const messages: Message[] = [
      {
        role: 'system',
        content: `Eres un asistente EXCLUSIVO del workspace de documentos legales para notarios.

DOCUMENTOS DISPONIBLES:
${MOCK_INDICE}

INSTRUCCIONES:
- SOLO responde preguntas sobre los documentos del workspace
- Si mencionas documentos, usa el formato: [Doc ID: nombre]
- Responde de forma CONCISA (máximo 150 palabras)
- Si te preguntan algo NO relacionado con el workspace, responde:
  "Solo puedo ayudarte con consultas sobre tus documentos del workspace. ¿Necesitas buscar algún machote?"
- Para búsquedas, identifica los documentos relevantes por sus keywords y tipo
- Sugiere cuál documento usar según la necesidad`
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
      max_tokens: 400,
    });

    const respuesta = completion.choices[0].message.content || 'No pude generar una respuesta.';

    // Procesar respuesta para agregar metadata de documentos mencionados
    const docsReferenciados = extraerDocumentosReferenciados(respuesta);

    return NextResponse.json({
      respuesta,
      documentos: docsReferenciados,
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