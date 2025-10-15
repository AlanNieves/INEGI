export async function getSubmissionPreview(id: string) {
  const r = await fetch(`/api/triangulacion/submissions/${id}/preview`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`Preview ${id} falló`);
  return r.json();
}

export async function downloadFile(url: string, filename: string) {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error(`Descarga falló: ${url}`);
  const blob = await r.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
