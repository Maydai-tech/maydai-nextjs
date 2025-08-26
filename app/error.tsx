'use client'

export default function Error() {
  return (
    <div>
      <h2>Une erreur s'est produite</h2>
      <button onClick={() => window.location.reload()}>
        Réessayer
      </button>
    </div>
  )
}
