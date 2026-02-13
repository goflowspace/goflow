import React from 'react';

interface SkeletonTextareaProps {
  rows?: number;
  className?: string;
  aiActive?: boolean; // Флаг для активности ИИ
}

const SkeletonTextarea: React.FC<SkeletonTextareaProps> = ({rows = 3, className = '', aiActive = false}) => {
  const lineHeight = 20;
  const totalHeight = rows * lineHeight + 20;

  // Небольшая случайная задержка для избежания синхронизации
  const animationDelay = React.useMemo(() => Math.random() * 0.5, []);

  return (
    <div
      className={`skeleton-textarea ${className} ${aiActive ? 'ai-active' : ''}`}
      style={{
        height: `${totalHeight}px`,
        borderRadius: '8px',
        padding: '10px 12px',
        border: aiActive ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--dashboard-border-secondary, #e0e0e0)',
        position: 'relative',
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
        backgroundColor: aiActive ? '#eff6ff' : '#f8f9fa',
        isolation: 'isolate',
        boxShadow: aiActive ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Тонкий shimmer эффект */}
      <div
        className='skeleton-shimmer'
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '200%',
          height: '100%',
          background: aiActive
            ? 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.1) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
          animation: aiActive ? `skeleton-wave-ai 2s ease-in-out infinite ${animationDelay}s` : `skeleton-wave 3s ease-in-out infinite ${animationDelay}s`,
          willChange: 'transform',
          zIndex: 1
        }}
      />

      {/* Линии контента с анимацией */}
      <div style={{position: 'relative', zIndex: 2}}>
        {Array.from({length: rows}, (_, index) => (
          <div
            key={index}
            className={`content-line ${aiActive ? 'ai-active-line' : ''}`}
            style={{
              height: '14px',
              backgroundColor: aiActive ? 'rgba(59, 130, 246, 0.12)' : '#e2e8f0',
              borderRadius: '4px',
              marginBottom: '6px',
              width: index === rows - 1 ? '70%' : '100%',
              border: aiActive ? '1px solid rgba(59, 130, 246, 0.08)' : '1px solid rgba(148, 163, 184, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              animationDelay: `${index * 0.1}s`
            }}
          >
            {/* Внутренний shimmer для каждой строки */}
            <div
              className='line-shimmer'
              style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '200%',
                height: '100%',
                background: aiActive
                  ? 'linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.3) 50%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(148, 163, 184, 0.4) 50%, transparent 100%)',
                animation: aiActive ? `line-shimmer-ai 1.8s ease-in-out infinite ${animationDelay + index * 0.1}s` : `line-shimmer 2.5s ease-in-out infinite ${animationDelay + index * 0.15}s`
              }}
            />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes skeleton-wave {
          0% { 
            transform: translate3d(-100%, 0, 0);
          }
          100% { 
            transform: translate3d(100%, 0, 0);
          }
        }
        
        @keyframes skeleton-wave-ai {
          0% { 
            transform: translate3d(-100%, 0, 0) skewX(-10deg);
          }
          50% {
            transform: translate3d(0%, 0, 0) skewX(-10deg);
          }
          100% { 
            transform: translate3d(100%, 0, 0) skewX(-10deg);
          }
        }

        @keyframes line-shimmer {
          0% { 
            transform: translate3d(-100%, 0, 0);
          }
          100% { 
            transform: translate3d(100%, 0, 0);
          }
        }
        
        @keyframes line-shimmer-ai {
          0% { 
            transform: translate3d(-100%, 0, 0) skewX(-15deg);
          }
          50% {
            transform: translate3d(0%, 0, 0) skewX(-15deg);
          }
          100% { 
            transform: translate3d(100%, 0, 0) skewX(-15deg);
          }
        }
        


        /* Анимация строк контента */
        .content-line {
          animation: line-pulse 2s ease-in-out infinite alternate;
        }

        .content-line.ai-active-line {
          animation: line-pulse-ai 1.5s ease-in-out infinite alternate;
        }

        @keyframes line-pulse {
          0% {
            opacity: 0.7;
            transform: scale(1);
          }
          100% {
            opacity: 0.9;
            transform: scale(1.002);
          }
        }

                 @keyframes line-pulse-ai {
           0% {
             opacity: 0.8;
             transform: scale(1);
             background-color: rgba(59, 130, 246, 0.12);
           }
           50% {
             opacity: 1;
             transform: scale(1.005);
             background-color: rgba(59, 130, 246, 0.18);
           }
           100% {
             opacity: 0.9;
             transform: scale(1.002);
             background-color: rgba(59, 130, 246, 0.15);
           }
         }
        
        .skeleton-shimmer {
          /* Fallback для старых браузеров */
          background: rgba(255, 255, 255, 0.2);
          /* Дополнительная оптимизация */
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        
        .skeleton-textarea.ai-active {
          animation: ai-border-glow 2s ease-in-out infinite alternate;
        }
        
                 @keyframes ai-border-glow {
           0% {
             border-color: rgba(59, 130, 246, 0.3);
             box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
           }
           100% {
             border-color: rgba(59, 130, 246, 0.5);
             box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
           }
         }
        
        /* Медиа-запрос для уменьшения анимации при настройке "reduce motion" */
        @media (prefers-reduced-motion: reduce) {
          .skeleton-shimmer,
          .line-shimmer {
            animation: skeleton-pulse-reduced 3s ease-in-out infinite !important;
            transform: none !important;
          }
          
          .content-line {
            animation: none !important;
            opacity: 0.8 !important;
          }
          
          
          
                     .skeleton-textarea.ai-active {
             animation: none !important;
             border-color: rgba(59, 130, 246, 0.4) !important;
             box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15) !important;
           }
        }

        @keyframes skeleton-pulse-reduced {
          0%, 100% { 
            opacity: 0.6;
          }
          50% { 
            opacity: 0.8;
          }
        }
        
        /* Дополнительная стабилизация для браузеров */
        @supports (animation-fill-mode: both) {
          .skeleton-shimmer,
          .line-shimmer {
            animation-fill-mode: both;
          }
        }
        
        /* Темная тема */
        @media (prefers-color-scheme: dark) {
                     .skeleton-textarea.ai-active {
             background-color: #1e3a8a !important;
             border-color: rgba(96, 165, 250, 0.4) !important;
           }
           
           .content-line.ai-active-line {
             background-color: rgba(96, 165, 250, 0.15) !important;
             border-color: rgba(59, 130, 246, 0.2) !important;
           }
           
           .skeleton-textarea.ai-active .skeleton-shimmer {
             background: linear-gradient(90deg, 
               transparent 0%, 
               rgba(96, 165, 250, 0.15) 50%, 
               transparent 100%) !important;
           }

           .line-shimmer {
             background: linear-gradient(90deg, 
               transparent 0%, 
               rgba(147, 197, 253, 0.3) 50%, 
               transparent 100%) !important;
           }
        }
      `}</style>
    </div>
  );
};

export default SkeletonTextarea;
