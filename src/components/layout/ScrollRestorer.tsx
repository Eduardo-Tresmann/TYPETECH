'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Componente que garante que o scroll seja sempre habilitado
 * em páginas que não são a home, prevenindo bugs onde o scroll
 * fica bloqueado após navegação entre páginas.
 */
export default function ScrollRestorer() {
  const pathname = usePathname();
  const isHomePage = pathname === '/home';

  useEffect(() => {
    // Se não for a página home, garantir que o scroll esteja habilitado
    if (!isHomePage) {
      // Pequeno delay para garantir que outros useEffects já executaram
      const timeoutId = setTimeout(() => {
        // Remover classes que bloqueiam scroll
        document.body.classList.remove('home-page');
        document.documentElement.classList.remove('home-page');
        
        // Restaurar estilos inline que podem estar bloqueando o scroll
        // Apenas se não for a página home
        if (!document.body.classList.contains('home-page')) {
          // Limpar estilos inline que bloqueiam scroll
          const bodyStyles = ['overflow', 'position', 'height', 'width', 'top', 'left', 'right'];
          const htmlStyles = ['overflow', 'height'];
          
          bodyStyles.forEach(style => {
            if (document.body.style.getPropertyValue(style) && 
                (style === 'overflow' && document.body.style.overflow === 'hidden') ||
                (style === 'position' && document.body.style.position === 'fixed')) {
              document.body.style.removeProperty(style);
            }
          });
          
          htmlStyles.forEach(style => {
            if (document.documentElement.style.getPropertyValue(style) &&
                document.documentElement.style.overflow === 'hidden') {
              document.documentElement.style.removeProperty(style);
            }
          });
          
          // Garantir que o scroll funcione
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.height = '';
          document.body.style.width = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.documentElement.style.overflow = '';
          document.documentElement.style.height = '';
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [pathname, isHomePage]);

  // Monitorar mudanças no DOM para garantir que o scroll não seja bloqueado
  useEffect(() => {
    if (isHomePage) return;

    const observer = new MutationObserver(() => {
      // Verificar periodicamente se o scroll está bloqueado
      const bodyOverflow = window.getComputedStyle(document.body).overflow;
      const bodyPosition = window.getComputedStyle(document.body).position;
      const htmlOverflow = window.getComputedStyle(document.documentElement).overflow;
      
      // Se o scroll estiver bloqueado e não for a página home, restaurar
      if ((bodyOverflow === 'hidden' || bodyPosition === 'fixed') && 
          !document.body.classList.contains('home-page')) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.documentElement.style.overflow = '';
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: false,
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: false,
    });

    return () => {
      observer.disconnect();
    };
  }, [isHomePage]);

  return null;
}


