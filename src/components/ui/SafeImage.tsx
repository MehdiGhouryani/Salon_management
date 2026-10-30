import React, { useEffect, useState } from 'react';

export interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
}

/** An image that degrades to a quiet neutral block instead of a broken-image icon. */
export const SafeImage: React.FC<SafeImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) {
    return <div className={`bg-[var(--bg-elevated)] ${className}`} role="img" aria-label={alt} />;
  }
  return (
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(true)} />
  );
};
