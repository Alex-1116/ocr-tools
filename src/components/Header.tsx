import React from 'react';

interface HeaderProps {
  title: string;
  subtitle: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <header className="text-center mb-8">
      <h1 className="text-3xl font-bold text-primary mb-2">{title}</h1>
      <p className="text-text-muted">{subtitle}</p>
    </header>
  );
};
