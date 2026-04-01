import { supabase } from '../lib/supabase';

export const fetchActiveSeatRequest = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('seat_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'OPEN')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // If no rows, single() returns an error PGRST116, which we can ignore and just return null
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data: error && error.code === 'PGRST116' ? null : data, error: null };
  } catch (error) {
    console.error("Error fetching active seat request:", error);
    return { data: null, error };
  }
};

export const fetchUserActivity = async () => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Step 1: Get all request IDs for this user
    const { data: requests, error: reqError } = await supabase
      .from('seat_requests')
      .select('id')
      .eq('user_id', user.id);

    if (reqError) throw reqError;
    if (!requests || requests.length === 0) return { data: [], error: null };

    const requestIds = requests.map(r => r.id).join(',');

    // Step 2: Query matches involving these requests
    const { data: matches, error: matchError } = await supabase
      .from('seat_matches')
      .select(`
        *,
        request_a:seat_requests!seat_matches_request_a_id_fkey(*),
        request_b:seat_requests!seat_matches_request_b_id_fkey(*)
      `)
      .or(`request_a_id.in.(${requestIds}),request_b_id.in.(${requestIds})`)
      .order('created_at', { ascending: false });

    if (matchError) throw matchError;

    // Transform data dynamically finding which side of the match the user was on
    const activityLogs = (matches || []).map(match => {
      const isRequestA = requests.some(r => r.id === match.request_a_id);
      const myRequest = isRequestA ? match.request_a : match.request_b;
      const targetRequest = isRequestA ? match.request_b : match.request_a;

      return {
        id: match.id,
        status: match.status,
        created_at: match.created_at,
        my_coach: myRequest?.coach || 'Unknown',
        my_seat: myRequest?.seat_no || 'Unknown',
        from_berth: myRequest?.berth_type || 'Unknown',
        to_berth: myRequest?.preference || targetRequest?.berth_type || 'Unknown',
      };
    });

    return { data: activityLogs, error: null };
  } catch (error) {
    console.error("Error fetching user activity:", error);
    return { data: [], error };
  }
};
