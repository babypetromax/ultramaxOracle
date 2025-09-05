import React, { useState, useEffect } from 'react';
import { fetchAndCacheImage } from '../lib/imageStore';
import { MenuItem } from '../types';

interface MenuCardImageProps {
    item: MenuItem;
}

// A generic placeholder image in case of errors or empty URLs
const placeholderImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop';

const MenuCardImage: React.FC<MenuCardImageProps> = ({ item }) => {
    const [imageSrc, setImageSrc] = useState<string>(''); // Start empty to show a loading state

    useEffect(() => {
        let isMounted = true;
        
        const loadImage = async () => {
            // --- OFFLINE-FIRST IMAGE LOADING LOGIC ---
            // 1. Prioritize the local offline image if it exists.
            if (item.offlineImage) {
                if (isMounted) setImageSrc(item.offlineImage);
                return; // Exit early, no network needed.
            }

            // 2. If no offline image, fall back to the online URL via cache.
            if (item.image) {
                const imageBlob = await fetchAndCacheImage(item.id, item.image);
                if (isMounted) {
                    if (imageBlob) {
                        setImageSrc(URL.createObjectURL(imageBlob));
                    } else {
                        setImageSrc(placeholderImage); // Fallback on any error
                    }
                }
                return;
            }
            
            // 3. If no images are available at all, use the placeholder.
            if (isMounted) setImageSrc(placeholderImage);
        };

        loadImage();

        return () => {
            isMounted = false;
            // Revoke the object URL to prevent memory leaks when the component unmounts
            if (imageSrc && imageSrc.startsWith('blob:')) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [item.id, item.image, item.offlineImage]); // Rerun effect if item ID, online image, or offline image changes

    // Show a simple loading indicator while the image is being fetched/retrieved
    if (!imageSrc) {
        // The loader now simply fills the parent .menu-card, which controls the aspect ratio.
        // This prevents any layout shift when the image loads.
        return <div className="menu-card-image-loader" />;
    }

    return (
        <img 
            src={imageSrc} 
            alt={item.name}
            // No more onError or loading="lazy" needed here; our component handles it all.
        />
    );
};

export default MenuCardImage;