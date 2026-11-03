export class MarkerCursor {
  constructor() { this.serial = 0; this.clear(); }
  select(clip, duration, markers) {
    this.serial++; this.clip = clip; this.duration = duration; this.markers = markers;
    this.previous = -1e-9; this.paused = false; this.delivered = new Set();
  }
  clear() { this.clip = null; this.markers = []; this.paused = true; this.delivered = new Set(); }
  pause() { this.paused = true; }
  resume() { this.paused = false; }
  seek(time, loop = 0) { this.previous = loop * this.duration + time; }
  advance(time, loop) {
    if (!this.clip || this.paused) return [];
    const absolute = loop * this.duration + time, events = [];
    if (absolute < this.previous) { this.previous = absolute; return []; }
    const first = Math.max(0, Math.floor(this.previous / this.duration));
    for (let cycle = first; cycle <= loop; cycle++) for (const marker of this.markers) {
      const position = cycle * this.duration + marker.time;
      const id = `${this.serial}:${this.clip}:${cycle}:${marker.id}`;
      if (position > this.previous && position <= absolute && !this.delivered.has(id)) {
        this.delivered.add(id); events.push({ id, marker: marker.id, clip: this.clip, loop: cycle });
      }
    }
    this.previous = absolute; return events;
  }
}
