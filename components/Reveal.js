'use client';

import { useEffect, useRef, useState } from 'react';

export default function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className = '',
  threshold = 0.15,
  once = true,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) io.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [threshold, once]);

  return (
    <Tag
      ref={ref}
      className={`nc-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}
