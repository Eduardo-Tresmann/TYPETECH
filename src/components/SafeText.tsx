/**
 * Componente seguro para renderizar texto do usuário
 * Protege contra XSS escapando HTML automaticamente
 */

import React from 'react';
import { escapeHtml } from '@/utils/validation';

interface SafeTextProps {
  children: string;
  className?: string;
  preserveWhitespace?: boolean;
}

/**
 * Componente que renderiza texto de forma segura
 * Escapa HTML automaticamente para prevenir XSS
 */
export const SafeText: React.FC<SafeTextProps> = ({
  children,
  className = '',
  preserveWhitespace = false,
}) => {
  if (!children || typeof children !== 'string') {
    return null;
  }

  const escaped = escapeHtml(children);
  const style = preserveWhitespace ? { whiteSpace: 'pre-wrap' as const } : {};

  return (
    <span className={className} style={style}>
      {escaped}
    </span>
  );
};

export default SafeText;

