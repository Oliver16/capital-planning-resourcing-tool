import React from 'react';
import { useAuth } from '../../context/AuthContext';
import LoginView from './LoginView';
import OrganizationSetup from './OrganizationSetup';

const AuthGate = ({ children }) => {
  const {
    authLoading,
    session,
    memberships = [],
    activeOrganizationId,
    setActiveOrganizationId,
    activeOrganization,
    activeMembership,
    canEditActiveOrg,
    user,
    signOut,
  } = useAuth();

  const organizationLabel =
    activeOrganization?.name || 'Select an organization';
  const roleDescription = activeMembership?.isSuperuser
    ? 'Superuser access'
    : canEditActiveOrg
    ? 'Editor access'
    : 'Viewer access';

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
      <header className="bg-slate-100">
        <div className="mx-auto w-full max-w-7xl px-6 py-4">
          <div className="bg-white rounded-lg shadow-sm px-4 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`${process.env.PUBLIC_URL}/logo.png`}
                  alt="Vector logo"
                  className="h-12 w-auto"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Vector</p>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Capital &amp; Resource Planning
                  </p>
                </div>
              </div>
              <div className="text-center xl:flex-1">
                <h1 className="text-lg font-semibold text-gray-900">
                  {organizationLabel}
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:flex-wrap text-sm">
                <div className="flex flex-col min-w-[200px]">
                  <label
                    htmlFor="app-organization-selector"
                    className="text-xs font-semibold uppercase text-gray-400 tracking-wide"
                  >
                    Organization
                  </label>
                  <select
                    id="app-organization-selector"
                    className="mt-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
                    value={activeOrganizationId ?? ''}
                    onChange={(event) => setActiveOrganizationId(event.target.value)}
                    disabled={!memberships.length}
                  >
                    {memberships.length ? (
                      memberships.map((membership) => (
                        <option
                          key={membership.id}
                          value={membership.organizationId ?? ''}
                        >
                          {membership.organization?.name || 'Untitled Organization'}
                        </option>
                      ))
                    ) : (
                      <option value="">No organizations available</option>
                    )}
                  </select>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email || 'Signed in'}
                  </p>
                  <p className="text-xs text-gray-500">{roleDescription}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </div>
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
