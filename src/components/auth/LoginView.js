import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const tabButtonClasses = (isActive) =>
  `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
    isActive
      ? 'bg-blue-600 text-white shadow'
      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
  }`;

const inputClass =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400';

const LoginView = () => {
  const { signIn, signUp, authError, clearAuthError } = useAuth();
  const [mode, setMode] = useState('sign-in');
  const [formState, setFormState] = useState({
    email: '',
    password: '',
    fullName: '',
    organizationName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const isSignIn = useMemo(() => mode === 'sign-in', [mode]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleModeChange = (nextMode) => {
    if (mode === nextMode) {
      return;
    }

    clearAuthError();
    setStatusMessage('');
    setMode(nextMode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatusMessage('');
    clearAuthError();

    if (!formState.email || !formState.password) {
      setStatusMessage('Please provide both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignIn) {
        await signIn({
          email: formState.email,
          password: formState.password,
        });
      } else {
        const result = await signUp({
          email: formState.email,
          password: formState.password,
          fullName: formState.fullName,
          organizationName: formState.organizationName,
        });

        if (result.requiresConfirmation) {
          setStatusMessage('Check your inbox for a confirmation email to finish setting up your account.');
        } else if (!formState.organizationName) {
          setStatusMessage('Account created. Create or join an organization to get started.');
        }
      }
    } catch (error) {
      setStatusMessage(error.message || 'Unable to complete the request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">Vector</h1>
          <p className="text-sm text-slate-500">Capital Planning & Resource Management</p>
        </div>

        <div className="flex justify-center gap-3 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            className={tabButtonClasses(isSignIn)}
            onClick={() => handleModeChange('sign-in')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={tabButtonClasses(!isSignIn)}
            onClick={() => handleModeChange('sign-up')}
          >
            Create Account
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleInputChange}
              className={inputClass}
              autoComplete="email"
              required
            />
          </div>

          {!isSignIn && (
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formState.fullName}
                onChange={handleInputChange}
                className={inputClass}
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formState.password}
              onChange={handleInputChange}
              className={inputClass}
              autoComplete={isSignIn ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {!isSignIn && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="organizationName"
                  className="text-sm font-medium text-slate-700"
                >
                  Organization Name
                </label>
                <span className="text-xs text-slate-400">Optional</span>
              </div>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                value={formState.organizationName}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="e.g. City of Springfield"
              />
            </div>
          )}

          {(statusMessage || authError) && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {statusMessage || authError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full inline-flex justify-center items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-blue-300`}
          >
            {isSubmitting ? 'Please wait…' : isSignIn ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400">
          By continuing you agree to the Vector Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LoginView;
