import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

const useSpeechRecognition = ({ onResult, onEnd }) => {
  const recognitionRef = useRef(null);
  const [isListening, setIsListening] = useState(false);

  const start = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Tu navegador no soporta reconocimiento de voz. Usá Chrome.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-AR';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ');
      onResult(transcript);
    };
    recognition.onend = () => { setIsListening(false); onEnd?.(); };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return { isListening, start, stop };
};

export default useSpeechRecognition;
