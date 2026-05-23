export async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export function getAuthErrorMessage(err, data, res) {
  if (err) {
    if (err.message === 'Failed to fetch') {
      return 'Cannot connect to the server. Ensure the EC2 backend is running, port 5000 is open, and redeploy Vercel after pulling the latest code.';
    }
    return err.message || String(err);
  }

  if (data?.code === 'USER_NOT_FOUND' || res?.status === 404) {
    return 'No account found with this email. Please create an account.';
  }
  if (data?.code === 'INVALID_PASSWORD') {
    return 'Incorrect password. Please try again.';
  }

  const msg = data?.error || data?.message || '';
  if (/buffering timed out|DB_UNAVAILABLE|ECONNREFUSED|MongoNetworkError/i.test(msg)) {
    return 'Cannot reach the database. Start the server with a valid MONGO_URI and whitelist your IP in MongoDB Atlas.';
  }
  if (data?.code === 'DB_UNAVAILABLE') {
    return 'Database is offline. Check server logs and MongoDB Atlas connection.';
  }

  return msg || 'Something went wrong. Please try again.';
}
