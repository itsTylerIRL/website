"""
Cyberpunk Sound Effect Generator
Creates custom hover/click sounds for tylerirl.com
Requires: pip install numpy scipy
"""

import numpy as np
from scipy.io import wavfile
import os

SAMPLE_RATE = 44100

def generate_sine(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate a sine wave"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return np.sin(2 * np.pi * freq * t)

def generate_square(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate a square wave"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return np.sign(np.sin(2 * np.pi * freq * t))

def generate_sawtooth(freq, duration, sample_rate=SAMPLE_RATE):
    """Generate a sawtooth wave"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return 2 * (t * freq - np.floor(0.5 + t * freq))

def apply_envelope(signal, attack=0.01, decay=0.1, sustain=0.5, release=0.1):
    """Apply ADSR envelope to signal"""
    total_samples = len(signal)
    attack_samples = int(attack * SAMPLE_RATE)
    decay_samples = int(decay * SAMPLE_RATE)
    release_samples = int(release * SAMPLE_RATE)
    sustain_samples = total_samples - attack_samples - decay_samples - release_samples
    
    if sustain_samples < 0:
        sustain_samples = 0
    
    envelope = np.concatenate([
        np.linspace(0, 1, attack_samples),  # Attack
        np.linspace(1, sustain, decay_samples),  # Decay
        np.full(sustain_samples, sustain),  # Sustain
        np.linspace(sustain, 0, release_samples)  # Release
    ])
    
    # Pad or trim envelope to match signal length
    if len(envelope) < total_samples:
        envelope = np.pad(envelope, (0, total_samples - len(envelope)))
    else:
        envelope = envelope[:total_samples]
    
    return signal * envelope

def add_noise(signal, amount=0.05):
    """Add white noise to signal"""
    noise = np.random.uniform(-1, 1, len(signal))
    return signal + noise * amount

def bitcrush(signal, bits=8):
    """Reduce bit depth for that retro digital sound"""
    levels = 2 ** bits
    return np.round(signal * levels) / levels

def frequency_sweep(start_freq, end_freq, duration, wave_type='sine'):
    """Generate a frequency sweep"""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), False)
    freq = np.linspace(start_freq, end_freq, len(t))
    phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
    
    if wave_type == 'sine':
        return np.sin(phase)
    elif wave_type == 'square':
        return np.sign(np.sin(phase))
    else:
        return np.sin(phase)

def normalize(signal):
    """Normalize signal to -1 to 1 range"""
    max_val = np.max(np.abs(signal))
    if max_val > 0:
        return signal / max_val
    return signal

def save_wav(filename, signal, sample_rate=SAMPLE_RATE):
    """Save signal as WAV file"""
    # Normalize and convert to 16-bit
    signal = normalize(signal)
    signal = (signal * 32767).astype(np.int16)
    wavfile.write(filename, sample_rate, signal)
    print(f"Saved: {filename}")


# =============================================================================
# HOVER SOUNDS - Subtle, quick, satisfying
# =============================================================================

def create_hover_blip():
    """Quick digital blip - classic hover sound"""
    duration = 0.08
    # High frequency blip with fast decay
    signal = generate_sine(1800, duration)
    signal = apply_envelope(signal, attack=0.005, decay=0.03, sustain=0.2, release=0.02)
    signal = bitcrush(signal, 12)
    return signal

def create_hover_sweep():
    """Quick upward frequency sweep"""
    duration = 0.1
    signal = frequency_sweep(400, 1200, duration, 'sine')
    signal = apply_envelope(signal, attack=0.01, decay=0.04, sustain=0.3, release=0.03)
    return signal

def create_hover_glitch():
    """Glitchy digital hover with noise burst"""
    duration = 0.06
    # Base tone
    base = generate_square(800, duration) * 0.3
    # Add noise burst
    noise = np.random.uniform(-0.4, 0.4, int(SAMPLE_RATE * duration))
    signal = base + noise
    signal = apply_envelope(signal, attack=0.002, decay=0.02, sustain=0.1, release=0.02)
    signal = bitcrush(signal, 6)
    return signal

def create_hover_soft():
    """Soft, warm hover tone"""
    duration = 0.12
    # Layered sine waves for warmth
    signal = generate_sine(600, duration) * 0.5
    signal += generate_sine(900, duration) * 0.3
    signal += generate_sine(1200, duration) * 0.2
    signal = apply_envelope(signal, attack=0.02, decay=0.05, sustain=0.3, release=0.03)
    return signal

def create_hover_cyber():
    """Cyberpunk-style hover with harmonics"""
    duration = 0.1
    # Base with overtones
    signal = generate_sine(440, duration) * 0.4
    signal += generate_sine(880, duration) * 0.3
    signal += generate_sine(1320, duration) * 0.2
    signal += generate_square(440, duration) * 0.1
    signal = apply_envelope(signal, attack=0.005, decay=0.04, sustain=0.2, release=0.03)
    signal = bitcrush(signal, 10)
    return signal


# =============================================================================
# CLICK SOUNDS - More prominent, satisfying feedback
# =============================================================================

def create_click_confirm():
    """Satisfying confirmation click"""
    duration = 0.15
    # Two-tone confirmation
    tone1 = generate_sine(800, 0.07)
    tone1 = apply_envelope(tone1, attack=0.005, decay=0.02, sustain=0.4, release=0.02)
    
    tone2 = generate_sine(1200, 0.08)
    tone2 = apply_envelope(tone2, attack=0.005, decay=0.02, sustain=0.3, release=0.03)
    
    # Pad tone1 to align
    gap = np.zeros(int(0.04 * SAMPLE_RATE))
    signal = np.concatenate([tone1, gap, tone2])
    return signal

def create_click_digital():
    """Sharp digital click"""
    duration = 0.1
    # Sharp attack square wave
    signal = generate_square(600, duration) * 0.5
    signal += generate_sine(1200, duration) * 0.3
    signal = apply_envelope(signal, attack=0.002, decay=0.03, sustain=0.2, release=0.04)
    signal = bitcrush(signal, 8)
    # Add initial transient
    transient = np.random.uniform(-1, 1, int(0.005 * SAMPLE_RATE))
    signal[:len(transient)] += transient * 0.5
    return signal

def create_click_glitch():
    """Glitchy artifact click"""
    duration = 0.12
    # Random frequency jumps
    chunks = []
    for i in range(6):
        freq = np.random.randint(400, 2000)
        chunk_dur = duration / 6
        chunk = generate_square(freq, chunk_dur) * 0.4
        chunks.append(chunk)
    signal = np.concatenate(chunks)
    signal = apply_envelope(signal, attack=0.002, decay=0.04, sustain=0.3, release=0.04)
    signal = bitcrush(signal, 6)
    return signal

def create_click_bass():
    """Deep bass click with punch"""
    duration = 0.18
    # Low frequency punch
    bass = frequency_sweep(200, 80, 0.08, 'sine')
    bass = apply_envelope(bass, attack=0.002, decay=0.03, sustain=0.4, release=0.03)
    
    # High click transient
    click = generate_sine(2000, 0.03) * 0.5
    click = apply_envelope(click, attack=0.001, decay=0.01, sustain=0.2, release=0.01)
    
    # Combine
    signal = np.zeros(int(duration * SAMPLE_RATE))
    signal[:len(bass)] = bass
    signal[:len(click)] += click
    return signal

def create_click_scifi():
    """Sci-fi interface click"""
    duration = 0.2
    # Descending sweep
    sweep = frequency_sweep(2500, 400, 0.1, 'sine')
    sweep = apply_envelope(sweep, attack=0.002, decay=0.04, sustain=0.3, release=0.04)
    
    # Resonant tail
    tail = generate_sine(400, 0.1) * 0.3
    tail = apply_envelope(tail, attack=0.01, decay=0.04, sustain=0.2, release=0.04)
    
    signal = np.concatenate([sweep, tail])
    signal = bitcrush(signal, 10)
    return signal

def create_click_mechanical():
    """Mechanical relay click"""
    duration = 0.08
    # Sharp transient
    transient = np.random.uniform(-1, 1, int(0.003 * SAMPLE_RATE))
    
    # Resonant ping
    ping = generate_sine(3000, duration) * 0.4
    ping += generate_sine(1500, duration) * 0.3
    ping = apply_envelope(ping, attack=0.001, decay=0.02, sustain=0.1, release=0.04)
    
    signal = np.zeros(int(duration * SAMPLE_RATE))
    signal[:len(transient)] = transient
    signal += ping
    return signal


# =============================================================================
# SPECIAL EFFECTS
# =============================================================================

def create_error_buzz():
    """Error/negative feedback buzz"""
    duration = 0.25
    # Dissonant frequencies
    signal = generate_square(150, duration) * 0.3
    signal += generate_square(157, duration) * 0.3  # Slight detune for nastiness
    signal += generate_sawtooth(300, duration) * 0.2
    signal = apply_envelope(signal, attack=0.01, decay=0.05, sustain=0.6, release=0.08)
    signal = bitcrush(signal, 6)
    return signal

def create_success_chime():
    """Success/positive feedback chime"""
    duration = 0.4
    # Ascending arpeggio
    notes = [523, 659, 784, 1047]  # C5, E5, G5, C6
    signal = np.zeros(int(duration * SAMPLE_RATE))
    
    for i, freq in enumerate(notes):
        start = int(i * 0.08 * SAMPLE_RATE)
        note = generate_sine(freq, 0.15)
        note = apply_envelope(note, attack=0.01, decay=0.05, sustain=0.4, release=0.06)
        end = min(start + len(note), len(signal))
        signal[start:end] += note[:end-start] * (0.5 - i * 0.08)
    
    return signal

def create_boot_sequence():
    """System boot/startup sound"""
    duration = 0.8
    signal = np.zeros(int(duration * SAMPLE_RATE))
    
    # Initial noise burst
    noise = np.random.uniform(-0.3, 0.3, int(0.05 * SAMPLE_RATE))
    signal[:len(noise)] = noise
    
    # Rising sweep
    sweep_start = int(0.1 * SAMPLE_RATE)
    sweep = frequency_sweep(100, 800, 0.3, 'sawtooth') * 0.4
    sweep = apply_envelope(sweep, attack=0.05, decay=0.1, sustain=0.5, release=0.1)
    signal[sweep_start:sweep_start+len(sweep)] += sweep
    
    # Final confirmation tone
    tone_start = int(0.5 * SAMPLE_RATE)
    tone = generate_sine(800, 0.2) * 0.5
    tone += generate_sine(1200, 0.2) * 0.3
    tone = apply_envelope(tone, attack=0.02, decay=0.05, sustain=0.4, release=0.08)
    signal[tone_start:tone_start+len(tone)] += tone
    
    signal = bitcrush(signal, 10)
    return signal


# =============================================================================
# MAIN - Generate all sounds
# =============================================================================

if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.abspath(__file__))
    
    print("Generating cyberpunk sound effects...")
    print("=" * 50)
    
    # Hover sounds
    print("\n[HOVER SOUNDS]")
    save_wav(os.path.join(output_dir, "hover_blip.wav"), create_hover_blip())
    save_wav(os.path.join(output_dir, "hover_sweep.wav"), create_hover_sweep())
    save_wav(os.path.join(output_dir, "hover_glitch.wav"), create_hover_glitch())
    save_wav(os.path.join(output_dir, "hover_soft.wav"), create_hover_soft())
    save_wav(os.path.join(output_dir, "hover_cyber.wav"), create_hover_cyber())
    
    # Click sounds
    print("\n[CLICK SOUNDS]")
    save_wav(os.path.join(output_dir, "click_confirm.wav"), create_click_confirm())
    save_wav(os.path.join(output_dir, "click_digital.wav"), create_click_digital())
    save_wav(os.path.join(output_dir, "click_glitch.wav"), create_click_glitch())
    save_wav(os.path.join(output_dir, "click_bass.wav"), create_click_bass())
    save_wav(os.path.join(output_dir, "click_scifi.wav"), create_click_scifi())
    save_wav(os.path.join(output_dir, "click_mechanical.wav"), create_click_mechanical())
    
    # Special effects
    print("\n[SPECIAL EFFECTS]")
    save_wav(os.path.join(output_dir, "error_buzz.wav"), create_error_buzz())
    save_wav(os.path.join(output_dir, "success_chime.wav"), create_success_chime())
    save_wav(os.path.join(output_dir, "boot_sequence.wav"), create_boot_sequence())
    
    print("\n" + "=" * 50)
    print("Done! Generated 14 sound effects.")
    print("\nRecommended pairings:")
    print("  - Tile hover: hover_cyber.wav or hover_blip.wav")
    print("  - Tile click: click_scifi.wav or click_digital.wav")
    print("  - Error state: error_buzz.wav")
    print("  - Success: success_chime.wav")
