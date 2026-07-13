import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { InMemoryUserStore } from '../auth/inMemoryUserStore.js';

function appWithStore() {
  const store = new InMemoryUserStore();
  return { app: createApp(store), store };
}

describe('phase 1 auth flow', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('lets the first user register as owner and blocks a second self-registration', async () => {
    const { app } = appWithStore();

    const owner = await request(app).post('/api/auth/register-owner').send({
      email: 'Owner@BuildCo.test',
      name: 'BuildCo Owner',
      password: 'ChangeMe123!'
    });

    expect(owner.status).toBe(201);
    expect(owner.body.user.role).toBe('owner');
    expect(owner.body.accessToken).toEqual(expect.any(String));

    const second = await request(app).post('/api/auth/register-owner').send({
      email: 'manager@buildco.test',
      name: 'Site Manager',
      password: 'ChangeMe123!'
    });

    expect(second.status).toBe(403);
  });

  it('allows an owner to invite a manager who can then log in', async () => {
    const { app } = appWithStore();

    const owner = await request(app).post('/api/auth/register-owner').send({
      email: 'owner@buildco.test',
      name: 'BuildCo Owner',
      password: 'ChangeMe123!'
    });

    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({
        email: 'manager@buildco.test',
        name: 'Site Manager',
        role: 'manager'
      });

    expect(invite.status).toBe(201);
    expect(invite.body.inviteToken).toEqual(expect.any(String));

    const accepted = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Manager123!'
    });

    expect(accepted.status).toBe(201);
    expect(accepted.body.user.role).toBe('manager');

    const login = await request(app).post('/api/auth/login').send({
      email: 'manager@buildco.test',
      password: 'Manager123!'
    });

    expect(login.status).toBe(200);
    expect(login.body.user.name).toBe('Site Manager');
  });

  it('blocks managers from inviting users', async () => {
    const { app } = appWithStore();

    const owner = await request(app).post('/api/auth/register-owner').send({
      email: 'owner@buildco.test',
      name: 'BuildCo Owner',
      password: 'ChangeMe123!'
    });

    const invite = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send({
        email: 'manager@buildco.test',
        name: 'Site Manager',
        role: 'manager'
      });

    const manager = await request(app).post('/api/auth/accept-invite').send({
      token: invite.body.inviteToken,
      password: 'Manager123!'
    });

    const blocked = await request(app)
      .post('/api/auth/invite')
      .set('Authorization', `Bearer ${manager.body.accessToken}`)
      .send({
        email: 'employee@buildco.test',
        name: 'Crew Employee',
        role: 'employee'
      });

    expect(blocked.status).toBe(403);
  });

  it('refreshes a session cookie and invalidates it on logout', async () => {
    const { app } = appWithStore();

    const owner = await request(app).post('/api/auth/register-owner').send({
      email: 'owner@buildco.test',
      name: 'BuildCo Owner',
      password: 'ChangeMe123!'
    });
    const refreshCookie = owner.headers['set-cookie'][0].split(';')[0];

    const refreshed = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie).send();
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${owner.body.accessToken}`)
      .send();
    expect(logout.status).toBe(204);

    const staleRefresh = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie).send();
    expect(staleRefresh.status).toBe(401);
  });
});
