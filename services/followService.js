const supabase = require('./supabaseClient');

async function getFollowing(username) {
  const { data, error } = await supabase
    .from('follows')
    .select('followed_username')
    .eq('follower_username', username)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((follow) => follow.followed_username);
}

async function followUser(followerUsername, followedUsername) {
  if (followerUsername === followedUsername) {
    return { status: 400, error: 'You cannot follow yourself' };
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('username')
    .eq('username', followedUsername)
    .maybeSingle();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return { status: 404, error: 'User not found' };
  }

  const { error } = await supabase
    .from('follows')
    .insert({
      follower_username: followerUsername,
      followed_username: followedUsername
    });

  if (error) {
    if (error.code === '23505') {
      return {};
    }

    throw error;
  }

  return {};
}

async function unfollowUser(followerUsername, followedUsername) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_username', followerUsername)
    .eq('followed_username', followedUsername);

  if (error) {
    throw error;
  }

  return {};
}

module.exports = {
  followUser,
  getFollowing,
  unfollowUser
};
