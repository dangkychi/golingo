import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page container" style={{ textAlign: 'center', paddingTop: '8rem' }}>
      <h1 style={{ fontSize: '6rem', fontWeight: 800, opacity: 0.2 }}>404</h1>
      <p style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Page not found</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
