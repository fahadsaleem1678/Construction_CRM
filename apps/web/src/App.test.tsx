import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useSessionStore } from './lib/sessionStore';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>redirect:{to}</div>,
    Outlet: () => <div>protected content</div>
  };
});

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', () => {
    useSessionStore.setState({ user: null, loading: false });
    render(<ProtectedRoute />);
    expect(screen.getByText('redirect:/login')).toBeInTheDocument();
  });

  it('renders protected content for signed-in users', () => {
    useSessionStore.setState({
      loading: false,
      user: {
        id: 'user-1',
        email: 'owner@buildco.test',
        name: 'Owner',
        role: 'owner',
        isActive: true
      }
    });
    render(
      <MemoryRouter>
        <ProtectedRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
