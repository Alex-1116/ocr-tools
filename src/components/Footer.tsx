import React from 'react';

interface FooterProps {
  text: string;
}

export const Footer: React.FC<FooterProps> = ({ text }) => {
  return (
    <footer className="mt-8 text-center text-text-muted text-sm">
      <p>{text}</p>
    </footer>
  );
};
