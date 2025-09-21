import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const mapMembership = (row) => {
  if (!row) {
    return null;
  }

  const organization = row.organization || row.organizations || null;
  const role = row.role || (row.can_edit ? 'editor' : 'viewer');
  const isSuperuser = role === 'superuser';

  return {
    id: row.id,
    role,
    isSuperuser,
    canEdit: isSuperuser || Boolean(row.can_edit),
    organizationId:
      row.organization_id === null || row.organization_id === undefined
        ? null
        : String(row.organization_id),
    organization,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [pendingJoinRequest, setPendingJoinRequest] = useState(null);
  const sessionRef = useRef(null);

  const refreshMemberships = useCallback(async () => {
    if (!supabase) {
      setMemberships([]);
      setActiveOrganizationId(null);
      setPendingJoinRequest(null);
      setAuthError(
        'Supabase client is not configured. Provide Supabase URL and anon key environment variables (see README for supported names).'
      );
      return [];
    }

    const currentSession = sessionRef.current;

    if (!currentSession?.user) {
      setMemberships([]);
      setActiveOrganizationId(null);
      setPendingJoinRequest(null);
      return [];
    }

    const { data, error } = await supabase
      .from('memberships')
      .select(
        'id, role, can_edit, organization_id, created_at, updated_at, organization:organizations(id, name, slug)'
      )
      .eq('user_id', currentSession.user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Unable to load memberships', error);
      setAuthError(error.message);
      return [];
    }

    const mapped = (data || [])
      .map((row) =>
        mapMembership({
          ...row,
          organization: row.organization,
        })
      )
      .filter(Boolean);

    let membershipList = mapped;
    const hasSuperuserMembership = mapped.some((membership) => membership.isSuperuser);

    if (hasSuperuserMembership) {
      const { data: allOrganizations, error: organizationsError } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at, updated_at, created_by')
        .order('name', { ascending: true });

      if (organizationsError) {
        console.error('Unable to load organizations for superuser', organizationsError);
        setAuthError(organizationsError.message);
      } else if (allOrganizations) {
        const membershipByOrgId = new Map(
          membershipList
            .filter((membership) => membership.organizationId !== null)
            .map((membership) => [membership.organizationId, membership])
        );

        membershipList = allOrganizations.map((organization) => {
          const orgId = String(organization.id);
          const existingMembership = membershipByOrgId.get(orgId);

          if (existingMembership) {
            return {
              ...existingMembership,
              organization: existingMembership.organization || organization,
            };
          }

          return {
            id: `superuser-${orgId}`,
            role: 'superuser',
            isSuperuser: true,
            canEdit: true,
            organizationId: orgId,
            organization,
            createdAt: organization.created_at || null,
            updatedAt: organization.updated_at || null,
            isSynthetic: true,
          };
        });
      }
    }

    let pendingRequestRecord = null;

    if (!membershipList.length) {
      const { data: pendingRequest, error: pendingRequestError } = await supabase
        .from('organization_join_requests')
        .select(
          'id, status, organization_id, created_at, updated_at, organization:organizations(id, name, slug)'
        )
        .eq('user_id', currentSession.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (pendingRequestError && pendingRequestError.code !== 'PGRST116') {
        console.error('Unable to load pending join requests', pendingRequestError);
      } else if (pendingRequest) {
        pendingRequestRecord = pendingRequest;
      }
    }

    setMemberships(membershipList);
    setPendingJoinRequest(pendingRequestRecord);

    if (!membershipList.length) {
      setActiveOrganizationId(null);
    } else if (!membershipList.some((item) => item.organizationId === activeOrganizationId)) {
      setActiveOrganizationId(membershipList[0].organizationId);
    }

    return membershipList;
  }, [activeOrganizationId]);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      if (!supabase) {
        setAuthLoading(false);
        setAuthError(
          'Supabase client is not configured. Verify Supabase URL and anon key environment variables are set (see README).'
        );
        return;
      }

      setAuthLoading(true);

      const {
        data: { session: initialSession },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      sessionRef.current = initialSession;
      setSession(initialSession);
      setAuthLoading(false);
    };

    setup();

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      sessionRef.current = nextSession;
      setSession(nextSession);
      refreshMemberships();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [refreshMemberships]);

  useEffect(() => {
    if (!session?.user || !supabase) {
      return;
    }

    refreshMemberships();
  }, [session, refreshMemberships]);

  const signIn = useCallback(
    async ({ email, password }) => {
      if (!supabase) {
        throw new Error(
          'Supabase client is not configured. Supply Supabase URL and anon key environment variables before signing in.'
        );
      }

      setAuthError(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      sessionRef.current = data.session;
      setSession(data.session);
      await refreshMemberships();
      return data;
    },
    [refreshMemberships]
  );

  const createOrganization = useCallback(
    async ({ name }) => {
      if (!supabase) {
        throw new Error('Supabase client is not configured.');
      }

      const currentSession = sessionRef.current;
      if (!currentSession?.user) {
        throw new Error('You must be signed in to create an organization.');
      }

      const baseSlug = slugify(name);
      const uniqueSuffix = Math.random().toString(36).slice(2, 7);
      const slug = baseSlug ? `${baseSlug}-${uniqueSuffix}` : uniqueSuffix;

      const { data: organization, error: organizationError } = await supabase
        .from('organizations')
        .insert({
          name,
          slug,
          created_by: currentSession.user.id,
        })
        .select()
        .single();

      if (organizationError) {
        throw organizationError;
      }

      const { error: membershipError } = await supabase.from('memberships').insert({
        organization_id: organization.id,
        user_id: currentSession.user.id,
        role: 'admin',
        can_edit: true,
      });

      if (membershipError) {
        throw membershipError;
      }

      const updatedMemberships = await refreshMemberships();
      if (organization?.id) {
        setActiveOrganizationId(String(organization.id));
      } else if (updatedMemberships?.length) {
        setActiveOrganizationId(updatedMemberships[0].organizationId);
      }

      return organization;
    },
    [refreshMemberships]
  );

  const requestOrganizationAffiliation = useCallback(
    async ({ organizationId }) => {
      if (!supabase) {
        throw new Error('Supabase client is not configured.');
      }

      const currentSession = sessionRef.current;

      if (!currentSession?.user) {
        throw new Error('You must be signed in to request organization access.');
      }

      if (!organizationId) {
        throw new Error('Select an organization before submitting a request.');
      }

      const normalizedOrganizationId = String(organizationId);

      const { error } = await supabase.from('organization_join_requests').insert({
        organization_id: normalizedOrganizationId,
      });

      if (error) {
        if (error.code === '23505') {
          throw new Error('An affiliation request for this organization is already pending.');
        }

        throw error;
      }

      await refreshMemberships();
    },
    [refreshMemberships]
  );

  const signUp = useCallback(
    async ({ email, password, fullName, organizationId }) => {
      if (!supabase) {
        throw new Error(
          'Supabase client is not configured. Supply Supabase URL and anon key environment variables before signing up.'
        );
      }

      setAuthError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        throw error;
      }

      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();

      sessionRef.current = nextSession;
      setSession(nextSession);

      if (organizationId && nextSession?.user) {
        try {
          await requestOrganizationAffiliation({ organizationId });
        } catch (requestError) {
          console.error('Organization affiliation request failed after sign up', requestError);
          setAuthError(requestError.message);
          throw requestError;
        }
      } else {
        await refreshMemberships();
      }

      return {
        ...data,
        requiresConfirmation: !data.session,
      };
    },
    [refreshMemberships, requestOrganizationAffiliation]
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    await supabase.auth.signOut();
    sessionRef.current = null;
    setSession(null);
    setMemberships([]);
    setActiveOrganizationId(null);
  }, []);

  const value = useMemo(() => {
    const activeMembership = memberships.find(
      (membership) => membership.organizationId === activeOrganizationId
    );
    const hasSuperuserAccess = memberships.some((membership) => membership.isSuperuser);

    return {
      authLoading,
      authError,
      session,
      user: session?.user || null,
      userMetadata: session?.user?.user_metadata || {},
      memberships,
      activeOrganizationId,
      activeOrganization: activeMembership?.organization || null,
      activeMembership: activeMembership || null,
      canEditActiveOrg: hasSuperuserAccess || Boolean(activeMembership?.canEdit),
      hasSuperuserAccess,
      pendingJoinRequest,
      hasPendingJoinRequest: Boolean(pendingJoinRequest),
      setActiveOrganizationId: (value) =>
        setActiveOrganizationId(
          value === null || value === undefined ? null : String(value)
        ),
      signIn,
      signUp,
      signOut,
      createOrganization,
      requestOrganizationAffiliation,
      refreshMemberships,
      clearAuthError: () => setAuthError(null),
    };
  }, [
    authError,
    authLoading,
    memberships,
    activeOrganizationId,
    session,
    signIn,
    signUp,
    signOut,
    createOrganization,
    pendingJoinRequest,
    requestOrganizationAffiliation,
    refreshMemberships,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
