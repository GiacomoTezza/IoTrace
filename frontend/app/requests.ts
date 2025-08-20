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

export async function fetchApit(
  method: string,
  endpoint: string,
  payload: any | null,
  queryParams: any | null,
  token: string | null = null
) {
  let url = new URL(endpoint);
  if (queryParams) {
    Object.keys(queryParams).forEach((key) =>
      url.searchParams.append(key, queryParams[key])
    );
  }
  let body = null;
  if (method !== "GET" && method !== "HEAD") {
    body = JSON.stringify(payload);
  }
  let requestOptions: RequestInit = {
    method: method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Cookie: `jwt=${token}` }),
    },
    body: body,
    credentials: "include", // Include cookies in the request
  };

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    const errText = await response.text();
    console.error("Fetch error (" + response.status + "): " + errText);
    throw new Error(errText);
  }

  const data = response.json();
  return data;
}


export async function getDevices(token: string | null): Promise<any> {
  return fetchApit("GET", `${backendUrl}/device/all`, null, null, token);
}

export async function getDeviceCurrentSbom(deviceId: string, token: string | null): Promise<any> {
  return fetchApit("GET", `${backendUrl}/sbom/current/${deviceId}`, null, null, token);
}

export async function getDeviceSbom(sbomId: string, token: string | null): Promise<any> {
  return fetchApit("GET", `${backendUrl}/sbom/${sbomId}`, null, null, token);
}
