// Celebratory chime sound using Web Audio API
export const playCelebrationChime = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a sequence of notes for a celebratory chime
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },      // C5
      { freq: 659.25, time: 0.15, duration: 0.15 },   // E5
      { freq: 783.99, time: 0.3, duration: 0.3 }      // G5
    ];
    
    notes.forEach(note => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = note.freq;
      oscillator.type = 'sine';
      
      // Envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + note.time);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + note.time + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.time + note.duration);
      
      oscillator.start(audioContext.currentTime + note.time);
      oscillator.stop(audioContext.currentTime + note.time + note.duration);
    });
  } catch (error) {
    console.log('Audio playback not supported');
  }
};