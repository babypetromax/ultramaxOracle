import { useState, useEffect } from 'react';

// กำหนด Breakpoint สำหรับมือถือ
const MOBILE_BREAKPOINT = 768; // (md in Tailwind CSS)

interface ScreenSize {
    isMobile: boolean;
    isDesktop: boolean;
}

export const useScreenSize = (): ScreenSize => {
    const [screenSize, setScreenSize] = useState<ScreenSize>({
        isMobile: window.innerWidth < MOBILE_BREAKPOINT,
        isDesktop: window.innerWidth >= MOBILE_BREAKPOINT,
    });

    useEffect(() => {
        const handleResize = () => {
            const isMobileView = window.innerWidth < MOBILE_BREAKPOINT;
            setScreenSize({
                isMobile: isMobileView,
                isDesktop: !isMobileView,
            });
        };

        window.addEventListener('resize', handleResize);
        
        // Cleanup function to remove the event listener
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return screenSize;
};
