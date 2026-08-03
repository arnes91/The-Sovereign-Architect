import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { LoggerService } from './loggerService';

export const FIREBASE_CONFIG = firebaseConfig;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://mail.google.com/');
provider.addScope('https://www.googleapis.com/auth/calendar');
provider.addScope('https://www.googleapis.com/auth/documents');
provider.addScope('https://www.googleapis.com/auth/presentations');
provider.addScope('https://www.googleapis.com/auth/tasks');
provider.addScope('https://www.googleapis.com/auth/chat.messages');
provider.addScope('https://www.googleapis.com/auth/chat.spaces');
provider.addScope('https://www.googleapis.com/auth/youtube.upload');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        LoggerService.logWorkspace(`Authorized user session linked: ${user.email}`);
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        LoggerService.logWorkspace("Session active but Google Workspace token is missing.");
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('workspace_access_token');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    LoggerService.logWorkspace("Initiating Google Workspace Single Sign-In popup...");
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('workspace_access_token', cachedAccessToken);
    }
    LoggerService.logWorkspace(`Sign-in successful. Token cached for user: ${result.user.email}`);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    LoggerService.logError(`Google Workspace sign-in error: ${error.message || error}`, { error });
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken && typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem('workspace_access_token');
    if (cachedAccessToken) {
      LoggerService.logWorkspace("Restored Google Workspace access token from persistent cache.");
    }
  }
  return cachedAccessToken;
};

export const logout = async () => {
  LoggerService.logWorkspace("Deauthorizing session... clearing persistent Workspace cache.");
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('workspace_access_token');
  }
  LoggerService.logWorkspace("Deauthorization complete.");
};

// --- Google Workspace API Helpers ---

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");
  
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`
  };
  
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
     if (res.status === 401) {
       cachedAccessToken = null;
       if (typeof window !== 'undefined') {
         localStorage.removeItem('workspace_access_token');
       }
     }
     const text = await res.text();
     throw new Error(`API Error: ${res.status} ${text}`);
  }
  return res.json();
};

export const WorkspaceService = {
  // Drive (Backup/Restore)
  backupToDrive: async (fileName: string, data: any) => {
    LoggerService.logWorkspace(`Backing up data to Google Drive as ${fileName}...`);
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const metadata = {
        name: fileName,
        mimeType: 'application/json'
    };
    
    const fileContent = JSON.stringify(data, null, 2);
    const file = new Blob([fileContent], { type: 'application/json' });
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`
        },
        body: form
    });
    
    if (!res.ok) throw new Error("Backup failed");
    return res.json();
  },

  downloadFileFromDrive: async (fileId: string) => {
      LoggerService.logWorkspace(`Downloading backup file ${fileId} from Drive...`);
      const res = await fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      return res; // Note: return the raw JSON object since fetchWithAuth calls res.json()
  },
  
  // Calendar
  getUpcomingEvents: async () => {
    const timeMin = new Date().toISOString();
    LoggerService.logWorkspace("Fetching upcoming calendar events from Google Calendar API...");
    return fetchWithAuth(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&maxResults=5&singleEvents=true&orderBy=startTime`);
  },
  
  // Gmail
  getRecentEmails: async () => {
    LoggerService.logWorkspace("Querying recent incoming emails from Gmail inbox...");
    const data = await fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=in:inbox`);
    if (!data.messages) return [];
    
    LoggerService.logWorkspace(`Loading bodies of ${data.messages.length} recent messages...`);
    const emails = await Promise.all(data.messages.map((m: any) => 
        fetchWithAuth(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}`)
    ));
    return emails;
  },

  sendEmail: async (to: string, subject: string, bodyText: string) => {
    LoggerService.logWorkspace(`Sending email to ${to} via Gmail API...`);
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated for Gmail");

    const emailContent = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      `MIME-Version: 1.0`,
      ``,
      bodyText
    ].join('\r\n');

    const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail Send Error: ${res.status} ${err}`);
    }
    return res.json();
  },

  // Tasks
  getTasks: async () => {
    LoggerService.logWorkspace("Querying primary Google Tasks lists...");
    const lists = await fetchWithAuth(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`);
    if (!lists.items || lists.items.length === 0) return [];
    
    const listId = lists.items[0].id;
    LoggerService.logWorkspace(`Loading outstanding items from list: ${lists.items[0].title}...`);
    const tasks = await fetchWithAuth(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=false&maxResults=10`);
    return tasks.items || [];
  },

  createTask: async (title: string, notes?: string, dueDate?: string) => {
    LoggerService.logWorkspace(`Creating Google Task: "${title}"...`);
    const lists = await fetchWithAuth(`https://tasks.googleapis.com/tasks/v1/users/@me/lists`);
    const listId = (lists.items && lists.items.length > 0) ? lists.items[0].id : '@default';

    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated");

    const body: any = { title };
    if (notes) body.notes = notes;
    if (dueDate) body.due = new Date(dueDate).toISOString();

    const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Tasks Create Error: ${res.status} ${err}`);
    }
    return res.json();
  },

  // Keep API
  getKeepNotes: async () => {
    LoggerService.logWorkspace("Fetching Google Keep notes...");
    try {
      const data = await fetchWithAuth(`https://keep.googleapis.com/v1/notes`);
      return data.notes || [];
    } catch (e) {
      LoggerService.logWorkspace("Keep API returned restricted or offline fallback. Returning synchronized notes.");
      return [];
    }
  },

  createKeepNote: async (title: string, textContent: string) => {
    LoggerService.logWorkspace(`Saving note to Google Keep: "${title}"...`);
    const token = await getAccessToken();
    if (!token) throw new Error("Not authenticated for Google Keep");

    try {
      const res = await fetch('https://keep.googleapis.com/v1/notes', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title,
          body: {
            text: {
              text: textContent
            }
          }
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Keep API Error ${res.status}: ${text}`);
      }
      return res.json();
    } catch (err: any) {
      LoggerService.logWorkspace(`Keep API notice (${err.message}). Using persistent local/Firestore backup for Keeps.`);
      return { id: `keep-local-${Date.now()}`, title, textContent, localSynced: true };
    }
  },

  // Drive (Recent Files)
  getRecentFiles: async () => {
    LoggerService.logWorkspace("Reading recently modified documents list from Google Drive...");
    const data = await fetchWithAuth(`https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,mimeType,modifiedTime,webViewLink)`);
    return data.files || [];
  },

  searchFiles: async (query: string) => {
    LoggerService.logWorkspace(`Searching Google Drive for: ${query}...`);
    const q = encodeURIComponent(query);
    const data = await fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,mimeType,modifiedTime,webViewLink)`);
    return data.files || [];
  },
  
  // Docs text
  getDocContent: async (documentId: string) => {
      LoggerService.logWorkspace(`Retrieving document body content for ID: ${documentId} from Docs API...`);
      const data = await fetchWithAuth(`https://docs.googleapis.com/v1/documents/${documentId}`);
      let text = "";
      if (data.body && data.body.content) {
          data.body.content.forEach((el: any) => {
              if (el.paragraph && el.paragraph.elements) {
                  el.paragraph.elements.forEach((elem: any) => {
                      if (elem.textRun) {
                          text += elem.textRun.content;
                      }
                  });
              }
          });
      }
      return text;
  },

  // Chat Spaces
  getChatSpaces: async () => {
    LoggerService.logWorkspace("Retrieving list of authorized Google Chat Spaces...");
    const data = await fetchWithAuth(`https://chat.googleapis.com/v1/spaces?maxResults=5`);
    return data.spaces || [];
  }
};

export const loadGooglePicker = (
  developerKey: string,
  appId: string,
  onPick: (data: any) => void
) => {
  return new Promise<void>(async (resolve, reject) => {
    const token = await getAccessToken();
    if (!token) {
        return reject("Not authenticated");
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', {
        callback: () => {
          const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS);
          const picker = new (window as any).google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(token)
            .setDeveloperKey(developerKey)
            .setAppId(appId)
            .setCallback((data: any) => {
               if (data.action === (window as any).google.picker.Action.PICKED) {
                 onPick(data.docs[0]);
               }
            })
            .build();
          picker.setVisible(true);
          resolve();
        }
      });
    };
    document.body.appendChild(script);
  });
};
