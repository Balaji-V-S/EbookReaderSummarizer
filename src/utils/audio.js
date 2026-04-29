// src/utils/audio.js
// Uses Web Audio API to synthesize ambient sounds — no external files needed.

let audioCtx = null;
let noiseNode = null;
let gainNode = null;
let currentTrack = 'silence';

// Suspend audio when backgrounded
document.addEventListener('visibilitychange', () => {
    if (!audioCtx) return;
    if (document.hidden) {
        audioCtx.suspend();
    } else {
        audioCtx.resume();
    }
});

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function stopAll() {
    if (noiseNode) {
        try { noiseNode.stop(); } catch (_) {}
        noiseNode.disconnect();
        noiseNode = null;
    }
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
}

// Makes a looping white noise buffer (base for all sounds)
function makeNoiseBuffer(ctx, seconds = 4) {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * seconds;
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

function playNoise(filterType, frequency, Q, volume) {
    const ctx = getCtx();
    ctx.resume();
    stopAll();

    const buffer = makeNoiseBuffer(ctx, 2);
    noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    if (filterType) {
        const filter = ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.value = frequency;
        if (Q) filter.Q.value = Q;
        noiseNode.connect(filter);
        filter.connect(gainNode);
    } else {
        noiseNode.connect(gainNode);
    }

    gainNode.connect(ctx.destination);
    noiseNode.start();
}

export const playAmbience = (trackName) => {
    currentTrack = trackName || 'silence';
    stopAll();

    switch (currentTrack) {
        case 'rain':
            // Rain = filtered white noise, bandpass around 800Hz
            playNoise('bandpass', 800, 0.5, 0.6);
            break;
        case 'cafe':
            // Cafe = lower-pitched, denser rumble + hiss
            playNoise('lowpass', 400, 1.0, 0.35);
            break;
        case 'forest':
            // Forest = very low-pitched rumble (wind/leaves)
            playNoise('lowpass', 200, 1.5, 0.25);
            break;
        default:
            // Silence — stopAll already called
            break;
    }
};

export const stopAmbience = () => {
    stopAll();
    currentTrack = 'silence';
};
