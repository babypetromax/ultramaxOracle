import React, { useState, useCallback, useContext, createContext, ReactNode } from 'react';
import ConfirmModal from '../components/modals/ConfirmModal';

export interface ConfirmationOptions {
    title: string;
    message: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
}

type ConfirmationContextType = (options: ConfirmationOptions) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

type ResolveFunction = (value: boolean) => void;

interface ConfirmationState {
    options: ConfirmationOptions;
    resolve: ResolveFunction;
}

export const ConfirmationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [confirmationState, setConfirmationState] = useState<ConfirmationState | null>(null);

    const showConfirmation = useCallback((options: ConfirmationOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setConfirmationState({ options, resolve });
        });
    }, []);

    const handleClose = () => {
        if (confirmationState) {
            confirmationState.resolve(false);
            setConfirmationState(null);
        }
    };

    const handleConfirm = () => {
        if (confirmationState) {
            confirmationState.resolve(true);
            setConfirmationState(null);
        }
    };

    return (
        <ConfirmationContext.Provider value={showConfirmation}>
            {children}
            {confirmationState && (
                <ConfirmModal
                    options={confirmationState.options}
                    onConfirm={handleConfirm}
                    onCancel={handleClose}
                />
            )}
        </ConfirmationContext.Provider>
    );
};

export const useConfirmation = (): ConfirmationContextType => {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
};