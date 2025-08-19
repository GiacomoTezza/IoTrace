import type { Route } from "./+types/home";
import { getDeviceCurrentSbom } from "~/requests";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "~/components/ui/pagination";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "~/components/ui/card"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card"
import { Badge } from "~/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { useFetcher } from "react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Sbom - IoTrace" },
    { name: "description", content: "Device Sbom" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  // Check param deviceId validity, should be a valid MongoDB ObjectId
  if (!params.did || !/^[a-f\d]{24}$/i.test(params.did)) {
    throw new Response("Invalid device ID", { status: 400 });
  }
  const currentSbom = await getDeviceCurrentSbom(params.did);
  if (currentSbom && currentSbom.success) {
    return currentSbom.data;
  } else {
    throw new Response("Failed to fetch current SBOM", { status: 500 });
  }
}


/* ---------- Helpers ---------- */

function fmtDate(iso?: string | Date) {
  if (!iso) return "-";
  try {
    const d = typeof iso === "string" ? new Date(iso) : iso;
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

function humanBytes(n?: number) {
  if (!n && n !== 0) return "-";
  const i = n === 0 ? 0 : Math.floor(Math.log(n) / Math.log(1024));
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const val = n / Math.pow(1024, Math.max(0, i));
  return `${val.toFixed((i === 0) ? 0 : 2)} ${sizes[Math.min(i, sizes.length - 1)]}`;
}

function shortId(id?: string) {
  if (!id) return "";
  return id.slice(0, 8);
}

function buildPaginationIndices(total: number, current: number, maxVisible = 7) {
  // Return an array where elements are either numbers (indices) or string "..."
  // total = number of entries, indices 0..total-1
  if (total <= maxVisible) return Array.from({ length: total }, (_, i) => i);

  const out: Array<number | string> = [];

  const left = 1; // always show index 0 (current) so start from 0
  const right = total - 1;

  // always include 0 (current), maybe some after, and the rightmost
  out.push(0);

  // compute window around current (but keep 0 already there)
  const before = 2;
  const after = 2;
  let start = Math.max(1, current - before);
  let end = Math.min(right - 1, current + after);

  // if current is near beginning, grow end to fill space
  if (current <= 1) {
    end = Math.min(right - 1, Math.max(end, 1 + (maxVisible - 3)));
  }
  // ensure room: if not enough slots left, adjust
  // if there is a gap between 0 and start > 1, show ellipsis
  if (start > 1) {
    out.push("...");
  } else {
    // include intermediate 1..start-1
    for (let i = 1; i < start; i++) out.push(i);
  }

  for (let i = start; i <= end; i++) out.push(i);

  if (end < right - 1) {
    out.push("...");
  } else {
    for (let i = end + 1; i < right; i++) out.push(i);
  }

  // finally include rightmost
  out.push(right);

  // dedupe / clamp
  return out.filter((v, idx, arr) => {
    // remove duplicates produced by small totals
    return arr.indexOf(v) === idx;
  });
}

// Loader data example
// {
//   sbom: {
//     _id: '68a483606be67a859ff1a549',
//     topic: '/device/sbom/sbom-tracelet-1',
//     deviceId: 'sbom-tracelet-1',
//     receivedAt: '2025-08-19T14:00:00.505Z',
//     ts: '2025-08-19T13:59:59.000Z',
//     nonce: '2eacb2b0-fde5-46b0-a521-c6d7f6ae2a9d',
//     sbom: {
//       '$schema': 'http://cyclonedx.org/schema/bom-1.4.schema.json',
//       bomFormat: 'CycloneDX',
//       specVersion: '1.4',
//       version: 1,
//       metadata: [Object],
//       components: [Array],
//       dependencies: [Array]
//     },
//     sbomHash: '79c0002d325ddc2632162a9f2a283b775d4047910f566abe74c19989e83a130f',
//     sizeBytes: 1333208,
//     signatureB64: 'XrdVQhIKY7gYQDSKTO2/BxEhXuVeWLI7hgRC5qfd6mvmgqnLZt//l8zv/np8bxbcpPnFF75uyLJnuuF13ASSD0e4vy7NQCXQzl1uhU7NusTjRx2CVq5Q3FzojRAphAe01r8u2ZnVI6Sc2Sc0o7agc70P6bOixdsTLmYFg+mNJXl1z/zRU4BpBOcA3L5D/A9g0EIcOzNwokYiK2EdO2zoiHGPgAQyG5U517eNg4PmuB5U5FJaWlobXEHeZLv+uMwoVryiIrS6JEs8dywtuFKMQ1AjCbBubLhSkR2PBu8jOc7CsjkmGHrINlIxFQ8pxhs6+PYZejBVr0YkXmAgObFMSQ==',
//     signatureAlg: 'RSASSA-PKCS1-v1_5-SHA256',
//     signerCertPem: '-----BEGIN CERTIFICATE-----\n' +
//       'MIIEVjCCAj6gAwIBAgIUaTwF6tbhQGSOAEJX/xJfinmnwScwDQYJKoZIhvcNAQEL\n' +
//       'BQAwITEfMB0GA1UEAwwWSW9UcmFjZS1JbnRlcm1lZGlhdGVDQTAeFw0yNTA4MTkx\n' +
//       'MzU3MDBaFw0yNjA4MTkxMzU3MDBaMBoxGDAWBgNVBAMMD3Nib20tdHJhY2VsZXQt\n' +
//       'MTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAL8bNGdIzYTVQaVzqq27\n' +
//       'Ew1CNKx0FZK4DzGhBVaPvxFX+gmwdUxav6afeAj+lGG5Q5GFsC/0InRDKUh3lqK4\n' +
//       'zhiFLFHvnaDIeaT65kli1paeRj/7xGN9ETjuOR2w13Mr/9WEQ0JeRQxFzpPqmuXk\n' +
//       'fTfToO5LkVC25mm22UEK05EE+TA/1+J3EpOGl3yGe0K9Vm7sXO7zni54x9GWThbA\n' +
//       'uRGvLB9CWDG5RbQEtXbE8EsD/B/sMsQZIdYiex0H0KiXW2T9a8RXxO7I77iWuB9B\n' +
//       'QqC5RX7qM+j2EjquwRN/sUGY6y5FJovu1IElNZ/4XjU6LYJW/fnbOpJXBLGkC1AF\n' +
//       'IZkCAwEAAaOBjDCBiTAJBgNVHRMEAjAAMBoGA1UdEQQTMBGCD3Nib20tdHJhY2Vs\n' +
//       'ZXQtMTATBgNVHSUEDDAKBggrBgEFBQcDAjALBgNVHQ8EBAMCBaAwHQYDVR0OBBYE\n' +
//       'FMWO7RPwgDjZB/weDLuXj3wV6hZ8MB8GA1UdIwQYMBaAFImY6CxJpYfLg2+RMh+v\n' +
//       'r4Bf3Xo8MA0GCSqGSIb3DQEBCwUAA4ICAQAiXCtDR4r0pqNpxq9EDwODRaUbLTgI\n' +
//       'JWam0+FTyLq4Tq38IM0Dx1MH2rQRlkinS7rfKoCK0jnzYeJ8IpoRtwQ+u6KMjU29\n' +
//       '4IWOnrd+lW/AjvsPZjuHowQjWiQiK4tlKzChp5QTCWgJ5+IJX8pIWSU85ZxkFB/d\n' +
//       'ogfMHqVLQpSDNs2kH/OP1Mmu3ldlOkevOEEufMgpfxdvVv61AEedvf0OKigebw+V\n' +
//       'aMYYj4M9+ZHqjTrYqd/km+z1YGPSvHp9oWGsc5mV1OwuoMCf+ArmzjXMzqBaFjdC\n' +
//       '+1rgPV3+5S8nJPvf6sNvEiDEhU6Fo5ZC4dyg677uVmWQ0HmYTR79HwJG0h7WKaYZ\n' +
//       'gkI0os82z3kvPiD+u/UgP2YZmERsJGWNxO1QcbAatQeNY7VQ412OtfOZYeCvbtHy\n' +
//       'H55Z2ExZcizN7gq170XFyCzrLU3vLgFwLUZiWf9M7cofrHhTUJctTGrkBIJ++NuE\n' +
//       'ZlL0pjpmvrIOvGM/pEL1jFkp/VQ+4qrg1/ntRQMS3XjaqNOfPM16rDrR9gH4RxZB\n' +
//       'yT84aou5VmAoGXCuCnrr8zL7tjqrnrulb5dh74w74+HRYGMzz+zrtQXRbi0FyU7W\n' +
//       'zIotNHiULGYIEuvFwDUR8cxOJfaxbPLvcD3xWADEJW1OBhf4NYmYKmARjtLe+iq0\n' +
//       'OT9VTiAqHB1KKw==\n' +
//       '-----END CERTIFICATE-----',
//     signer: {
//       subject: 'CN=sbom-tracelet-1',
//       subjectCN: 'sbom-tracelet-1',
//       issuer: 'IoTrace-IntermediateCA',
//       serialNumber: '693c05ead6e140648e004257ff125f8a79a7c127',
//       notBefore: '2025-08-19T13:57:00.000Z',
//       notAfter: '2026-08-19T13:57:00.000Z',
//       fingerprint256: '4118387e7e5ec81c1a10f254054f76d02a1afae73bd1c509cf7f21fe7b54157e'
//     },
//     verification: {
//       chainOk: true,
//       signatureOk: true,
//       timestampSkewOk: true,
//       replayOk: true
//     },
//     verified: true,
//     emqx: { qos: 1, retain: false, mid: 6 }
//   },
//   history: [
//     {
//       _id: '68a483606be67a859ff1a549',
//       receivedAt: '2025-08-19T14:00:00.505Z',
//       verified: true
//     },
//     {
//       _id: '68a483406be67a859ff1a53f',
//       receivedAt: '2025-08-19T13:59:28.452Z',
//       verified: true
//     },
//     {
//       _id: '68a482f96be67a859ff1a533',
//       receivedAt: '2025-08-19T13:58:17.433Z',
//       verified: true
//     }
//   ]
// }

// This should be the detail view for a specific device's SBOM,
// it should have the deviceId as title, below a pagination component that points to the current SBOM, so history first element and by clicking causes the load of other sboms by id.
// Then below that the SBOM details, starting with the verification statuses with details on hover and icons, the metadata, then the sbom itself must be visualized showing all the components and versions.
export default function Device({
  loaderData,
}: Route.ComponentProps) {
  const initialCurrent = loaderData.sbom;
  const initialHistory = loaderData.history || [];

  const [historyPage, setHistoryPage] = useState<number>(0);
  const [currentSbom, setCurrentSbom] = useState<any>(initialCurrent);
  const [history, setHistory] = useState<Array<any>>(initialHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.data) {
      const d = fetcher.data;
      setCurrentSbom(d);
      setLoading(false);
      setError(null);
    } else if (fetcher.state === "loading") {
      setLoading(true);
      setError(null);
    } else if (fetcher.state === "idle") {
      setLoading(false);
    }
  }, [fetcher]);


  useEffect(() => {
    if (historyPage === 0) {
      setCurrentSbom(initialCurrent);
      return;
    }
    const entry = history[historyPage];
    if (!entry) {
      setError("History entry not found");
      return;
    }
    setError(null);
    setLoading(true);
    // call the route loader: /device/:did/sbom/:sbomId
    // fetcher.load triggers the loader server-side and populates fetcher.data
    fetcher.load(`/device/${currentSbom.deviceId}/sbom/${entry._id}`);
  }, [historyPage]);

  // build pagination items
  const paginationItems = useMemo(() => buildPaginationIndices(history.length, historyPage, 7), [history.length, historyPage]);

  const metaSummary = useMemo(() => {
    const msg = currentSbom || {};
    const sbomObj = msg.sbom || {};
    return {
      deviceId: msg.deviceId || loaderData.sbom?.deviceId,
      topic: msg.topic || loaderData.sbom?.topic,
      receivedAt: msg.receivedAt,
      sbomTimestamp: msg.ts || (sbomObj?.metadata?.timestamp ?? sbomObj?.metadata?.timestamp),
      nonce: msg.nonce,
      sizeBytes: msg.sizeBytes,
      sbomHash: msg.sbomHash,
      signatureAlg: msg.signatureAlg || msg.signatureAlg,
      signerCN: msg?.signer?.subjectCN || msg?.signerCert?.subject,
      components: Array.isArray(sbomObj?.components) ? sbomObj.components.length : undefined,
      dependencies: Array.isArray(sbomObj?.dependencies) ? sbomObj.dependencies.length : undefined,
    };
  }, [currentSbom, loaderData.sbom]);


  function ChainHover({ signer, signerCertPem, verification }: { signer?: any; signerCertPem?: string; verification?: any }) {
    return (
      <div className="max-w-xs">
        <div className="text-sm font-semibold mb-2">Signer</div>
        <div className="text-xs break-words">
          <div><strong>SubjectCN:</strong> {signer?.subjectCN ?? "-"}</div>
          <div><strong>Issuer:</strong> {signer?.issuer ?? "-"}</div>
          <div><strong>Serial:</strong> {signer?.serialNumber ?? "-"}</div>
          <div><strong>Valid:</strong> {fmtDate(signer?.notBefore)} → {fmtDate(signer?.notAfter)}</div>
          <div className="mt-2"><strong>Fingerprint (SHA256):</strong><div className="break-all text-xs">{signer?.fingerprint256 ?? "-"}</div></div>
        </div>

        {signerCertPem ? (
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-muted-foreground">View PEM</summary>
            <pre className="whitespace-pre-wrap text-xs bg-neutral-900/5 p-2 rounded max-h-40 overflow-auto">{signerCertPem}</pre>
          </details>
        ) : null}

        <div className="mt-2 text-xs text-muted-foreground">
          <div><strong>Chain OK:</strong> {verification?.chainOk ? "yes" : "no"}</div>
          {verification?.reason ? <div><strong>Reason:</strong> {verification.reason}</div> : null}
        </div>
      </div>
    );
  }

  function SignatureHover({ signatureAlg, verification }: { signatureAlg?: string; verification?: any }) {
    return (
      <div className="max-w-xs text-xs">
        <div className="font-semibold mb-1">Signature</div>
        <div><strong>Algorithm:</strong> {signatureAlg ?? "-"}</div>
        <div><strong>Signature OK:</strong> {verification?.signatureOk ? "yes" : "no"}</div>
        {verification?.reason ? <div className="mt-1"><strong>Reason:</strong> {verification.reason}</div> : null}
        <div className="mt-2 text-muted-foreground">Signature verification was performed using the signer's public key from the provided certificate.</div>
      </div>
    );
  }

  function TimestampHover({ sbomTimestamp, receivedAt, verification }: { sbomTimestamp?: string; receivedAt?: string; verification?: any }) {
    const tb = sbomTimestamp ? new Date(sbomTimestamp).getTime() : undefined;
    const rb = receivedAt ? new Date(receivedAt).getTime() : undefined;
    let skew = undefined;
    if (tb && rb) skew = Math.abs(rb - tb) / 1000;
    return (
      <div className="max-w-xs text-xs">
        <div className="font-semibold mb-1">Timestamp</div>
        <div><strong>SBOM time:</strong> {fmtDate(sbomTimestamp)}</div>
        <div><strong>Received at:</strong> {fmtDate(receivedAt)}</div>
        <div><strong>Skew (s):</strong> {skew !== undefined ? skew.toFixed(1) : "-"}</div>
        <div className="mt-2"><strong>Timestamp ok:</strong> {verification?.timestampSkewOk ? "yes" : "no"}</div>
      </div>
    );
  }

  function ReplayHover({ verification }: { verification?: any }) {
    return (
      <div className="max-w-xs text-xs">
        <div className="font-semibold mb-1">Replay protection</div>
        <div><strong>Replay OK:</strong> {verification?.replayOk ? "yes" : "no"}</div>
        <div className="mt-2 text-muted-foreground">Replay detection is based on nonces and stored history for the device. If false, message may be duplicate or replayed.</div>
      </div>
    );
  }

  const v = currentSbom?.verification || {};

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold">
        Device SBOM: {currentSbom.deviceId}
      </h1>


      <div className="w-full max-w-6xl mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                label={"Newer"}
                onClick={() => {
                  setHistoryPage((prev) => Math.max(prev - 1, 0));
                }}
              />
            </PaginationItem>
            {paginationItems.map((it, idx) => {
              if (it === "...") {
                return (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }
              const i = it as number;
              const entry = history[i];
              const label = i === 0 ? "Current" : fmtDate(entry.receivedAt).split(",")[0] || shortId(entry._id);
              return (
                <PaginationItem key={entry?._id ?? `i-${i}`}>
                  <PaginationLink size="default" isActive={i === historyPage} onClick={() => setHistoryPage(i)} title={entry ? new Date(entry.receivedAt).toLocaleString() : label}>
                    {label}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                label={"Older"}
                onClick={() => {
                  setHistoryPage((prev) => Math.min(prev + 1, loaderData.history.length - 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <Card className="w-full max-w-6xl mt-5">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            {historyPage === 0 ? "Current" : "Historical"} SBOM Details
            {loading ? <span className="ml-3 text-sm text-muted-foreground">Loading…</span> : null}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">

            <div>
              <h3 className="font-medium mb-2">Verification Statuses</h3>
              <div className="flex flex-wrap gap-2">
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge
                      variant="secondary"
                      className={`${v.chainOk ? "bg-green-600" : "bg-red-600"} text-background font-bold`}
                    >
                      {v.chainOk ? <ShieldCheck /> : <ShieldAlert />}
                      Chain
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <ChainHover signer={currentSbom?.signer} signerCertPem={currentSbom?.signerCertPem} verification={v} />
                  </HoverCardContent>
                </HoverCard>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge className={`${v.signatureOk ? "bg-green-600" : "bg-red-600"} text-background font-bold`}>
                      {v.signatureOk ? <ShieldCheck /> : <ShieldAlert />}
                      Signature
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <SignatureHover signatureAlg={currentSbom?.signatureAlg} verification={v} />
                  </HoverCardContent>
                </HoverCard>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge className={`${v.timestampSkewOk ? "bg-green-600" : "bg-red-600"} text-background font-bold`}>
                      {v.timestampSkewOk ? <ShieldCheck /> : <ShieldAlert />}
                      Timestamp
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <TimestampHover sbomTimestamp={currentSbom?.ts} receivedAt={currentSbom?.receivedAt} verification={v} />
                  </HoverCardContent>
                </HoverCard>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Badge className={`${v.replayOk ? "bg-green-600" : "bg-red-600"} text-background font-bold`}>
                      {v.replayOk ? <ShieldCheck /> : <ShieldAlert />}
                      Replay
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    <ReplayHover verification={v} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>


            <div>
              <h3 className="font-medium mb-2">Message & SBOM metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-sidebar border-sidebar-border border p-3 rounded">
                  <div className="text-sm"><strong>Device:</strong> {metaSummary.deviceId}</div>
                  <div className="text-sm"><strong>Topic:</strong> {metaSummary.topic}</div>
                  <div className="text-sm"><strong>Received at:</strong> {fmtDate(metaSummary.receivedAt)}</div>
                  <div className="text-sm"><strong>SBOM timestamp:</strong> {fmtDate(metaSummary.sbomTimestamp)}</div>
                  <div className="text-sm"><strong>Nonce:</strong> <code className="break-all">{metaSummary.nonce ?? "-"}</code></div>
                </div>

                <div className="bg-sidebar border-sidebar-border border p-3 rounded">
                  <div className="text-sm"><strong>Size:</strong> {humanBytes(metaSummary.sizeBytes)}</div>
                  <div className="text-sm"><strong>SBOM hash:</strong> <code className="break-all">{metaSummary.sbomHash ?? "-"}</code></div>
                  <div className="text-sm"><strong>Signature alg:</strong> {metaSummary.signatureAlg ?? "-"}</div>
                  <div className="text-sm"><strong>Signer:</strong> {metaSummary.signerCN ?? "-"}</div>
                  <div className="text-sm"><strong>Components:</strong> {metaSummary.components ?? "-"}</div>
                  <div className="text-sm"><strong>Dependencies:</strong> {metaSummary.dependencies ?? "-"}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium">SBOM</h3>
              <pre className="bg-sidebar border-sidebar-border border-1 p-4 rounded overflow-auto">{JSON.stringify(currentSbom.sbom, null, 2)}</pre>
            </div>

          </div>

          {error ? <div className="mt-4 text-sm text-red-600">Error: {error}</div> : null}
        </CardContent>
      </Card>
    </div>
  )
}
