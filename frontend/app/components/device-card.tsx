import { cn } from "~/lib/utils";
import { Card, CardTitle, CardHeader, CardContent } from "./ui/card";
import { Link } from "react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export default function DeviceCard({
  device,
  className,
}: {
  device: {
    _id: string;
    deviceId: string;
    createdAt: string;
    currentSbomId: string;
    isCurrentValid: boolean;
    lastCertFingerprint256: string;
    lastSeen: string;
    lastSeenTopic: string;
  };
  className?: string;
}) {
  return (
    <Link to={`/device/${device._id}`} className="no-underline">
      <Card className={cn("shadow-md hover:shadow-lg transition-shadow duration-200", className)}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {device.isCurrentValid ? (
              <ShieldCheck className="inline mr-2 text-green-500" />
            ) : (
              <ShieldAlert className="inline mr-2 text-red-500" />
            )}
            {device.deviceId}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-foreground">
            Last Seen:
            <span className="ml-1 text-muted-foreground">
              {new Date(device.lastSeen).toLocaleString()}
            </span>
          </p>
          <p className="text-sm text-foreground truncate">
            Current SBOM ID:
            <span className="ml-1 text-muted-foreground">
              {device.currentSbomId}
            </span>
          </p>
          <p className="text-sm text-foreground">
            Last Seen Topic:
            <span className="ml-1 text-muted-foreground">
              {device.lastSeenTopic}
            </span>
          </p>
          <p className="text-sm text-foreground">
            Valid SBOM:
            <span className="ml-1 text-muted-foreground">
              {device.isCurrentValid ? "Yes" : "No"}
            </span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}


