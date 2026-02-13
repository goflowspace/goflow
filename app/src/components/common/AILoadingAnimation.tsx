import React, {useEffect, useState} from 'react';

interface AILoadingAnimationProps {
  variant?: 'thinking' | 'generating' | 'processing' | 'neural' | 'particles';
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

const AILoadingAnimation: React.FC<AILoadingAnimationProps> = ({variant = 'thinking', size = 'medium', text, className = ''}) => {
  const [dots, setDots] = useState('');

  // Анимация точек для текста
  useEffect(() => {
    if (!text) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [text]);

  const sizeClasses = {
    small: {width: '32px', height: '32px', fontSize: '12px'},
    medium: {width: '48px', height: '48px', fontSize: '14px'},
    large: {width: '64px', height: '64px', fontSize: '16px'}
  };

  const currentSize = sizeClasses[size];

  const renderThinking = () => (
    <div className='ai-thinking-container' style={currentSize}>
      <div className='brain-wave'>
        <div className='wave wave-1'></div>
        <div className='wave wave-2'></div>
        <div className='wave wave-3'></div>
      </div>
      <div className='thinking-dots'>
        <div className='dot dot-1'></div>
        <div className='dot dot-2'></div>
        <div className='dot dot-3'></div>
      </div>
    </div>
  );

  const renderGenerating = () => (
    <div className='ai-generating-container' style={currentSize}>
      <div className='spiral-container'>
        <div className='spiral spiral-1'></div>
        <div className='spiral spiral-2'></div>
        <div className='spiral spiral-3'></div>
      </div>
      <div className='core-pulse'></div>
    </div>
  );

  const renderProcessing = () => (
    <div className='ai-processing-container' style={currentSize}>
      <div className='data-flow'>
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`flow-line flow-${i + 1}`}></div>
        ))}
      </div>
      <div className='central-node'></div>
    </div>
  );

  const renderNeural = () => (
    <div className='ai-neural-container' style={currentSize}>
      <div className='neural-network'>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`neuron neuron-${i + 1}`}>
            <div className='neuron-core'></div>
          </div>
        ))}
        {[...Array(8)].map((_, i) => (
          <div key={i} className={`synapse synapse-${i + 1}`}></div>
        ))}
      </div>
    </div>
  );

  const renderParticles = () => (
    <div className='ai-particles-container' style={currentSize}>
      <div className='particle-field'>
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`}></div>
        ))}
      </div>
      <div className='energy-core'></div>
    </div>
  );

  const renderAnimation = () => {
    switch (variant) {
      case 'generating':
        return renderGenerating();
      case 'processing':
        return renderProcessing();
      case 'neural':
        return renderNeural();
      case 'particles':
        return renderParticles();
      default:
        return renderThinking();
    }
  };

  return (
    <div className={`ai-loading-animation ${className}`}>
      {renderAnimation()}
      {text && (
        <div className='ai-loading-text' style={{fontSize: currentSize.fontSize}}>
          {text}
          {dots}
        </div>
      )}

      <style>{`
        .ai-loading-animation {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .ai-loading-text {
          color: #2563eb;
          font-weight: 500;
          text-align: center;
          min-height: 1.2em;
        }

        /* Thinking Animation */
        .ai-thinking-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brain-wave {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .wave {
          position: absolute;
          border: 2px solid;
          border-radius: 50%;
          animation: brain-wave 2s ease-in-out infinite;
        }

        .wave-1 {
          width: 20%;
          height: 20%;
          top: 40%;
          left: 40%;
          border-color: #3b82f6;
          animation-delay: 0s;
        }

        .wave-2 {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-color: #60a5fa;
          animation-delay: 0.3s;
        }

        .wave-3 {
          width: 60%;
          height: 60%;
          top: 20%;
          left: 20%;
          border-color: #93c5fd;
          animation-delay: 0.6s;
        }

        .thinking-dots {
          display: flex;
          gap: 4px;
        }

        .dot {
          width: 4px;
          height: 4px;
          background: #2563eb;
          border-radius: 50%;
          animation: thinking-bounce 1.4s ease-in-out infinite both;
        }

        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.16s; }
        .dot-3 { animation-delay: 0.32s; }

        @keyframes brain-wave {
          0%, 100% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.2); 
            opacity: 0.5; 
          }
        }

        @keyframes thinking-bounce {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        /* Generating Animation */
        .ai-generating-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spiral-container {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .spiral {
          position: absolute;
          border: 2px solid transparent;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spiral-rotate 1.5s linear infinite;
        }

        .spiral-1 {
          width: 80%;
          height: 80%;
          top: 10%;
          left: 10%;
          animation-delay: 0s;
        }

        .spiral-2 {
          width: 60%;
          height: 60%;
          top: 20%;
          left: 20%;
          border-top-color: #60a5fa;
          animation-delay: 0.2s;
          animation-direction: reverse;
        }

        .spiral-3 {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-top-color: #93c5fd;
          animation-delay: 0.4s;
        }

        .core-pulse {
          width: 20%;
          height: 20%;
          background: radial-gradient(circle, #3b82f6, #60a5fa);
          border-radius: 50%;
          animation: core-pulse 1s ease-in-out infinite alternate;
        }

        @keyframes spiral-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes core-pulse {
          0% { 
            transform: scale(0.8);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          100% { 
            transform: scale(1.2);
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
        }

        /* Processing Animation */
        .ai-processing-container {
          position: relative;
        }

        .data-flow {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .flow-line {
          position: absolute;
          background: linear-gradient(90deg, transparent, #3b82f6, transparent);
          animation: data-flow 2s linear infinite;
        }

        .flow-line:nth-child(odd) {
          width: 100%;
          height: 2px;
          left: 0;
        }

        .flow-line:nth-child(even) {
          width: 2px;
          height: 100%;
          top: 0;
        }

        .flow-1 { top: 20%; animation-delay: 0s; }
        .flow-2 { left: 80%; animation-delay: 0.25s; }
        .flow-3 { top: 80%; animation-delay: 0.5s; }
        .flow-4 { left: 20%; animation-delay: 0.75s; }
        .flow-5 { top: 50%; animation-delay: 1s; }
        .flow-6 { left: 50%; animation-delay: 1.25s; }
        .flow-7 { top: 35%; animation-delay: 1.5s; }
        .flow-8 { left: 65%; animation-delay: 1.75s; }

        .central-node {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: #2563eb;
          border-radius: 50%;
          animation: node-pulse 1s ease-in-out infinite alternate;
        }

        @keyframes data-flow {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes node-pulse {
          0% { 
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
          }
          100% { 
            transform: translate(-50%, -50%) scale(1.3);
            box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
          }
        }

        /* Neural Network Animation */
        .ai-neural-container {
          position: relative;
        }

        .neural-network {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .neuron {
          position: absolute;
          width: 8px;
          height: 8px;
        }

        .neuron-core {
          width: 100%;
          height: 100%;
          background: #3b82f6;
          border-radius: 50%;
          animation: neuron-fire 2s ease-in-out infinite;
        }

        .neuron-1 { top: 10%; left: 20%; animation-delay: 0s; }
        .neuron-2 { top: 10%; right: 20%; animation-delay: 0.3s; }
        .neuron-3 { top: 50%; left: 10%; animation-delay: 0.6s; }
        .neuron-4 { top: 50%; right: 10%; animation-delay: 0.9s; }
        .neuron-5 { bottom: 10%; left: 30%; animation-delay: 1.2s; }
        .neuron-6 { bottom: 10%; right: 30%; animation-delay: 1.5s; }

        .synapse {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, #60a5fa, transparent);
          animation: synapse-fire 2s ease-in-out infinite;
        }

        @keyframes neuron-fire {
          0%, 100% { 
            background: #3b82f6;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% { 
            background: #fbbf24;
            box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.3);
          }
        }

        @keyframes synapse-fire {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        /* Particles Animation */
        .ai-particles-container {
          position: relative;
        }

        .particle-field {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: #3b82f6;
          border-radius: 50%;
          animation: particle-orbit 3s linear infinite;
        }

        .energy-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: radial-gradient(circle, #fbbf24, #3b82f6);
          border-radius: 50%;
          animation: energy-pulse 1.5s ease-in-out infinite alternate;
        }

        @keyframes particle-orbit {
          0% { 
            transform: rotate(0deg) translateX(20px) rotate(0deg);
            opacity: 0;
          }
          10%, 90% {
            opacity: 1;
          }
          100% { 
            transform: rotate(360deg) translateX(20px) rotate(-360deg);
            opacity: 0;
          }
        }

        @keyframes energy-pulse {
          0% { 
            transform: translate(-50%, -50%) scale(0.8);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          100% { 
            transform: translate(-50%, -50%) scale(1.2);
            box-shadow: 0 0 0 12px rgba(59, 130, 246, 0);
          }
        }

        /* Particle delays */
        .particle-1 { animation-delay: 0s; }
        .particle-2 { animation-delay: 0.25s; }
        .particle-3 { animation-delay: 0.5s; }
        .particle-4 { animation-delay: 0.75s; }
        .particle-5 { animation-delay: 1s; }
        .particle-6 { animation-delay: 1.25s; }
        .particle-7 { animation-delay: 1.5s; }
        .particle-8 { animation-delay: 1.75s; }
        .particle-9 { animation-delay: 2s; }
        .particle-10 { animation-delay: 2.25s; }
        .particle-11 { animation-delay: 2.5s; }
        .particle-12 { animation-delay: 2.75s; }

        /* Responsive adjustments */
        @media (prefers-reduced-motion: reduce) {
          .ai-loading-animation * {
            animation-duration: 4s !important;
            animation-iteration-count: infinite !important;
          }
        }

        /* Dark theme */
        @media (prefers-color-scheme: dark) {
          .ai-loading-text {
            color: #93c5fd;
          }
          
          .wave-1 { border-color: #60a5fa; }
          .wave-2 { border-color: #93c5fd; }
          .wave-3 { border-color: #dbeafe; }
          
          .dot { background: #60a5fa; }
          
          .spiral-1 { border-top-color: #60a5fa; }
          .spiral-2 { border-top-color: #93c5fd; }
          .spiral-3 { border-top-color: #dbeafe; }
          
          .central-node { background: #60a5fa; }
          .neuron-core { background: #60a5fa; }
          .particle { background: #60a5fa; }
        }
      `}</style>
    </div>
  );
};

export default AILoadingAnimation;
