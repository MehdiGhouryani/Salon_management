import React, { useEffect, useState } from 'react';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
};

/**
 * A person is a photo when the photo loads and their initials when it does not. Remote
 * photographs fail (blocked, offline, expired), and a broken-image icon is never acceptable.
 */
export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 32, className = '' }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-semibold overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
};
