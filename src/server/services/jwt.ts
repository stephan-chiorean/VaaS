import { encode, decode, TAlgorithm } from 'jwt-simple';
import {
  IPartialSession,
  IEncodeResult,
  IDecodeResult,
  ITokenSession,
  IExpirationStatus,
} from '../interfaces/IToken';
import { IUser } from '../interfaces/IUser';
import User from '../models/user';

// ENCODING USER INFO WITH JWT
// FIRST PARAMETER: jwt secret.
// SECOND PARAMETER: user info { id, username } from partial session interface provided for encoding
export function encodeSession(
  accessSecret: any,
  partialSession: IPartialSession
): IEncodeResult {
  //SPECIFYING ALGORITHM TO USE FOR ENCODING
  console.log('made it to encodesession');
  const algo: TAlgorithm = 'HS512';
  // iat = ISSUED AT
  const iat = Date.now(),
    timeToExp = Number(process.env.JWT_EXP),
    // eat = EXPIRED AT
    eat = iat + timeToExp;
  // SESSION OBJECT LITERAL FOR ENCODING
  const session: ITokenSession = {
    ...partialSession,
    iat: iat,
    eat: eat,
  };

  console.log('what is session: ', session);
  const encodedObject = {
    token: encode(session, accessSecret, algo),
  };
  console.log(encodedObject, 'encodedObject'); // BROKEN
  return encodedObject;
  // RETURN ENCODED RESULT
  // return {
  //   token: encode(session, accessSecret, algo),
  // };
}

// DECODING USER's JWT TOKEN
export function decodeSession(
  accessSecret: any,
  sessionToken: any
): IDecodeResult {
  //SPECIFYING ALGORITHM TO USE FOR DECODING
  const algorithm: TAlgorithm = 'HS512';
  let result: ITokenSession;
  try {
    // FIRST PARAMETER: token.
    // SECOND PARAMETER: jwt secret.
    // THIRD PARAMETER: if true, decode token without verifying the signature of the token.
    // FOURTH PARAMETER: algorithm to decode token. Default is HS256. Supported algorithms are HS256, HS384, HS512 and RS256.
    result = decode(sessionToken, accessSecret, false, algorithm);
  } catch (err: any) {
    // SPECIFIES ERROR OBJECT TO RETURN
    if (
      err.message === 'No token supplied' ||
      err.message === 'Not enough or too many segments' ||
      err.message.indexOf('Unexpected token') === 0
    ) {
      return { type: 'invalid-token' };
    }
    if (
      err.message === 'Signature verification failed' ||
      err.message === 'Algorithm not supported'
    ) {
      return { type: 'integrity-error' };
    }
    throw err;
  }
  // SUCCESS OBJECT RETURNED CONTAINING DECODED TOKEN IF NO ERROR IS THROWN
  return {
    type: 'valid',
    session: result,
  };
}

// CHECKS EXPIRY STATUS OF TOKEN
export function checkExpStatus(token: ITokenSession): IExpirationStatus {
  const now = Date.now();
  // eat = EXPIRED AT
  if (token.eat > now) return 'active';
  const gracePeriod = token.eat + Number(process.env.JWT_grace);
  if (gracePeriod > now) return 'grace';
  return 'expired';
}

export async function editSession(user: IUser, accessSecret: string | any) {
  console.log('editing session');
  // this function is to renew token so session time can start all over
  const { id, username } = user;

  const tokenObj = encodeSession(accessSecret, {
    id,
    username,
  });

  console.log('tokenObj: ', tokenObj);
  // updates user with the new token
  console.log(' attempting user update ');
  await User.findOneAndUpdate(
    { id },
    { cookieId: tokenObj.token },
    { new: true }
  ).exec();

  console.log('user updated');
  // returns the new token
  return tokenObj.token;
}
