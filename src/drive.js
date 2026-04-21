const FILE_NAME = "finanzas_backup.json";
const SCOPES = "https://www.googleapis.com/auth/drive";

let tokenClient = null;
let accessToken = null;

const loadScript = (src) => new Promise(res => {
  if (document.querySelector(`script[src="${src}"]`)) return res();
  const s = document.createElement("script");
  s.src = src; s.onload = res;
  document.head.appendChild(s);
});

export const initGoogle = async (clientId) => {
  await Promise.all([
    loadScript("https://apis.google.com/js/api.js"),
    loadScript("https://accounts.google.com/gsi/client")
  ]);
  await new Promise(res => window.gapi.load("client", res));
  await window.gapi.client.init({
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
  });
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {}
  });
};

export const signIn = () => new Promise((resolve, reject) => {
  if (!tokenClient) return reject("No inicializado");
  tokenClient.callback = (resp) => {
    if (resp.error) return reject(resp.error);
    accessToken = resp.access_token;
    resolve(accessToken);
  };
  tokenClient.requestAccessToken({ prompt: "consent" });
});

export const isSignedIn = () => !!accessToken;

const authHeader = () => ({ Authorization: `Bearer ${accessToken}` });

const findFile = async () => {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed=false&fields=files(id,name)`,
    { headers: authHeader() }
  );
  const data = await res.json();
  return data.files?.[0] || null;
};

export const loadFromDrive = async () => {
  const file = await findFile();
  if (!file) return null;
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: authHeader() }
  );
  return await res.json();
};

export const saveToDrive = async (data) => {
  const json = JSON.stringify(data);
  const existing = await findFile();
  if (existing) {
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`,
      { method: "PATCH", headers: { ...authHeader(), "Content-Type": "application/json" }, body: json }
    );
  } else {
    const meta = JSON.stringify({ name: FILE_NAME });
    const form = new FormData();
    form.append("metadata", new Blob([meta], { type: "application/json" }));
    form.append("file", new Blob([json], { type: "application/json" }));
    await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      { method: "POST", headers: authHeader(), body: form }
    );
  }
};
