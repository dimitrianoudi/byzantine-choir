export type ManagedMember = {
  email: string;
  createdAt: string;
  createdBy: string;
};

export type ManagedMemberManifest = {
  schemaVersion: 1;
  revision: number;
  updatedAt: string;
  members: ManagedMember[];
};

export type StoredManagedMemberManifest = {
  manifest: ManagedMemberManifest;
  etag: string | null;
  source: "s3" | "empty";
};
