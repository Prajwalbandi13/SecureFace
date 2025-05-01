import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, BarChart3 } from 'lucide-react';

interface AuthResultProps {
  result: any;
  authStatus: string;
}

const AuthResult: React.FC<AuthResultProps> = ({ result, authStatus }) => {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`w-full mt-6 rounded-xl overflow-hidden shadow-md`}
    >
      <div 
        className={`px-5 py-3 font-semibold flex items-center ${
          authStatus === 'success'
            ? 'bg-green-500 text-white'
            : authStatus === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-blue-500 text-white'
        }`}
      >
        {authStatus === 'success' ? (
          <CheckCircle className="mr-2 h-5 w-5" />
        ) : authStatus === 'error' ? (
          <XCircle className="mr-2 h-5 w-5" />
        ) : (
          <AlertTriangle className="mr-2 h-5 w-5" />
        )}
        <span>
          {authStatus === 'success'
            ? 'Authentication Successful'
            : authStatus === 'error'
            ? 'Authentication Failed'
            : 'Processing'}
        </span>
      </div>

      <div 
        className={`p-5 ${
          authStatus === 'success'
            ? 'bg-green-50'
            : authStatus === 'error'
            ? 'bg-red-50'
            : 'bg-gray-50'
        }`}
      >
        {result.error ? (
          <div className="flex items-start">
            <AlertTriangle className="text-red-500 mr-3 h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-red-800">{result.error}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center mb-4">
              {result.is_real ? (
                <div className="flex items-center text-green-800 font-medium text-lg">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Real Face Detected
                </div>
              ) : (
                <div className="flex items-center text-red-800 font-medium text-lg">
                  <XCircle className="mr-2 h-5 w-5" />
                  Spoof Detected
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-1 flex items-center">
                  <BarChart3 className="mr-1 h-4 w-4" /> Confidence Score
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      result.confidence > 0.7 
                        ? 'bg-green-500' 
                        : result.confidence > 0.4 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(result.confidence * 100)}%` }}
                  ></div>
                </div>
                <p className="text-right text-xs text-gray-500 mt-1">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>

              {result.challenge && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium">
                    Challenge: {result.challenge} {result.motion_detected ? '✅' : '❌'}
                  </p>
                  {result.motion_detected !== undefined && (
                    <p className="text-xs text-gray-600 mt-1">
                      Motion detected: {result.motion_detected ? 'Yes' : 'No'} 
                      {result.avg_motion && ` (${result.avg_motion.toFixed(4)})`}
                    </p>
                  )}
                  {result.message && (
                    <p className="text-sm mt-2">{result.message}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default AuthResult;