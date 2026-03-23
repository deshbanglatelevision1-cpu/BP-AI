export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'model' | 'system';
  content: string;
  createdAt: string;
  attachment?: {
    name: string;
    type: string;
    size: number;
    url?: string;
  };
  videoUrl?: string;
}

export interface Document {
  id: string;
  userId: string;
  title: string;
  type: 'word' | 'excel' | 'ppt' | 'photoshop';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type AIMode = 'chat' | 'image' | 'voice' | 'video' | 'translate' | 'math' | 'document' | 'research';
export type AppTab = 'search' | 'chat' | 'browser' | 'productivity' | 'architecture' | 'tools' | 'settings' | 'automation';
