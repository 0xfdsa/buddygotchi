// Original sample-free synthesis. This module runs unchanged in Node and browsers.
// Recipes contain only oscillators, filtered noise, envelopes and event times.
export const SAMPLE_RATE = 44100;

export function random(seed = 1) {
  let n = seed >>> 0 || 1;
  return () => { n ^= n << 13; n ^= n >>> 17; n ^= n << 5; return (n >>> 0) / 4294967296; };
}

function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

function oscillator(phase, dt, wave) {
  const p = phase % 1;
  if (wave === 'triangle') return 1 - 4 * Math.abs(p - 0.5);
  if (wave === 'pulse') return (p < 0.25 ? 1 : -1 / 3) + (blep(p, dt) - blep((p + 0.75) % 1, dt)) * 2 / 3;
  if (wave === 'square') return (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt);
  return Math.sin(phase * Math.PI * 2);
}

export function renderRecipe(recipe, seed = 1, sampleRate = SAMPLE_RATE) {
  const out = new Float32Array(Math.ceil(recipe.duration * sampleRate));
  recipe.layers.forEach((layer, index) => {
    const rng = random((seed + Math.imul(index + 1, 2654435761)) >>> 0);
    const start = Math.round((layer.at || 0) * sampleRate);
    const length = Math.ceil(layer.duration * sampleRate);
    const attack = layer.attack ?? 0.002;
    const release = Math.min(layer.release ?? 0.015, layer.duration / 3);
    const decay = layer.decay ?? layer.duration / 4;
    const freq = layer.freq || 440, end = layer.end ?? freq;
    let phase = 0, low = 0, slow = 0, held = 0;
    for (let i = 0; i < length && start + i < out.length; i++) {
      const t = i / sampleRate, u = t / layer.duration;
      let f = freq * Math.pow(end / freq, u);
      if (layer.steps) f = layer.steps[Math.min(layer.steps.length - 1, Math.floor(u * layer.steps.length))];
      f *= 1 + (layer.wobble || 0) * Math.sin(t * Math.PI * 2 * (layer.wobbleHz || 18)) * Math.exp(-t * 5);
      f = Math.max(15, Math.min(sampleRate * 0.2, f));
      const dt = f / sampleRate;
      phase += dt;
      let value;
      if (layer.wave === 'noise') {
        if (i % (layer.hold || 1) === 0) held = rng() * 2 - 1;
        value = held;
      } else value = oscillator(phase, dt, layer.wave);
      const cutoff = (layer.lowpass || sampleRate * 0.42) * Math.pow(layer.filterEnd ?? 1, u);
      const alpha = 1 - Math.exp(-2 * Math.PI * Math.min(cutoff, sampleRate * 0.45) / sampleRate);
      low += alpha * (value - low);
      value = low;
      if (layer.highpass) {
        slow += (1 - Math.exp(-2 * Math.PI * layer.highpass / sampleRate)) * (value - slow);
        value -= slow;
      }
      const env = Math.min(1, t / Math.max(attack, 1 / sampleRate))
        * Math.exp(-t / decay)
        * Math.min(1, Math.max(0, (layer.duration - t) / release));
      out[start + i] += value * env * layer.amp;
    }
  });
  // A shared output stage preserves relative effect levels; no per-clip normalization.
  let previousIn = 0, previousOut = 0;
  const dc = Math.exp(-2 * Math.PI * 20 / sampleRate);
  for (let i = 0; i < out.length; i++) {
    const x = out[i];
    const y = x - previousIn + dc * previousOut;
    previousIn = x; previousOut = y;
    const fade = Math.min(1, i / (sampleRate * 0.001), (out.length - 1 - i) / (sampleRate * 0.012));
    out[i] = Math.tanh(y * 1.15) * 0.70 * Math.max(0, fade);
  }
  return out;
}

export function renderSequence(events, presets, duration, seed = 17, sampleRate = SAMPLE_RATE) {
  const out = new Float32Array(Math.ceil(duration * sampleRate));
  for (let k = 0; k < events.length; k++) {
    const event = events[k];
    const clip = renderRecipe(presets[event.effect], seed + k * 101, sampleRate);
    const start = Math.round(event.at * sampleRate);
    for (let i = 0; i < clip.length && start + i < out.length; i++) out[start + i] += clip[i] * (event.gain ?? 1);
  }
  // Only attenuate if necessary. Never boost a quiet event into a loud one.
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  if (peak > 0.80) for (let i = 0; i < out.length; i++) out[i] *= 0.80 / peak;
  const fade = Math.round(sampleRate * 0.015);
  for (let i = 0; i < Math.min(fade, out.length); i++) out[out.length - 1 - i] *= i / fade;
  return out;
}
