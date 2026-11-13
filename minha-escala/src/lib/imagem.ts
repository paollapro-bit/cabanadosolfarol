/**
 * Reduz a fotografia antes de a enviar: mantém detalhe suficiente para ler a
 * tabela (lado maior até 2400 px) e fica bem abaixo do limite do servidor.
 */
export async function prepararImagem(file: File, maxLado = 2400): Promise<{ base64: string; tipo: 'image/jpeg'; url: string }> {
  let fonte: CanvasImageSource & { width: number; height: number };
  try {
    fonte = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    fonte = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível abrir a fotografia.'));
      img.src = URL.createObjectURL(file);
    });
  }
  const escala = Math.min(1, maxLado / Math.max(fonte.width, fonte.height));
  const w = Math.round(fonte.width * escala);
  const h = Math.round(fonte.height * escala);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('O telemóvel não conseguiu preparar a fotografia.');
  ctx.drawImage(fonte, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível preparar a fotografia.'))), 'image/jpeg', 0.85),
  );
  const dataUrl = await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
  return { base64: dataUrl.slice(dataUrl.indexOf(',') + 1), tipo: 'image/jpeg', url: URL.createObjectURL(blob) };
}
