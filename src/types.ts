export interface Patient {
  id: string;
  dentistId: string;
  name: string;
  dob?: string;
  phone?: string;
  email?: string;
  profession?: string;
  maritalStatus?: string;
  cpf?: string;
  rg?: string;
  issuingBody?: string;
  sex?: string;
  nationality?: string;
  placeOfBirth?: string;
  legalRepDetails?: string; // JSON string
  spouseDetails?: string; // JSON string
  referenceDoctor?: string; // JSON string
  mainComplaint?: string; // JSON string
  allergies?: string;
  previousDentist?: string; // JSON string
  appointmentPreference?: string; // JSON string
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  source?: string;
  status?: 'Ativo' | 'Inativo' | 'Em Tratamento';
  tcleStatus?: 'nao_impresso' | 'nao_assinado' | 'assinado';
  tcleSignedAt?: string;
  tcleSignatureUrl?: string;
  anamnesis?: string; // JSON string
  odontogram?: string; // JSON string
  treatmentStatus?: 'Planejado' | 'Em Andamento' | 'Concluído';
  treatmentStartDate?: string;
  treatmentEndDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  dentistId: string;
  patientId: string;
  patientName?: string;
  date: string;
  duration?: number;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Finance {
  id: string;
  dentistId: string;
  patientId?: string; // Optional, only for patient-related income
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  paymentMethod?: 'money' | 'card' | 'pix' | 'transfer' | 'other';
  percentages?: string; // JSON string
  createdAt: string;
}

export interface FileRecord {
  id: string;
  dentistId: string;
  patientId: string;
  name: string;
  url: string;
  type: 'extraoral' | 'intraoral' | 'xray' | 'tomography' | 'consent' | 'audio' | 'other';
  uploadedAt: string;
  expiresAt?: string;
}

export interface NotificationSettings {
  id?: string;
  dentistId: string;
  enabled: boolean;
  type: 'sms' | 'email' | 'whatsapp' | 'both' | 'all';
  hoursBefore: number;
  messageTemplate: string;
  updatedAt: string;
}

export interface QuickNote {
  id: string;
  dentistId: string;
  content: string;
  createdAt: string;
}

export interface TrashItem {
  id: string;
  dentistId: string;
  originalCollection: string;
  originalId: string;
  data: any;
  deletedAt: string;
}
