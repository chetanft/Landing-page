export default function TestComponent() {
  return (
    <div style={{ padding: 'var(--spacing-x5)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <h1>Basic Test Page Working!</h1>
      <p>If you can see this, React is working.</p>
      <p>Current URL: {window.location.href}</p>
    </div>
  )
}
