import { useEffect } from 'react';
// FIX: Corrected import path to the new store index file.
import { useStore } from '../contexts/store/index';
import { traceAction, traceEnvironment } from '../lib/sentinelLogger';
import { runMigration } from '../lib/migration';

/**
 * [ARCHANGEL PROTOCOL]
 * This hook encapsulates all application startup logic,
 * separating it from the main App component. It runs only once on mount.
 */
export const useAppInitializer = () => {
  const initializeData = useStore(state => state.initializeData);
  const fetchAllOrderHistory = useStore((state) => state.reports.fetchAllOrderHistory);

  useEffect(() => {
    const initApp = async () => {
        // Run migrations first to ensure DB schema is up to date
        await runMigration();
        // Initialize core data like settings, shifts, favorites, etc.
        initializeData();
        // Log environment details for diagnostics
        traceEnvironment();
        
        // This is the former "Master Trigger", now safely isolated and corrected.
        traceAction({ slice: 'app-lifecycle', actionName: 'Master Trigger Fired by useAppInitializer' });
        // THE DEFINITIVE FIX for the Infinite Loop.
        fetchAllOrderHistory();
    };
    
    initApp();
  }, []); // <-- CRITICAL FIX: The dependency array is empty, ensuring this effect runs ONLY ONCE.
};