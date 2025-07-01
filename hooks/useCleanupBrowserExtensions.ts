'use client';

import { useEffect } from 'react';

/**
 * Hook pour nettoyer les attributs ajoutés par les extensions navigateur
 * qui peuvent causer des erreurs d'hydratation React
 */
export function useCleanupBrowserExtensions() {
  useEffect(() => {
    // Liste des attributs connus ajoutés par des extensions
    const extensionAttributes = [
      'cz-shortcut-listen', // ColorZilla
      'data-gramm', // Grammarly
      'data-gramm_editor', // Grammarly
      'data-gr-ext-installed', // Grammarly
    ];

    // Nettoyer le body
    const body = document.body;
    if (body) {
      extensionAttributes.forEach(attr => {
        if (body.hasAttribute(attr)) {
          body.removeAttribute(attr);
        }
      });
    }

    // Observer pour nettoyer les futurs ajouts
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === body) {
          const attributeName = mutation.attributeName;
          if (attributeName && extensionAttributes.includes(attributeName)) {
            body.removeAttribute(attributeName);
          }
        }
      });
    });

    // Observer uniquement les changements d'attributs sur le body
    if (body) {
      observer.observe(body, {
        attributes: true,
        attributeFilter: extensionAttributes,
      });
    }

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);
}