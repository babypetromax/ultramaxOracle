import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import './OracleHomeScreen.css';

interface OracleHomeScreenProps {
  onStart: () => void;
}

const OracleHomeScreen: React.FC<OracleHomeScreenProps> = ({ onStart }) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 1.5, // Delay for overall content to fade in after background
        staggerChildren: 0.3,
      },
    },
    exit: { opacity: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  const itemVariants: Variants = {
    hidden: { y: 50, opacity: 0, scale: 0.9 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 70, // Softer spring for a more ethereal feel
        damping: 10,
        mass: 0.8
      },
    },
  };

  const titleVariants: Variants = {
    hidden: { y: -50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 0.8, // Title appears slightly earlier
        type: 'spring',
        stiffness: 80,
        damping: 12,
      }
    }
  };

  const buttonVariants: Variants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        delay: 1.5, // Button appears last, after content is established
        type: 'spring',
        stiffness: 60,
        damping: 10,
      }
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="oracle-home-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 1.5, ease: "easeOut" } }} // Longer exit for a dramatic fade
        transition={{ duration: 1.5, ease: "easeIn" }} // Longer initial entry
      >
        {/* Animated Cosmic Background & Data Streams */}
        <div className="oracle-background">
          <div className="starfield" />
          <div className="data-stream-1" />
          <div className="data-stream-2" />
        </div>

        <motion.div
          className="oracle-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit" // Apply exit variant to the content as well
        >
          {/* ========== The Oracle Orb (Enhanced) ========== */}
          <motion.div className="oracle-orb-container" variants={itemVariants}>
            <motion.div
              className="oracle-ring ring-1"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 80, ease: 'linear' }}
            />
            <motion.div
              className="oracle-ring ring-2"
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 65, ease: 'linear' }}
            />
            <motion.div
              className="oracle-ring ring-3"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
            />
            <motion.div
              className="oracle-ring ring-4" // New ring for more depth
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 70, ease: 'linear', delay: 0.5 }}
            />
            <div className="oracle-core-glow" />
            <div className="oracle-eye-outer">
                <div className="oracle-eye-iris">
                    <div className="oracle-eye-pupil" />
                </div>
            </div>
            
            {/* Enhanced Data Points with more animation */}
            <div className="data-point point-1" />
            <div className="data-point point-2" />
            <div className="data-point point-3" />
            <div className="data-point point-4" />
            <div className="data-point point-5" />
            <div className="data-point point-6" />

          </motion.div>

          {/* ========== Logo and Title (Enhanced) ========== */}
          <motion.div className="oracle-title-container" variants={titleVariants}>
            <h1 className="oracle-title">Ultramax</h1>
            <h2 className="oracle-subtitle">- Oracle POS -</h2>
            <p className="oracle-tagline">The Seer of Sales, Empowering Your Business</p>
          </motion.div>
          
          {/* ========== Start Button (Enhanced) ========== */}
          <motion.button
            className="oracle-start-button"
            onClick={onStart}
            variants={buttonVariants}
            whileHover={{ 
                scale: 1.08, 
                boxShadow: '0 0 35px var(--oracle-cyan), 0 0 70px var(--mystic-violet)',
                textShadow: '0 0 10px rgba(255,255,255,0.8)' // Text glow on hover
            }}
            whileTap={{ scale: 0.95 }}
          >
            เริ่มต้นการทำงาน
          </motion.button>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OracleHomeScreen;
