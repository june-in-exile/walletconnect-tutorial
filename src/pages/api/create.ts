import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import KeyResolver from "key-did-resolver";
import { type NextApiRequest, type NextApiResponse } from "next";
import { fromString } from "uint8arrays/from-string";
import { env } from "../../env";

const { SECRET_KEY } = env;

export default async function createCredential(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  interface RequestBody {
    location: {
      latitude: number;
      longitude: number;
    };
    recipient: string;
    event: string;
  }

  const { location, recipient, event }: RequestBody = req.body as RequestBody;

  try {
    console.log(env);
    if (SECRET_KEY) {
      const key = fromString(SECRET_KEY, "base16");
      const provider = new Ed25519Provider(key);
      const staticDid = new DID({
        resolver: KeyResolver.getResolver(),
        provider,
      });

      await staticDid.authenticate();
      const badge: {
        recipient: string;
        event: string;
        timestamp: string;
        latitude?: number;
        longitude?: number;
      } = {
        recipient: recipient.toLowerCase(),
        event: event,
        timestamp: new Date().toISOString(),
      };
      location.latitude !== undefined && (badge.latitude = location.latitude);
      location.longitude !== undefined &&
        (badge.longitude = location.longitude);
      console.log(badge);

      const jws = await staticDid.createDagJWS(badge);
      const jwsJsonStr = JSON.stringify(jws);
      const jwsJsonB64 = Buffer.from(jwsJsonStr).toString("base64");
      const completeBadge = {
        ...badge,
        jwt: jwsJsonB64,
      };

      return res.json(completeBadge);
    } else {
      return res.json({
        err: "Missing unique key",
      });
    }
  } catch (err) {
    res.json({
      err,
    });
  }
}
