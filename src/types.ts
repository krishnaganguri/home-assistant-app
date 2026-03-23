import { User as FirebaseUser } from 'firebase/auth';

export type User = FirebaseUser;

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  homeHealthScore: number;
  lastCalculated: string;
}

export interface Appliance {
  id: string;
  uid: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  manualUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface MaintenanceTask {
  id: string;
  uid: string;
  applianceId: string;
  title: string;
  description: string;
  instructions: string;
  dueDate: string;
  completedAt?: string;
  status: 'pending' | 'completed' | 'overdue';
  intervalMonths: number;
}
