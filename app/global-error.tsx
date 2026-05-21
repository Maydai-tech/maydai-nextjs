'use client'

/**
 * Error Boundary global Next.js — affiche toute erreur client/root non catchée.
 * Doit définir ses propres balises <html> et <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#7f1d1d',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '720px', width: '100%' }}>
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#fecaca',
            }}
          >
            Erreur client — hydratation / runtime
          </p>

          <h1 style={{ margin: '0 0 16px', fontSize: '28px', lineHeight: 1.2 }}>
            L&apos;application a planté côté navigateur
          </h1>

          <div
            style={{
              backgroundColor: '#450a0a',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              wordBreak: 'break-word',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#fecaca' }}>
              error.message
            </p>
            <pre
              style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontSize: '15px',
                lineHeight: 1.5,
                color: '#fff',
              }}
            >
              {error.message || 'Erreur sans message'}
            </pre>
            {error.digest ? (
              <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#fca5a5' }}>
                digest: {error.digest}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => reset()}
            style={{
              backgroundColor: '#fff',
              color: '#7f1d1d',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  )
}
