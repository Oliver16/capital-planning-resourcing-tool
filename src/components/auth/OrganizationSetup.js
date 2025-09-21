import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';

const OrganizationSetup = () => {
  const { createOrganization, signOut, user } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!organizationName.trim()) {
      setMessage('Please provide an organization name.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createOrganization({ name: organizationName });
      setMessage('Organization created successfully.');
    } catch (error) {
      setMessage(error.message || 'Unable to create the organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-semibold text-slate-900">Create Your Organization</h2>
          <p className="text-sm text-slate-500">
            Welcome {user?.email}. You are not a member of any organization yet. Create one now or
            wait for an invitation from an administrator.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="organizationName" className="text-sm font-medium text-slate-700">
              Organization Name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
              className={inputClass}
              placeholder="e.g. City of Springfield"
              required
            />
          </div>

          {message && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? 'Creating…' : 'Create Organization'}
          </button>
        </form>

        <div className="space-y-2 text-sm text-slate-500">
          <p>
            Already invited to an organization? Keep this tab open and check your email for an
            invitation link. Once accepted you will see it listed automatically.
          </p>
          <p>
            Need to switch accounts?{' '}
            <button
              type="button"
              className="text-blue-600 font-medium hover:underline"
              onClick={signOut}
            >
              Sign out
            </button>{' '}
            and sign back in with a different email.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrganizationSetup;
