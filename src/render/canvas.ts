import type { GameContext, GameEntity } from '../types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  
  private cameraYOffset = -150; 
  private cameraZ = 150;        
  private renderDistance = 1500;
  private laneWidth = 120;
  
  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }
  
  public render(context: GameContext) {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // DayNight cycle logic
    const timeVal = (context.time || 0) * 0.0005;
    const cycle = timeVal - Math.floor(timeVal);
    let r = 0, g = 0, b = 0, a = 0;
    if (cycle < 0.25) {
      a = 0;
    } else if (cycle < 0.5) {
      const t = (cycle - 0.25) / 0.25;
      r = 255; g = 100; b = 50; a = t * 0.5;
    } else if (cycle < 0.75) {
      const t = (cycle - 0.5) / 0.25;
      r = 255 * (1 - t) + 10 * t;
      g = 100 * (1 - t) + 10 * t;
      b = 50 * (1 - t) + 40 * t;
      a = 0.5 + t * 0.2;
    } else {
      const t = (cycle - 0.75) / 0.25;
      if (t < 0.5) {
        const t2 = t / 0.5;
        r = 10 * (1 - t2) + 255 * t2;
        g = 10 * (1 - t2) + 200 * t2;
        b = 40 * (1 - t2) + 100 * t2;
        a = 0.7 - t2 * 0.3;
      } else {
        const t2 = (t - 0.5) / 0.5;
        r = 255; g = 200; b = 100;
        a = 0.4 * (1 - t2);
      }
    }
    
    if (a > 0) {
      this.ctx.fillStyle = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    if (context.state === 'MENU') return;

    this.drawLanes();
    
    const sortedEntities = [...context.entities].sort((a, b) => b.y - a.y);
    for (const entity of sortedEntities) {
      if (entity.y < context.player.y - 100) continue; 
      this.drawEntity(entity, context.player.y);
    }
    
    this.drawPlayer(context);
  }
  
  private project3D(laneIndex: number, logicalY: number, logicalZ: number, playerY: number) {
    const relY = logicalY - playerY - this.cameraYOffset;
    if (relY <= 0.1) return null; 
    
    const scale = this.cameraZ / (relY + this.cameraZ);
    const logicalX = (laneIndex - 1) * this.laneWidth;
    
    const screenX = this.width / 2 + logicalX * scale * 2;
    const screenY = this.height - (this.cameraZ - logicalZ) * scale * 3;
    
    return { x: screenX, y: screenY, scale: scale * 2 };
  }

  private drawLanes() {
    this.ctx.strokeStyle = '#16213e';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    
    for(let i = -1; i <= 2; i++) {
       const laneX = (i - 1.5) * this.laneWidth;
       
       const nearRelY = -this.cameraYOffset;
       const nearScale = this.cameraZ / (nearRelY + this.cameraZ);
       const nearScreenX = this.width / 2 + laneX * nearScale * 2;
       const nearScreenY = this.height - this.cameraZ * nearScale * 3;
       
       const farRelY = this.renderDistance;
       const farScale = this.cameraZ / (farRelY + this.cameraZ);
       const farScreenX = this.width / 2 + laneX * farScale * 2;
       const farScreenY = this.height - this.cameraZ * farScale * 3;
       
       this.ctx.moveTo(nearScreenX, nearScreenY);
       this.ctx.lineTo(farScreenX, farScreenY);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = '#0f3460';
    this.ctx.beginPath();
    const farRelY = this.renderDistance;
    const farScale = this.cameraZ / (farRelY + this.cameraZ);
    const horizonY = this.height - this.cameraZ * farScale * 3;
    this.ctx.moveTo(0, horizonY);
    this.ctx.lineTo(this.width, horizonY);
    this.ctx.stroke();
  }

  private drawEntity(entity: GameEntity, playerY: number) {
    const proj = this.project3D(entity.lane, entity.y, entity.height / 2, playerY);
    if (!proj) return;
    
    const w = entity.width * proj.scale * 2.5; 
    const h = entity.height * proj.scale * 2.5;
    
    this.ctx.beginPath();
    if (entity.type === 'COIN') {
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.shadowBlur = 15 * proj.scale;
      this.ctx.shadowColor = '#f1c40f';
      this.ctx.arc(proj.x, proj.y, w/2, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (entity.type === 'MAGNET_ITEM') {
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.shadowBlur = 10 * proj.scale;
      this.ctx.shadowColor = '#e74c3c';
      this.ctx.arc(proj.x, proj.y - h/2, w/2, Math.PI, 0);
      this.ctx.lineTo(proj.x + w/2, proj.y);
      this.ctx.lineTo(proj.x + w/4, proj.y);
      this.ctx.lineTo(proj.x + w/4, proj.y - h/2);
      this.ctx.arc(proj.x, proj.y - h/2, w/4, 0, Math.PI, true);
      this.ctx.lineTo(proj.x - w/4, proj.y);
      this.ctx.lineTo(proj.x - w/2, proj.y);
      this.ctx.fill();
    } else if (entity.type === 'SHIELD_ITEM') {
      this.ctx.fillStyle = '#3498db';
      this.ctx.shadowBlur = 10 * proj.scale;
      this.ctx.shadowColor = '#3498db';
      this.ctx.moveTo(proj.x - w/2, proj.y - h);
      this.ctx.lineTo(proj.x + w/2, proj.y - h);
      this.ctx.lineTo(proj.x + w/2, proj.y - h/2);
      this.ctx.lineTo(proj.x, proj.y);
      this.ctx.lineTo(proj.x - w/2, proj.y - h/2);
      this.ctx.fill();
    } else if (entity.type === 'DOUBLE_SCORE_ITEM') {
      this.ctx.fillStyle = '#9b59b6';
      this.ctx.shadowBlur = 10 * proj.scale;
      this.ctx.shadowColor = '#9b59b6';
      this.ctx.moveTo(proj.x, proj.y - h);
      this.ctx.lineTo(proj.x + w/2, proj.y - h/2);
      this.ctx.lineTo(proj.x, proj.y);
      this.ctx.lineTo(proj.x - w/2, proj.y - h/2);
      this.ctx.fill();
    } else if (entity.type === 'MOVING_TRAIN') {
      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.shadowBlur = 0;
      this.ctx.fillRect(proj.x - w/2, proj.y - h, w, h);
      this.ctx.fillStyle = '#c0392b';
      const stripeHeight = h * 0.2;
      this.ctx.fillRect(proj.x - w/2, proj.y - h/2 - stripeHeight/2, w, stripeHeight);
    } else {
      this.ctx.fillStyle = '#e94560';
      this.ctx.shadowBlur = 0;
      this.ctx.fillRect(proj.x - w/2, proj.y - h, w, h);
    }
    this.ctx.shadowBlur = 0; 
  }

  private drawPlayer(context: GameContext) {
    const p = context.player;
    const proj = this.project3D(p.lane, p.y, p.z, p.y); 
    if (!proj) return;

    let w = 24 * proj.scale;
    let h = (p.state === 'ROLLING' ? 12 : 36) * proj.scale;
    
    if (p.z > 0) {
      const shadowProj = this.project3D(p.lane, p.y, 0, p.y);
      if(shadowProj) {
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.beginPath();
        this.ctx.ellipse(shadowProj.x, shadowProj.y, w/1.5, w/3, 0, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    this.ctx.fillStyle = p.skinColor || '#0f3460'; 
    this.ctx.fillRect(proj.x - w/2, proj.y - h, w, h);
    this.ctx.strokeStyle = '#43aa8b';
    this.ctx.lineWidth = 2 * proj.scale;
    this.ctx.strokeRect(proj.x - w/2, proj.y - h, w, h);
    
    if (p.buffs.shield) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.8)';
      this.ctx.lineWidth = 3 * proj.scale;
      this.ctx.arc(proj.x, proj.y - h/2, Math.max(w, h) * 0.8, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    if (p.buffs.magnetTimer > 0) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.6)';
      this.ctx.lineWidth = 2 * proj.scale;
      this.ctx.arc(proj.x, proj.y - h/2, Math.max(w, h) * 1.0, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    if (p.buffs.doubleScoreTimer > 0) {
      this.ctx.beginPath();
      this.ctx.strokeStyle = 'rgba(155, 89, 182, 0.8)';
      this.ctx.lineWidth = 2 * proj.scale;
      this.ctx.setLineDash([5 * proj.scale, 5 * proj.scale]);
      this.ctx.strokeRect(proj.x - w/2 - 4*proj.scale, proj.y - h - 4*proj.scale, w + 8*proj.scale, h + 8*proj.scale);
      this.ctx.setLineDash([]);
    }
  }
}
