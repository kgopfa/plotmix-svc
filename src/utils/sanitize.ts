export function sanitizeMovePropertiesInPlace(doc: any): void {
  if (!doc || !doc.mainState) return;
  
  const fix = (anim: any) => {
    if (!anim || anim.type !== 'move' || !anim.properties) return;
    const p = anim.properties as any;
    if (Array.isArray(p.x) && p.x.length > 0) {
      const to = Number(p.x[p.x.length - 1]);
      if (!Number.isNaN(to)) p.x = to;
    }
    if (Array.isArray(p.y) && p.y.length > 0) {
      const to = Number(p.y[p.y.length - 1]);
      if (!Number.isNaN(to)) p.y = to;
    }
  };

  // Handle multi-scene array format
  if (doc.mainState.scenes && Array.isArray(doc.mainState.scenes)) {
    doc.mainState.scenes.forEach((scene: any) => {
      if (!scene.sceneCanvas) return;
      
      for (const el of scene.sceneCanvas.elements || []) {
        for (const a of el.animations || []) fix(a);
      }
      for (const g of scene.sceneCanvas.groups || []) {
        for (const a of g.animations || []) fix(a);
      }
    });
  }
}


