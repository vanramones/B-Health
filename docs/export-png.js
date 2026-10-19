// Export an on-page SVG diagram as a high-resolution PNG (white background).
function downloadPng(svgId, fileName, scale = 3) {
  const src = document.getElementById(svgId);
  const [, , vw, vh] = src.getAttribute('viewBox').split(/\s+/).map(Number);
  const clone = src.cloneNode(true);
  clone.setAttribute('width', vw);
  clone.setAttribute('height', vh);
  // page CSS doesn't travel with the SVG, so inline the text font
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = 'text { font-family: Arial, Helvetica, sans-serif; fill: #000; }';
  clone.insertBefore(style, clone.firstChild);

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
  const img = new Image();
  img.onload = () => {
    const pad = 20;
    const canvas = document.createElement('canvas');
    canvas.width = (vw + pad * 2) * scale;
    canvas.height = (vh + pad * 2) * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad * scale, pad * scale, vw * scale, vh * scale);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  };
  img.src = url;
}
