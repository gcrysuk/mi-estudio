import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

const useSpeechRecognition = ({ onResult, onEnd }) => {
  const recognitionRef  = useRef(null);
  const isListeningRef  = useRef(false);
  const errorCountRef   = useRef(0);
  const [isListening,   setIsListening]   = useState(false);
  const [reconnecting,  setReconnecting]  = useState(false);

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

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'network') toast.error('Error de red en la grabación');
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        setReconnecting(true);
        errorCountRef.current += 1;
        setTimeout(() => {
          try {
            recognition.start();
            setReconnecting(false);
          } catch {
            isListeningRef.current = false;
            setIsListening(false);
            setReconnecting(false);
            onEnd?.();
          }
        }, 300);
        return;
      }
      isListeningRef.current = false;
      setIsListening(false);
      setReconnecting(false);
      onEnd?.();
    };

    isListeningRef.current = true;
    errorCountRef.current = 0;
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
    setReconnecting(false);
  };

  const stop = () => {
    isListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setReconnecting(false);
  };

  return { isListening, reconnecting, start, stop };
};

export default useSpeechRecognition;
