import React from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginView from './LoginView';
import OrganizationSetup from './OrganizationSetup';

const AuthGate = ({ children }) => {
  const {
    authLoading,
    session,
    memberships,
    activeOrganizationId,
    setActiveOrganizationId,
    activeOrganization,
    canEditActiveOrg,
    user,
    signOut,
  } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  if (!memberships.length || !activeOrganizationId) {
    return <OrganizationSetup />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Vector</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Capital Planning</p>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4 flex-wrap">
            <div className="flex flex-col text-left min-w-[200px]">
              <label
                htmlFor="organization-selector"
                className="text-xs font-semibold uppercase text-slate-400 tracking-wide"
              >
                Organization
              </label>
              <select
                id="organization-selector"
                className="mt-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={activeOrganizationId ?? ''}
                onChange={(event) => setActiveOrganizationId(event.target.value)}
              >
                {memberships.map((membership) => (
                  <option key={membership.id} value={membership.organizationId}>
                    {membership.organization?.name || 'Untitled Organization'}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{user?.email}</p>
              <p className="text-xs text-slate-400">
                {canEditActiveOrg ? 'Editor access' : 'Viewer access'}
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {!canEditActiveOrg && (
        <div className="bg-amber-50 border-b border-amber-200 py-2 text-center text-sm text-amber-800">
          You currently have view-only access to {activeOrganization?.name || 'this organization'}.
          Contact an administrator for edit permissions.
        </div>
      )}

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};

export default AuthGate;
