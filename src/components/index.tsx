import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useComposeDB } from "@/fragments";
import { DNA } from "react-loader-spinner";
import { DID, type DagJWS } from "dids";
import { definition } from "@/__generated__/definition";
import KeyResolver from "key-did-resolver";

type Location = {
  latitude: number | undefined;
  longitude: number | undefined;
};

interface Event {
  recipient: string;
  latitude?: number;
  longitude?: number;
  verified?: boolean;
  timestamp: string;
  jwt: string;
}

type Wallet = Event;
type Encryption = Event;

export default function Attest() {
  const [attesting, setAttesting] = useState(false);
  const [share, setShare] = useState(false);
  const { compose } = useComposeDB();
  const [event, setEvent] = useState<"Encryption" | "Wallet" | "">("");
  const [encryptionBadge, setEncryptionBadge] = useState<Encryption | null>(
    null,
  );
  const [walletBadge, setWalletBadge] = useState<Wallet | null>(null);
  const [userLocation, setUserLocation] = useState<Location>({
    latitude: undefined,
    longitude: undefined,
  });
  const [time, setTime] = useState<Date>();
  const { address } = useAccount();

  const getUserLocation = () => {
    // if geolocation is supported by the users browser
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else {
      console.log("Geolocation not supported");
    }

    function success(position: GeolocationPosition) {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      setUserLocation({ latitude, longitude });
      console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
      console.log(typeof latitude);
    }

    function error() {
      console.log("Unable to retrieve your location");
    }
  };

  const getParams = async () => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const eventItem = urlParams.get("event")?.split("?")[0];
    console.log(eventItem);
    eventItem === definition.models.EncryptionEvent.id
      ? setEvent("Encryption")
      : eventItem === definition.models.WalletEvent.id
        ? setEvent("Wallet")
        : null;

    const data = await compose.executeQuery<{
      node: {
        encryptionEvent: Encryption | null;
        walletEvent: Wallet | null;
      };
    }>(`
        query {
          node(id: "${`did:pkh:eip155:1:${address?.toLowerCase()}`}") {
          ... on CeramicAccount {
                walletEvent {
                id
                recipient
                latitude
                longitude
                timestamp
                jwt
                }
                encryptionEvent {
                id
                recipient
                latitude
                longitude
                timestamp
                jwt
              }
            }
          }
        }
      `);
    console.log(data);
    if (
      data as {
        data: {
          node: {
            encryptionEvent: Encryption | null;
            walletEvent: Wallet | null;
          };
        };
      }
    ) {
      const encryption = data as {
        data: {
          node: {
            encryptionEvent: Encryption | null;
            walletEvent: Wallet | null;
          };
        };
      };
      if (encryption.data.node === null) {
        console.log("null value");
        return;
      }
      console.log(encryption);

      const wallet = data as {
        data: {
          node: {
            encryptionEvent: Encryption | null;
            walletEvent: Wallet | null;
          };
        };
      };
      if (wallet.data.node === null) {
        console.log("null value");
        return;
      }

      if (encryption.data.node.encryptionEvent?.jwt) {
        try {
          const json = Buffer.from(
            encryption.data.node.encryptionEvent?.jwt,
            "base64",
          ).toString();
          const parsed = JSON.parse(json) as { jws: DagJWS };
          console.log(parsed);
          const newDid = new DID({ resolver: KeyResolver.getResolver() });
          const result = await newDid.verifyJWS(parsed.jws);
          const didFromJwt = result.didResolutionResult.didDocument?.id;
          console.log("This is the payload: ", didFromJwt);
          if (
            didFromJwt ===
            "did:key:z6MkqusKQfvJm7CPiSRkPsGkdrVhTy8EVcQ65uB5H2wWzMMQ"
          ) {
            encryption.data.node.encryptionEvent.verified = true;
          }
        } catch (e) {
          console.log(e);
        }
      }
      if (wallet.data.node.walletEvent?.jwt) {
        try {
          const json = Buffer.from(
            wallet.data.node.walletEvent.jwt,
            "base64",
          ).toString();
          const parsed = JSON.parse(json) as { jws: DagJWS };
          console.log(parsed);
          const newDid = new DID({ resolver: KeyResolver.getResolver() });
          const result = await newDid.verifyJWS(parsed.jws);
          const didFromJwt = result.didResolutionResult.didDocument?.id;
          console.log("This is the payload: ", didFromJwt);
          if (
            didFromJwt ===
            "did:key:z6MkqusKQfvJm7CPiSRkPsGkdrVhTy8EVcQ65uB5H2wWzMMQ"
          ) {
            wallet.data.node.walletEvent.verified = true;
          }
        } catch (e) {
          console.log(e);
        }
      }
      setEncryptionBadge(encryption.data.node.encryptionEvent);
      setWalletBadge(wallet.data.node.walletEvent);
    }
  };

  const createBadge = async () => {
    if (!event) {
      alert("No event detected");
      return;
    }
    setAttesting(true);
    const result = await fetch("/api/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: address,
        event,
        location: userLocation,
      }),
    });
    type returnType = {
      err?: unknown;
      recipient: string;
      latitude?: number;
      longitude?: number;
      timestamp: string;
      jwt: string;
    };
    const finalClaim = (await result.json()) as returnType;
    console.log(finalClaim);
    if (finalClaim.err) {
      setAttesting(false);
      alert(finalClaim.err);
      return;
    }
    const data =
      event === "Wallet" && finalClaim.latitude && finalClaim.longitude
        ? await compose.executeQuery(`
    mutation{
      createWalletEvent(input: {
        content: {
          recipient: "${finalClaim.recipient}"
          latitude: ${finalClaim.latitude}
          longitude: ${finalClaim.longitude}
          timestamp: "${finalClaim.timestamp}"
          jwt: "${finalClaim.jwt}"
        }
      })
      {
        document{
          id
          recipient
          latitude
          longitude
          timestamp
          jwt
        }
      }
    }
  `)
        : event === "Encryption" && finalClaim.latitude && finalClaim.longitude
          ? await compose.executeQuery(`
  mutation{
    createEncryptionEvent(input: {
      content: {
        recipient: "${finalClaim.recipient}"
        latitude: ${finalClaim.latitude}
        longitude: ${finalClaim.longitude}
        timestamp: "${finalClaim.timestamp}"
        jwt: "${finalClaim.jwt}"
      }
    })
    {
      document{
        id
        recipient
        latitude
        longitude
        timestamp
        jwt
      }
    }
  }
`)
          : event === "Wallet" && !finalClaim.latitude
            ? await compose.executeQuery(`
      mutation{
        createWalletEvent(input: {
          content: {
            recipient: "${finalClaim.recipient}"
            timestamp: "${finalClaim.timestamp}"
            jwt: "${finalClaim.jwt}"
          }
        })
        {
          document{
            id
            recipient
            timestamp
            jwt
          }
        }
      }
    `)
            : event === "Encryption" && !finalClaim.latitude
              ? await compose.executeQuery(`
     mutation{
       createEncryptionEvent(input: {
         content: {
           recipient: "${finalClaim.recipient}"
           timestamp: "${finalClaim.timestamp}"
           jwt: "${finalClaim.jwt}"
         }
       })
       {
         document{
           id
           recipient
           timestamp
           jwt
         }
       }
     }
   `)
              : null;
    console.log(data);
    setAttesting(false);
    await getParams();
    return data;
  };

  const createClaim = async () => {
    const finalClaim = await createBadge();
    console.log(finalClaim);
  };

  const updateTime = async () => {
    //update time every second
    try {
      setInterval(() => {
        setTime(new Date());
      }, 1000);
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    void getParams();
    void updateTime();
    console.log({
      "encryption event id": definition.models.EncryptionEvent.id,
      "wallet event id": definition.models.WalletEvent.id,
    });
  }, [address]);

  return (
    <div className="flex min-h-screen min-w-full flex-col items-center justify-start gap-6 px-4 py-8 sm:py-16 md:py-24">
      <div
        className="w-full rounded-md bg-white p-6 shadow-xl shadow-rose-600/40 ring-2 ring-indigo-600"
        style={{ height: "fit-content", minHeight: "35rem" }}
      >
        <form className="mt-4" key={1}>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800">
              Event
            </label>
            <p className="h-8 w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
              {event ? event : ""}{" "}
            </p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800">
              Coordinates You&apos;ve Shared{" "}
              <span className="font-light">(optional)</span>
            </label>
            {share && (
              <p className="mb-3 text-xs font-light text-gray-800">
                {userLocation
                  ? `${userLocation.latitude}, ${userLocation.longitude}`
                  : ""}
              </p>
            )}
            <div className="flex items-center">
              <input
                id="link-checkbox"
                type="checkbox"
                value=""
                onChange={() => {
                  setShare(!share);
                  getUserLocation();
                }}
                className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
              ></input>
              {!share ? (
                <label className="font-small ms-2 text-sm text-gray-900 dark:text-gray-300">
                  I agree to share my location
                </label>
              ) : (
                <label className="font-small ms-2 text-sm text-gray-900 dark:text-gray-300">
                  Unshare
                </label>
              )}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800">
              Current time
            </label>
            <p className="text-xs font-light text-gray-800">
              {time?.toLocaleString()}
            </p>
          </div>
          <div className="mt-6 flex justify-center">
            {!attesting ? (
              <button
                className="w-1/2 transform rounded-md bg-indigo-700 px-4 py-2 text-sm text-white transition-colors duration-200 hover:bg-indigo-600 focus:bg-indigo-600 focus:outline-none"
                onClick={async (e) => {
                  e.preventDefault();
                  await createClaim();
                }}
              >
                {"Generate Badge"}
              </button>
            ) : (
              <DNA
                visible={true}
                height="80"
                width="80"
                ariaLabel="dna-loading"
                wrapperStyle={{}}
                wrapperClass="dna-wrapper"
              />
            )}
          </div>
        </form>
        <div className="flex-auto flex-row flex-wrap items-center justify-center">
          {encryptionBadge !== null && (
            <div className="mt-4 w-auto max-w-full shrink-0 rounded-md border-2 border-emerald-600">
              <label className="flex px-3 py-2 text-sm font-semibold text-gray-800">
                Encryption Event Badge
              </label>
              <p className="w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                Recipient:{" "}
                {encryptionBadge?.recipient.slice(0, 6) +
                  "..." +
                  encryptionBadge?.recipient.slice(-4)}
              </p>
              <p className="w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                Timestamp: {encryptionBadge?.timestamp}
              </p>
              {encryptionBadge.latitude && (
                <p className="w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                  Latitude: {encryptionBadge?.latitude}
                </p>
              )}
              {encryptionBadge.longitude && (
                <p className="w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                  Longitude: {encryptionBadge?.longitude}
                </p>
              )}
              {encryptionBadge.verified && (
                <p className="w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                  Verified: {encryptionBadge?.verified ? "true" : "false"}
                </p>
              )}
            </div>
          )}
          {walletBadge !== null && (
            <div className="mt-4 w-auto max-w-full shrink-0 rounded-md border-2 border-emerald-600">
              <label className="flex px-3 py-2 text-sm font-semibold text-gray-800">
                Wallet Event Badge
              </label>
              <p className="rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                Recipient:{" "}
                {walletBadge?.recipient
                  ? walletBadge?.recipient.slice(0, 6) +
                    "..." +
                    walletBadge?.recipient.slice(-4)
                  : ""}
              </p>
              <p className="rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                Timestamp: {walletBadge?.timestamp}
              </p>
              {walletBadge.latitude && (
                <p className="rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                  Latitude: {walletBadge?.latitude}
                </p>
              )}
              {walletBadge.longitude && (
                <p className="rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                  Longitude: {walletBadge?.longitude}
                </p>
              )}
              {walletBadge.verified && (
                <p className="w-full rounded-md border px-3 py-2 focus:border-indigo-600 focus:outline-none">
                  Verified: {walletBadge?.verified ? "true" : "false"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
