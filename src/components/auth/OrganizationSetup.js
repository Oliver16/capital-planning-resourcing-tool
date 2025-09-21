import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

const OrganizationSetup = () => {
  const { pendingJoinRequest, signOut, user, hasPendingJoinRequest } = useAuth();

  const submittedAt = useMemo(() => {
    if (!pendingJoinRequest?.created_at) {
      return null;
    }

    try {
      return new Date(pendingJoinRequest.created_at).toLocaleString();
    } catch (error) {
      console.error('Unable to format pending join request timestamp', error);
      return null;
    }
  }, [pendingJoinRequest]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <div className="space-y-3 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Access Pending Approval</h2>
          <p className="text-sm text-slate-500">
            Welcome {user?.email}. You do not currently have access to an organization workspace.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 text-center font-medium">
            Organization affiliation request is under review.
          </div>

          {hasPendingJoinRequest && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 text-left space-y-1">
              <p>
                <span className="font-semibold">Organization:</span>{' '}
                {pendingJoinRequest?.organization?.name || 'Pending organization'}
              </p>
              {submittedAt && (
                <p>
                  <span className="font-semibold">Requested:</span> {submittedAt}
                </p>
              )}
              <p>
                An administrator will review your request shortly. You will gain access once it has been
                approved.
              </p>
            </div>
          )}

          {!hasPendingJoinRequest && (
            <p className="text-sm text-slate-600 text-center">
              No pending affiliation requests were found. Contact a platform administrator for help or
              confirm that your invitation link has not expired.
            </p>
          )}
        </div>

        <div className="space-y-2 text-sm text-slate-500 text-center">
          <p>
            Need to switch accounts?{' '}
            <button type="button" className="text-blue-600 font-medium hover:underline" onClick={signOut}>
              Sign out
            </button>{' '}
            and sign back in with a different email address.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
