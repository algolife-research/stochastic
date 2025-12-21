// Safari/iPad Debug Utilities
// Add this temporarily to diagnose rendering issues

export function logSafariDebugInfo(canvas: HTMLCanvasElement): void {
  console.log('=== Safari Debug Info ===');
  console.log('User Agent:', navigator.userAgent);
  console.log('Platform:', navigator.platform);
  console.log('Touch Points:', navigator.maxTouchPoints);
  console.log('Device Pixel Ratio:', window.devicePixelRatio);
  console.log('Window Size:', window.innerWidth, 'x', window.innerHeight);
  console.log('Canvas Client Size:', canvas.clientWidth, 'x', canvas.clientHeight);
  console.log('Canvas Actual Size:', canvas.width, 'x', canvas.height);
  console.log('Canvas Style:', canvas.style.width, 'x', canvas.style.height);
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const transform = ctx.getTransform();
    console.log('Canvas Transform:', transform);
  }
  
  // Check for Safari-specific issues
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  console.log('Is Safari:', isSafari);
  console.log('Is iOS:', isIOS);
  console.log('========================');
}

export function testCanvasRendering(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get 2D context!');
    return;
  }
  
  // Draw a simple test pattern
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  
  ctx.fillStyle = 'green';
  ctx.fillRect(canvas.width - 100, 0, 100, 100);
  
  ctx.fillStyle = 'blue';
  ctx.fillRect(0, canvas.height - 100, 100, 100);
  
  ctx.fillStyle = 'yellow';
  ctx.fillRect(canvas.width - 100, canvas.height - 100, 100, 100);
  
  ctx.fillStyle = 'white';
  ctx.font = '20px monospace';
  ctx.fillText(`${canvas.width}x${canvas.height}`, 10, 130);
  
  ctx.restore();
  console.log('Test pattern drawn');
}
