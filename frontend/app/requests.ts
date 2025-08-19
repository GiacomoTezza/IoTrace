const backendUrl = "https://aggregator:3000/api"

export async function login(email: string, password: string): Promise<any> {
  const response = await fetch(
    `${backendUrl}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );
  if (!response.ok) {
    throw new Error(`Error logging in: ${response.statusText}`);
  }
  return response.json();
}

export async function getDevices(): Promise<any> {
  const response = await fetch(`${backendUrl}/device/all`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching devices: ${response.statusText}`);
  }
  return response.json();
}

export async function getDeviceCurrentSbom(deviceId: string): Promise<any> {
  const response = await fetch(`${backendUrl}/sbom/current/${deviceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Error fetching current SBOM for device ${deviceId}: ${response.statusText}`);
  }
  return response.json();
}

export async function getDeviceSbom(sbomId: string, opts?: { signal?: AbortSignal }): Promise<any> {
  const response = await fetch(`${backendUrl}/sbom/${sbomId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    signal: opts?.signal,
  });
  if (!response.ok) {
    throw new Error(`Error fetching SBOM with ID ${sbomId}: ${response.statusText}`);
  }
  return response.json();
}
