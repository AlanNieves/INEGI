// features/casos-practicos/api.ts
import type { EstructuraPayload } from "./FormCasePractices";

export async function enviarRespuestasYObtenerPDF(token: string, answers: EstructuraPayload): Promise<{
  blob: Blob;
  examId: string;
  responsesUrl: string;
}> {
  // 1) Enviar respuestas → backend genera y guarda PDF
  const res = await fetch(`/api/exams/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers, consent: { accepted: true } }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Error al generar el PDF: ${t}`);
  }

  const { examId, responsesUrl } = await res.json();
  if (!responsesUrl || !examId) throw new Error("El backend no devolvió examId o responsesUrl.");

  // 2) Descargar el PDF listo
  const pdfRes = await fetch(responsesUrl, { method: "GET" });
  if (!pdfRes.ok || !(pdfRes.headers.get("content-type") || "").includes("application/pdf")) {
    const t = await pdfRes.text();
    throw new Error(`El servidor no devolvió un PDF válido: ${t}`);
  }
  const blob = await pdfRes.blob();
  
  return { blob, examId, responsesUrl };
}
