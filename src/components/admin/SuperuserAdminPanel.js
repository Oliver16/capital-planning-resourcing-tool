import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, RefreshCcw, Trash2, X, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const roleOptions = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
  { value: 'superuser', label: 'Superuser' },
];

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const SuperuserAdminPanel = ({ onClose }) => {
  const { refreshMemberships } = useAuth();
  const isMountedRef = useRef(true);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [organizationsLoading, setOrganizationsLoading] = useState(true);
  const [organizationsError, setOrganizationsError] = useState('');
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState('');
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [organizationForm, setOrganizationForm] = useState({ name: '' });
  const [addMemberForm, setAddMemberForm] = useState({
    email: '',
    role: 'viewer',
  });
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [isUpdatingOrg, setIsUpdatingOrg] = useState(false);
  const [isDeletingOrg, setIsDeletingOrg] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [membershipActionId, setMembershipActionId] = useState(null);
  const [requestActionId, setRequestActionId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  const showFeedback = useCallback((type, message) => {
    setFeedback({ type, message });
  }, []);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  const loadOrganizations = useCallback(async () => {
    if (!supabase) {
      if (isMountedRef.current) {
        setOrganizationsError('Supabase client is not configured.');
        setOrganizations([]);
        setOrganizationsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setOrganizationsLoading(true);
      setOrganizationsError('');
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at, updated_at')
      .order('name', { ascending: true });

    if (!isMountedRef.current) {
      return;
    }

    if (error) {
      setOrganizations([]);
      setOrganizationsError(error.message || 'Unable to load organizations.');
    } else {
      const list = data || [];
      setOrganizations(list);
      setSelectedOrgId((previous) => {
        if (previous && list.some((organization) => organization.id === previous)) {
          return previous;
        }
        return list.length ? list[0].id : null;
      });
    }

    setOrganizationsLoading(false);
  }, []);

  const loadMembers = useCallback(async (organizationId) => {
    if (!supabase || !organizationId) {
      if (isMountedRef.current) {
        setMembers([]);
        setMembersError('');
      }
      return;
    }

    if (isMountedRef.current) {
      setMembersLoading(true);
      setMembersError('');
    }

    const { data, error } = await supabase.rpc('superuser_list_memberships', {
      org_id: organizationId,
    });

    if (!isMountedRef.current) {
      return;
    }

    if (error) {
      setMembers([]);
      setMembersError(error.message || 'Unable to load members.');
    } else {
      setMembers(data || []);
    }

    setMembersLoading(false);
  }, []);

  const loadJoinRequests = useCallback(async () => {
    if (!supabase) {
      if (isMountedRef.current) {
        setJoinRequests([]);
        setJoinRequestsError('Supabase client is not configured.');
        setJoinRequestsLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setJoinRequestsLoading(true);
      setJoinRequestsError('');
    }

    const { data, error } = await supabase.rpc('superuser_list_join_requests', {
      org_id: null,
      only_pending: false,
    });

    if (!isMountedRef.current) {
      return;
    }

    if (error) {
      setJoinRequests([]);
      setJoinRequestsError(error.message || 'Unable to load join requests.');
    } else {
      setJoinRequests(data || []);
    }

    setJoinRequestsLoading(false);
  }, []);

  useEffect(() => {
    loadOrganizations();
    loadJoinRequests();
  }, [loadJoinRequests, loadOrganizations]);

  useEffect(() => {
    loadMembers(selectedOrgId);
  }, [loadMembers, selectedOrgId]);

  useEffect(() => {
    const selectedOrganization = organizations.find((org) => org.id === selectedOrgId) || null;
    setOrganizationForm({ name: selectedOrganization?.name || '' });
  }, [organizations, selectedOrgId]);

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedOrgId) || null,
    [organizations, selectedOrgId]
  );

  const filteredJoinRequests = useMemo(() => {
    if (!selectedOrgId) {
      return joinRequests;
    }

    return joinRequests.filter((request) => request.organization_id === selectedOrgId);
  }, [joinRequests, selectedOrgId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    clearFeedback();

    try {
      await Promise.all([loadOrganizations(), loadJoinRequests()]);
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [clearFeedback, loadJoinRequests, loadOrganizations]);

  const handleCreateOrganization = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!newOrganizationName.trim()) {
      showFeedback('error', 'Provide an organization name before creating it.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    setIsCreatingOrg(true);

    try {
      const baseSlug = slugify(newOrganizationName);
      const uniqueSuffix = Math.random().toString(36).slice(2, 7);
      const slug = baseSlug ? `${baseSlug}-${uniqueSuffix}` : uniqueSuffix;

      const { data: insertedOrganization, error } = await supabase
        .from('organizations')
        .insert({
          name: newOrganizationName,
          slug,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      showFeedback('success', `Organization "${insertedOrganization?.name || newOrganizationName}" created.`);
      setNewOrganizationName('');
      await Promise.all([loadOrganizations(), refreshMemberships()]);
    } catch (error) {
      console.error('Unable to create organization', error);
      showFeedback('error', error.message || 'Unable to create the organization.');
    } finally {
      if (isMountedRef.current) {
        setIsCreatingOrg(false);
      }
    }
  };

  const handleUpdateOrganization = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!selectedOrgId) {
      showFeedback('error', 'Select an organization first.');
      return;
    }

    if (!organizationForm.name.trim()) {
      showFeedback('error', 'Provide a name for the organization.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    setIsUpdatingOrg(true);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: organizationForm.name })
        .eq('id', selectedOrgId);

      if (error) {
        throw error;
      }

      showFeedback('success', 'Organization details updated.');
      await loadOrganizations();
    } catch (error) {
      console.error('Unable to update organization', error);
      showFeedback('error', error.message || 'Unable to update the organization.');
    } finally {
      if (isMountedRef.current) {
        setIsUpdatingOrg(false);
      }
    }
  };

  const handleDeleteOrganization = async () => {
    clearFeedback();

    if (!selectedOrgId) {
      showFeedback('error', 'Select an organization to delete.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    const confirmDelete = window.confirm(
      'Deleting an organization will remove all associated data. This action cannot be undone. Continue?'
    );

    if (!confirmDelete) {
      return;
    }

    setIsDeletingOrg(true);

    try {
      const { error } = await supabase.from('organizations').delete().eq('id', selectedOrgId);

      if (error) {
        throw error;
      }

      showFeedback('success', 'Organization deleted.');
      setSelectedOrgId(null);
      await Promise.all([loadOrganizations(), refreshMemberships()]);
    } catch (error) {
      console.error('Unable to delete organization', error);
      showFeedback('error', error.message || 'Unable to delete the organization.');
    } finally {
      if (isMountedRef.current) {
        setIsDeletingOrg(false);
      }
    }
  };

  const handleAddMember = async (event) => {
    event.preventDefault();
    clearFeedback();

    if (!selectedOrgId) {
      showFeedback('error', 'Select an organization before adding members.');
      return;
    }

    if (!addMemberForm.email.trim()) {
      showFeedback('error', 'Provide an email address.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    setIsAddingMember(true);

    try {
      const makeEditor =
        addMemberForm.role === 'editor' ||
        addMemberForm.role === 'admin' ||
        addMemberForm.role === 'superuser';

      const { error } = await supabase.rpc('superuser_add_user_to_organization', {
        target_email: addMemberForm.email,
        org_id: selectedOrgId,
        member_role: addMemberForm.role,
        make_editor: makeEditor,
      });

      if (error) {
        throw error;
      }

      showFeedback('success', 'Member access updated.');
      setAddMemberForm({ email: '', role: 'viewer' });
      await Promise.all([loadMembers(selectedOrgId), refreshMemberships()]);
    } catch (error) {
      console.error('Unable to add member', error);
      showFeedback('error', error.message || 'Unable to update member access.');
    } finally {
      if (isMountedRef.current) {
        setIsAddingMember(false);
      }
    }
  };

  const handleRemoveMember = async (membershipId) => {
    clearFeedback();

    if (!membershipId) {
      showFeedback('error', 'Select a valid member to remove.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    setMembershipActionId(membershipId);

    try {
      const { error } = await supabase.from('memberships').delete().eq('id', membershipId);

      if (error) {
        throw error;
      }

      showFeedback('success', 'Member removed from organization.');
      await Promise.all([loadMembers(selectedOrgId), refreshMemberships()]);
    } catch (error) {
      console.error('Unable to remove member', error);
      showFeedback('error', error.message || 'Unable to remove member from organization.');
    } finally {
      if (isMountedRef.current) {
        setMembershipActionId(null);
      }
    }
  };

  const handleApproveRequest = async (requestId) => {
    clearFeedback();

    if (!requestId) {
      showFeedback('error', 'Select a valid request to approve.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    setRequestActionId(`approve-${requestId}`);

    try {
      const { error } = await supabase.rpc('superuser_approve_join_request', {
        request_id: requestId,
        member_role: 'viewer',
        make_editor: false,
      });

      if (error) {
        throw error;
      }

      showFeedback('success', 'Join request approved.');
      await Promise.all([loadJoinRequests(), loadMembers(selectedOrgId), refreshMemberships()]);
    } catch (error) {
      console.error('Unable to approve join request', error);
      showFeedback('error', error.message || 'Unable to approve the join request.');
    } finally {
      if (isMountedRef.current) {
        setRequestActionId(null);
      }
    }
  };

  const handleRejectRequest = async (requestId) => {
    clearFeedback();

    if (!requestId) {
      showFeedback('error', 'Select a valid request to reject.');
      return;
    }

    if (!supabase) {
      showFeedback('error', 'Supabase client is not configured.');
      return;
    }

    setRequestActionId(`reject-${requestId}`);

    try {
      const { error } = await supabase.rpc('superuser_reject_join_request', {
        request_id: requestId,
        rejection_note: null,
      });

      if (error) {
        throw error;
      }

      showFeedback('success', 'Join request rejected.');
      await loadJoinRequests();
    } catch (error) {
      console.error('Unable to reject join request', error);
      showFeedback('error', error.message || 'Unable to reject the join request.');
    } finally {
      if (isMountedRef.current) {
        setRequestActionId(null);
      }
    }
  };

  if (!supabase) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
        <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Administration unavailable</h2>
              <p className="mt-1 text-sm text-slate-600">
                Supabase is not configured. Provide Supabase credentials to manage organizations.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="relative flex w-full max-w-6xl flex-col gap-6 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Superuser administration</h2>
            <p className="text-sm text-slate-500">
              Manage organizations, membership access, and affiliation requests.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || organizationsLoading || joinRequestsLoading}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}
          >
            {feedback.message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Organizations
              </h3>
              {organizationsLoading && <span className="text-xs text-slate-400">Loading…</span>}
            </div>

            {organizationsError && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {organizationsError}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white">
              {organizations.length ? (
                <ul className="divide-y divide-slate-200">
                  {organizations.map((organization) => (
                    <li key={organization.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedOrgId(organization.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                          organization.id === selectedOrgId
                            ? 'bg-blue-50 font-medium text-blue-700'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span>{organization.name || 'Untitled organization'}</span>
                        {organization.id === selectedOrgId && <Check className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p-3 text-sm text-slate-500">No organizations found.</p>
              )}
            </div>

            <form className="space-y-3" onSubmit={handleCreateOrganization}>
              <div className="space-y-1">
                <label htmlFor="newOrganizationName" className="text-xs font-semibold uppercase text-slate-500">
                  Create new organization
                </label>
                <input
                  id="newOrganizationName"
                  name="newOrganizationName"
                  type="text"
                  value={newOrganizationName}
                  onChange={(event) => setNewOrganizationName(event.target.value)}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Organization name"
                />
              </div>
              <button
                type="submit"
                disabled={isCreatingOrg || !newOrganizationName.trim()}
                className="w-full inline-flex justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isCreatingOrg ? 'Creating…' : 'Create organization'}
              </button>
            </form>

            {selectedOrganization && (
              <form className="space-y-3" onSubmit={handleUpdateOrganization}>
                <div className="space-y-1">
                  <label htmlFor="organizationName" className="text-xs font-semibold uppercase text-slate-500">
                    Rename organization
                  </label>
                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    value={organizationForm.name}
                    onChange={(event) =>
                      setOrganizationForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="Organization name"
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isUpdatingOrg || !organizationForm.name.trim()}
                    className="inline-flex flex-1 justify-center rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isUpdatingOrg ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteOrganization}
                    disabled={isDeletingOrg}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Trash2 className="h-4 w-4" /> {isDeletingOrg ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="lg:col-span-2 space-y-6">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Members</h3>
                {membersLoading && <span className="text-xs text-slate-400">Loading…</span>}
              </div>

              {membersError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {membersError}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Email</th>
                      <th className="px-3 py-2 text-left font-semibold">Name</th>
                      <th className="px-3 py-2 text-left font-semibold">Role</th>
                      <th className="px-3 py-2 text-left font-semibold">Can edit</th>
                      <th className="px-3 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.length ? (
                      members.map((member) => (
                        <tr key={member.membership_id}>
                          <td className="px-3 py-2 text-slate-700">{member.email}</td>
                          <td className="px-3 py-2 text-slate-500">{member.full_name || '—'}</td>
                          <td className="px-3 py-2 text-slate-700 capitalize">{member.role}</td>
                          <td className="px-3 py-2 text-slate-700">{member.can_edit ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.membership_id)}
                              disabled={membershipActionId === member.membership_id}
                              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              {membershipActionId === member.membership_id ? 'Removing…' : 'Remove'}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">
                          No members found for this organization.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <form className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3" onSubmit={handleAddMember}>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Add or update member access
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="memberEmail" className="text-xs font-medium text-slate-500">
                      User email
                    </label>
                    <input
                      id="memberEmail"
                      name="memberEmail"
                      type="email"
                      value={addMemberForm.email}
                      onChange={(event) =>
                        setAddMemberForm((previous) => ({
                          ...previous,
                          email: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="memberRole" className="text-xs font-medium text-slate-500">
                      Role
                    </label>
                    <select
                      id="memberRole"
                      name="memberRole"
                      value={addMemberForm.role}
                      onChange={(event) =>
                        setAddMemberForm((previous) => ({
                          ...previous,
                          role: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Editing permissions are granted automatically to editors, admins, and superusers.
                </p>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isAddingMember ? 'Saving…' : 'Save member access'}
                </button>
              </form>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Join requests
                </h3>
                {joinRequestsLoading && <span className="text-xs text-slate-400">Loading…</span>}
              </div>

              {joinRequestsError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {joinRequestsError}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Requester</th>
                      <th className="px-3 py-2 text-left font-semibold">Organization</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      <th className="px-3 py-2 text-left font-semibold">Submitted</th>
                      <th className="px-3 py-2 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJoinRequests.length ? (
                      filteredJoinRequests.map((request) => (
                        <tr key={request.request_id}>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">{request.email}</span>
                              <span className="text-xs text-slate-400">{request.full_name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{request.organization_name}</td>
                          <td className="px-3 py-2 text-slate-700 capitalize">{request.status}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {request.created_at ? new Date(request.created_at).toLocaleString() : '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {request.status === 'pending' ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleApproveRequest(request.request_id)}
                                  disabled={requestActionId === `approve-${request.request_id}`}
                                  className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Check className="h-4 w-4" />
                                  {requestActionId === `approve-${request.request_id}` ? 'Approving…' : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(request.request_id)}
                                  disabled={requestActionId === `reject-${request.request_id}`}
                                  className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" />
                                  {requestActionId === `reject-${request.request_id}` ? 'Rejecting…' : 'Reject'}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Reviewed</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center text-sm text-slate-500">
                          {selectedOrgId
                            ? 'No join requests for this organization.'
                            : 'No join requests found.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SuperuserAdminPanel;
