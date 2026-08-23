import React from 'react';

const Skeleton = ({ className = '', variant = 'rectangular', animation = 'pulse' }) => {
    const baseClasses = 'bg-slate-200';
    
    // Determine shape
    const shapeClasses = {
        rectangular: 'rounded-xl',
        circular: 'rounded-full',
        text: 'rounded-md',
    }[variant] || 'rounded-xl';

    // Determine animation
    const animationClasses = {
        pulse: 'animate-pulse',
        shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        none: '',
    }[animation] || 'animate-pulse';

    return (
        <div className={`${baseClasses} ${shapeClasses} ${animationClasses} ${className}`} />
    );
};

export default Skeleton;
