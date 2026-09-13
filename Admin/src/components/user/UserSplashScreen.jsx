import React, { useEffect, useState } from 'react';
import { HeartPulse, Plus } from 'lucide-react';
import heroImage from '../../assets/hero.png';

const UserSplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2.5 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2500);

    // Call onFinish after fade out animation completes
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Background Image with Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
        }}
      />
      
      {/* Gradient Overlay for better contrast */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(160deg, rgba(30,58,138,0.85) 0%, rgba(29,78,216,0.75) 45%, rgba(37,99,235,0.85) 100%)',
        }}
      />

      {/* Decorative Elements */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          animation: 'pulse 3s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          animation: 'pulse 3s ease-in-out infinite 0.5s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite 1s',
        }}
      />

      {/* Logo Container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          animation: 'fadeInScale 0.8s ease-out',
        }}
      >
        {/* Main Logo Circle */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '3px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 20px rgba(255,255,255,0.05)',
            animation: 'float 3s ease-in-out infinite',
          }}
        >
          <HeartPulse size={64} color="#fff" strokeWidth={2} />
          
          {/* Plus Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: '3px solid #1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
              animation: 'bounce 2s ease-in-out infinite',
            }}
          >
            <Plus size={20} color="#fff" strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Brand Name */}
      <div
        style={{
          marginTop: 40,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          animation: 'fadeInUp 0.8s ease-out 0.2s both',
        }}
      >
        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            letterSpacing: '-0.03em',
            textShadow: '0 4px 20px rgba(0,0,0,0.2)',
          }}
        >
          B-Health
        </h1>
        <p
          style={{
            fontSize: 16,
            color: 'rgba(191,219,254,0.9)',
            margin: '12px 0 0 0',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          Barangay Health Center
        </p>
      </div>

      {/* Loading Indicator */}
      <div
        style={{
          marginTop: 60,
          position: 'relative',
          zIndex: 1,
          animation: 'fadeIn 0.8s ease-out 0.4s both',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            border: '3px solid rgba(255,255,255,0.2)',
            borderTop: '3px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>

      {/* Tagline */}
      <p
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 13,
          color: 'rgba(191,219,254,0.7)',
          margin: 0,
          fontWeight: 500,
          animation: 'fadeIn 0.8s ease-out 0.6s both',
        }}
      >
        Your Health, Our Priority
      </p>

      {/* Animations */}
      <style>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default UserSplashScreen;
