const crypto = require('crypto');
const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  InitiateAuthCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const poolId = process.env.COGNITO_USER_POOL_ID;

/** Cognito user pools are regional — derive from pool id (e.g. ap-south-1_xxx). */
function getCognitoRegion() {
  if (process.env.COGNITO_REGION) return process.env.COGNITO_REGION;
  if (poolId && poolId.includes('_')) return poolId.split('_')[0];
  return process.env.AWS_REGION || 'us-east-1';
}

let client = null;

function getClient() {
  if (!poolId) return null;
  if (!client) {
    const creds =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined;
    client = new CognitoIdentityProviderClient({
      region: getCognitoRegion(),
      credentials: creds,
    });
  }
  return client;
}

async function getSubFromUser(user) {
  const attrs = user.UserAttributes || user.Attributes || [];
  const sub = attrs.find((a) => a.Name === 'sub');
  return sub ? sub.Value : null;
}

async function upsertCognitoUser({ email, name, password }) {
  const cognito = getClient();
  if (!cognito) return null;

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await cognito.send(
      new AdminGetUserCommand({ UserPoolId: poolId, Username: normalizedEmail })
    );
    return getSubFromUser(existing);
  } catch (err) {
    if (err.name !== 'UserNotFoundException') throw err;
  }

  const created = await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: poolId,
      Username: normalizedEmail,
      UserAttributes: [
        { Name: 'email', Value: normalizedEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: name || 'New User' },
      ],
      MessageAction: 'SUPPRESS',
    })
  );

  if (password) {
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: poolId,
        Username: normalizedEmail,
        Password: password,
        Permanent: true,
      })
    );
  }

  return getSubFromUser(created.User || {});
}

function secretHash(username) {
  const clientId = process.env.COGNITO_CLIENT_ID;
  const clientSecret = process.env.COGNITO_CLIENT_SECRET;
  if (!clientSecret) return undefined;
  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
}

async function authenticateCognito({ email, password }) {
  const cognito = getClient();
  const clientId = process.env.COGNITO_CLIENT_ID;
  if (!cognito || !clientId) return null;

  const normalizedEmail = email.trim().toLowerCase();
  const authParams = {
    USERNAME: normalizedEmail,
    PASSWORD: password,
  };
  const hash = secretHash(normalizedEmail);
  if (hash) authParams.SECRET_HASH = hash;

  const result = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: authParams,
    })
  );

  const tokens = result.AuthenticationResult;
  if (!tokens) return null;

  return {
    idToken: tokens.IdToken,
    accessToken: tokens.AccessToken,
    refreshToken: tokens.RefreshToken,
    expiresIn: tokens.ExpiresIn,
  };
}

module.exports = { upsertCognitoUser, authenticateCognito };
