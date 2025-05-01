import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import FaceAuth from './components/FaceAuth';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 text-gray-900">
      <div className="container mx-auto px-4 py-12">
        <header className="mb-6 flex justify-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="bg-white bg-opacity-20 backdrop-blur-lg rounded-full px-6 py-3 flex items-center"
          >
            <ShieldCheck className="text-white mr-2 h-6 w-6" />
            <span className="text-white font-bold text-lg">SecureFace</span>
          </motion.div>
        </header>
        
        <FaceAuth />
      </div>
    </div>
  );
}

export default App;