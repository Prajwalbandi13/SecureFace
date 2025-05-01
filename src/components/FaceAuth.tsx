import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, Camera, Play, RotateCcw, Wifi, WifiOff } from 'lucide-react';
import WebcamCapture from './WebcamCapture';
import AuthResult from './AuthResult';

interface Challenge {
  action: string;
  text: string;
}

const FaceAuth: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const [authStatus, setAuthStatus] = useState<'ready' | 'processing' | 'success' | 'error'>('ready');
  const [result, setResult] = useState<any>(null);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [timer, setTimer] = useState(5);
  const [intervalId, setIntervalId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'healthy' | 'disconnected'>('checking');

  const challenges: Challenge[] = [
    { action: 'blink', text: 'Please blink your eyes' },
    { action: 'smile', text: 'Please smile' },
    { action: 'turn', text: 'Please turn your head slightly' }
  ];

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await axios.get('http://localhost:8000/health');
        setBackendStatus(response.data.status === 'healthy' ? 'healthy' : 'disconnected');
      } catch (error) {
        setBackendStatus('disconnected');
        console.error('Backend connection failed:', error);
      }
    };
    checkBackend();

    const connectionInterval = setInterval(checkBackend, 30000);
    
    return () => clearInterval(connectionInterval);
  }, []);

  const captureAndVerify = async () => {
    if (!webcamRef.current) return;
    
    setAuthStatus('processing');
    setResult(null);
    
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture webcam image');
      }
      
      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('file', blob, 'face_capture.jpg');

      const response = await axios.post('http://localhost:8000/api/verify', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
      setAuthStatus(response.data.is_real ? 'success' : 'error');
    } catch (error: any) {
      console.error('Verification error:', error);
      setAuthStatus('error');
      setResult({ 
        error: error.response?.data?.detail || 
               error.message || 
               'Authentication failed' 
      });
    }
  };

  const startChallenge = () => {
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    setChallenge(randomChallenge);
    setFrames([]);
    setTimer(5);
    setResult(null);

    const interval = setInterval(() => {
      if (webcamRef.current) {
        const frame = webcamRef.current.getScreenshot();
        if (frame) {
          setFrames(prev => [...prev, frame].slice(-10));
        }
      }
    }, 200);

    setIntervalId(interval);
  };

  const verifyChallenge = async () => {
    setAuthStatus('processing');
    
    try {
      const framesToSend = frames.slice(-3);
      
      if (framesToSend.length < 3) {
        throw new Error('Not enough frames captured. Please try again.');
      }

      const formData = new FormData();

      await Promise.all(
        framesToSend.map(async (frame, index) => {
          const blob = await fetch(frame).then(res => res.blob());
          formData.append('files', blob, `challenge_frame_${index}.jpg`);
        })
      );

      const response = await axios.post(
        'http://localhost:8000/api/verify-challenge',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 15000
        }
      );

      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Challenge verification failed');
      }

      setResult({
        ...response.data,
        challenge: challenge?.action,
        message: response.data.message || 
                `Challenge completed: ${challenge?.action} detected`
      });

      setAuthStatus(response.data.is_real ? 'success' : 'error');
    } catch (error: any) {
      console.error('Challenge verification error:', error);
      setAuthStatus('error');
      setResult({ 
        error: error.response?.data?.detail || 
               error.message || 
               'Failed to verify challenge. Please ensure you performed the action correctly and try again.'
      });
    } finally {
      setChallenge(null);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  };

  useEffect(() => {
    if (challenge && timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else if (challenge && timer === 0) {
      verifyChallenge();
    }
  }, [challenge, timer]);

  useEffect(() => {
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervalId]);

  const resetAuth = () => {
    setAuthStatus('ready');
    setResult(null);
    setChallenge(null);
    setFrames([]);
    setTimer(5);
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white text-center flex items-center justify-center">
          <Shield className="mr-3 h-8 w-8" />
          Face Authentication
        </h1>
        <p className="text-center text-white text-opacity-90 mt-2">
          Secure, AI-powered facial verification
        </p>
      </div>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {backendStatus !== 'healthy' && (
          <div className={`p-3 text-sm flex items-center justify-center ${
            backendStatus === 'checking' 
              ? 'bg-yellow-100 text-yellow-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {backendStatus === 'checking' 
              ? <Wifi className="mr-2 h-4 w-4 animate-pulse" /> 
              : <WifiOff className="mr-2 h-4 w-4" />}
            {backendStatus === 'checking' 
              ? 'Connecting to backend...' 
              : 'Backend unavailable - verification disabled'}
          </div>
        )}
        
        <div className="p-6">
          <WebcamCapture 
            ref={webcamRef}
            challenge={challenge}
            timer={timer}
            isProcessing={authStatus === 'processing'}
          />
          
          <div className="mt-6 grid grid-cols-2 gap-4">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={authStatus === 'processing' || challenge !== null || backendStatus !== 'healthy'}
              onClick={captureAndVerify}
              className={`relative overflow-hidden flex items-center justify-center py-3 px-4 rounded-xl text-white font-semibold 
                ${authStatus === 'processing' || challenge !== null || backendStatus !== 'healthy'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                }`}
            >
              <Camera className="mr-2 h-5 w-5" />
              Verify Face
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              disabled={authStatus === 'processing' || challenge !== null || backendStatus !== 'healthy'}
              onClick={startChallenge}
              className={`relative overflow-hidden flex items-center justify-center py-3 px-4 rounded-xl text-white font-semibold
                ${authStatus === 'processing' || challenge !== null || backendStatus !== 'healthy'
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                }`}
            >
              <Play className="mr-2 h-5 w-5" />
              Start Challenge
            </motion.button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={resetAuth}
            className="mt-4 w-full flex items-center justify-center py-2 px-4 rounded-xl bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </motion.button>
          
          <AuthResult result={result} authStatus={authStatus} />
        </div>
      </motion.div>
      
      <div className="mt-8 text-center text-white text-opacity-70 text-sm">
        <p>For demonstration purposes only.</p>
        <p className="mt-1">All verification is done locally in your browser.</p>
      </div>
    </div>
  );
};

export default FaceAuth;