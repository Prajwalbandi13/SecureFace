import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Clock3 } from 'lucide-react';

interface WebcamCaptureProps {
  challenge: {
    action: string;
    text: string;
  } | null;
  timer: number;
  isProcessing: boolean;
}

const WebcamCapture = forwardRef<Webcam, WebcamCaptureProps>(
  ({ challenge, timer, isProcessing }, webcamRef) => {
    return (
      <div className="relative rounded-xl overflow-hidden shadow-lg">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          className="w-full h-[300px] md:h-[360px] object-cover"
          videoConstraints={{
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }}
        />

        {/* Face outline guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 md:w-56 md:h-56 border-4 border-white border-opacity-40 rounded-full"></div>
        </div>

        {isProcessing && !challenge && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          >
            <div className="text-white text-xl font-medium flex items-center">
              <div className="mr-3 inline-block animate-spin rounded-full h-6 w-6 border-[3px] border-white border-t-transparent"></div>
              Processing...
            </div>
          </motion.div>
        )}

        {challenge && (
          <>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="absolute bottom-0 w-full bg-gradient-to-t from-black to-transparent pt-8 pb-4 px-4"
            >
              <div className="flex items-center justify-center text-white text-center text-lg md:text-xl font-medium">
                <Shield className="mr-2 h-5 w-5" /> {challenge.text}
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute top-3 right-3 bg-black bg-opacity-70 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg"
            >
              <Clock3 className="absolute h-10 w-10 text-white opacity-20" />
              {timer}
            </motion.div>
          </>
        )}
      </div>
    );
  }
);

WebcamCapture.displayName = 'WebcamCapture';

export default WebcamCapture;