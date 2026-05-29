function generateBarcodeData(ticketNumber) {
  const seed = ticketNumber || "386230682177";
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const bars = [];
  const startX = 15;
  const totalWidth = 210;
  
  const pattern = [];
  let currentHash = Math.abs(hash);
  
  pattern.push(1, 1, 1);
  
  for (let i = 0; i < 15; i++) {
    currentHash = (currentHash * 1664525 + 1013904223) >>> 0;
    const width = (currentHash % 3) + 1;
    pattern.push(width);
  }
  
  pattern.push(1, 1, 1);
  
  const totalUnits = pattern.reduce((sum, w) => sum + w, 0);
  const unitSize = totalWidth / totalUnits;
  
  console.log("Total units:", totalUnits);
  console.log("Unit size in pixels:", unitSize.toFixed(2));
  
  let currentX = startX;
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i] * unitSize;
    if (i % 2 === 0) {
      console.log(`Bar ${i/2 + 1}: x = ${currentX.toFixed(2)}, w = ${width.toFixed(2)}`);
      bars.push({
        x: Number(currentX.toFixed(2)),
        w: Number(width.toFixed(2))
      });
    } else {
      console.log(`Gap ${Math.floor(i/2) + 1}: w = ${width.toFixed(2)}`);
    }
    currentX += width;
  }
  
  return bars;
}

generateBarcodeData("5122300705407");
