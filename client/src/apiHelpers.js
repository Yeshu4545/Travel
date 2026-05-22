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
      return 'Cannot connect to the server. Make sure the backend is running on EC2 and port 5000 is open.';
    }
    return err.message || String(err);
  }

  if (data?.code === 'USER_NOT_FOUND' || res?.status === 404) {
    return 'No account found with this email. Please create an account.';
  }
  if (data?.code === 'INVALID_PASSWORD') {
    return 'Incorrect password. Please try again.';
  }

  return data?.error || data?.message || 'Something went wrong. Please try again.';
}
