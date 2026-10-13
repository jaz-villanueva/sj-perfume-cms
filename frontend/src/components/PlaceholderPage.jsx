// Temporary page shown until a module replaces it with the real screen.
export default function PlaceholderPage({ title, module, requirements }) {
  return (
    <section>
      <h1>{title}</h1>
      <p>Not implemented yet.</p>
      <dl className="placeholder-meta">
        <dt>Module</dt>
        <dd>{module}</dd>
        <dt>Requirements</dt>
        <dd>{requirements.join(', ')}</dd>
      </dl>
    </section>
  )
}
