import React from 'react';

interface LoadingSpinnerProps {
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ text }) => {
    return (
        <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            {text && <span className="text-gray-400 font-mono text-xs animate-pulse">{text}</span>}
        </div>
    );
};
