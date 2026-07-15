import { useEffect, useMemo, useState } from 'react';
import type {
  DocumentEntityType,
  DocumentRecord,
  Employee,
  Invoice,
  Lead,
  Project,
} from '@construction-crm/shared-types';
import { Button } from '../../components/Button';
import {
  completeDocumentUpload,
  createDocumentUpload,
  deleteDocument,
  getDocumentBlob,
  listDocuments,
  listEmployees,
  listInvoices,
  listLeads,
  listProjects,
  uploadDocumentBinary,
} from '../../lib/api';
import { useSessionStore } from '../../lib/sessionStore';

const ENTITY_LABELS: Record<DocumentEntityType, string> = {
  lead: 'Lead',
  project: 'Project',
  employee: 'Employee',
  invoice: 'Invoice',
};

function isPreviewable(mimeType: string) {
  return mimeType === 'application/pdf' || mimeType.startsWith('image/');
}

export function DocumentsPage() {
  const { user } = useSessionStore();
  const canManage = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager' || user?.role === 'accountant';

  const [entityType, setEntityType] = useState<DocumentEntityType>('project');
  const [entityId, setEntityId] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const entityOptions = useMemo(() => {
    switch (entityType) {
      case 'lead':
        return leads.map((lead) => ({ id: lead.id, label: `${lead.clientName} - ${lead.contactPhone}` }));
      case 'project':
        return projects.map((project) => ({ id: project.id, label: `${project.name} - ${project.clientName}` }));
      case 'employee':
        return employees.map((employee) => ({ id: employee.id, label: `${employee.name} - ${employee.jobTitle}` }));
      case 'invoice':
        return invoices.map((invoice) => ({ id: invoice.id, label: `${invoice.invoiceNumber} - ${invoice.clientName}` }));
      default:
        return [];
    }
  }, [employees, entityType, invoices, leads, projects]);

  async function refreshDocuments(nextEntityId = entityId) {
    setLoading(true);
    setError('');
    try {
      const response = await listDocuments({
        entityType,
        entityId: nextEntityId || undefined,
      });
      setDocuments(response.documents);
      if (selectedDocument) {
        const match = response.documents.find((document) => document.id === selectedDocument.id) ?? null;
        setSelectedDocument(match);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.all([
      listLeads({ pageSize: 100 }),
      listProjects({ pageSize: 100 }),
      listEmployees({ pageSize: 100 }),
      listInvoices({ pageSize: 100 }),
    ]).then(([leadResponse, projectResponse, employeeResponse, invoiceResponse]) => {
      setLeads(leadResponse.leads);
      setProjects(projectResponse.projects);
      setEmployees(employeeResponse.employees);
      setInvoices(invoiceResponse.invoices);
      setEntityId(projectResponse.projects[0]?.id ?? leadResponse.leads[0]?.id ?? '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const firstId = entityOptions[0]?.id ?? '';
    if (!entityOptions.some((option) => option.id === entityId)) {
      setEntityId(firstId);
      void refreshDocuments(firstId);
      return;
    }
    void refreshDocuments(entityId);
  }, [entityId, entityOptions, entityType]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function openPreview(document: DocumentRecord) {
    setSelectedDocument(document);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!isPreviewable(document.mimeType)) {
      setPreviewUrl('');
      return;
    }

    try {
      const blob = await getDocumentBlob(document.id);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    }
  }

  async function handleUpload() {
    if (!file || !entityId) {
      setError('Choose an entity and a file first');
      return;
    }

    setUploading(true);
    setError('');
    setMessage('');
    try {
      const uploadSession = await createDocumentUpload({
        entityType,
        entityId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
      });
      await uploadDocumentBinary(uploadSession.upload.url, uploadSession.upload.headers, file);
      const completed = await completeDocumentUpload(uploadSession.document.id);
      setMessage(`Uploaded ${completed.document.fileName}`);
      setFile(null);
      await refreshDocuments(entityId);
      await openPreview(completed.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(document: DocumentRecord) {
    if (!window.confirm(`Remove "${document.fileName}"?`)) return;
    try {
      await deleteDocument(document.id);
      if (selectedDocument?.id === document.id) {
        setSelectedDocument(null);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl('');
      }
      await refreshDocuments(entityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document');
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="rounded-3xl border border-sc-border bg-sc-panel p-5 shadow-sc-panel">
          <p className="text-xs uppercase tracking-[0.22em] text-sc-muted">Phase 8</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-sc-bright">Documents</h1>
          <p className="mt-2 text-sm text-sc-muted">Attach PDFs and images to leads, projects, employees, and invoices from one workspace.</p>

          <div className="mt-6 space-y-4 rounded-2xl border border-sc-border bg-sc-surface p-4">
            <label className="block text-xs text-sc-muted">
              Entity type
              <select
                value={entityType}
                onChange={(event) => setEntityType(event.target.value as DocumentEntityType)}
                className="mt-1 w-full rounded-xl border border-sc-border bg-sc-panel px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
              >
                {Object.entries(ENTITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-sc-muted">
              Linked record
              <select
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-sc-border bg-sc-panel px-3 py-2 text-sm text-sc-text outline-none focus:border-sc-amber"
              >
                <option value="">Select a record</option>
                {entityOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-sc-muted">
              File
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="mt-1 block w-full rounded-xl border border-sc-border bg-sc-panel px-3 py-2 text-sm text-sc-text"
                disabled={!canManage}
              />
            </label>

            <Button variant="primary" size="sm" onClick={() => void handleUpload()} disabled={!canManage || uploading || !file || !entityId}>
              {uploading ? 'Uploading...' : 'Upload Document'}
            </Button>
          </div>

          {message && <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</div>}
          {error && <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
        </div>

        <div className="rounded-3xl border border-sc-border bg-sc-panel p-5 shadow-sc-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-sc-bright">Attachment Register</h2>
              <p className="mt-1 text-sm text-sc-muted">Review uploaded files and open inline previews for PDFs and images.</p>
            </div>
            <span className="rounded-2xl border border-sc-border bg-sc-surface px-4 py-3 text-sm text-sc-muted">
              {documents.length} file{documents.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-sc-border">
            <table className="w-full text-sm">
              <thead className="bg-sc-surface text-left text-[11px] uppercase tracking-[0.18em] text-sc-muted">
                <tr>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-sc-border">
                {loading ? (
                  [...Array(4)].map((_, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4" colSpan={5}>
                        <div className="h-10 animate-pulse rounded-xl bg-sc-surface" />
                      </td>
                    </tr>
                  ))
                ) : documents.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-sm text-sc-muted" colSpan={5}>
                      No documents linked to this record yet.
                    </td>
                  </tr>
                ) : (
                  documents.map((document) => (
                    <tr key={document.id} className="hover:bg-sc-surface/50">
                      <td className="px-4 py-4">
                        <button className="text-left" onClick={() => void openPreview(document)}>
                          <p className="font-medium text-sc-bright">{document.fileName}</p>
                          <p className="text-xs text-sc-muted">{ENTITY_LABELS[document.entityType]}</p>
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sc-sub">{document.mimeType}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${document.uploadedAt ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
                          {document.uploadedAt ? 'Ready' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sc-sub">{new Date(document.createdAt).toLocaleDateString('en-PK')}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => void openPreview(document)}>
                            Preview
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => void handleDelete(document)} disabled={!canManage}>
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-sc-border bg-sc-panel p-4 shadow-sc-panel">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-sc-bright">Preview</h2>
            <p className="mt-1 text-sm text-sc-muted">PDFs and images open inline. Other file types can still be downloaded from the browser preview prompt.</p>
          </div>
        </div>

        {selectedDocument && previewUrl && selectedDocument.mimeType.startsWith('image/') ? (
          <div className="grid min-h-[320px] place-items-center rounded-2xl border border-sc-border bg-sc-surface p-6">
            <img src={previewUrl} alt={selectedDocument.fileName} className="max-h-[720px] rounded-xl object-contain" />
          </div>
        ) : selectedDocument && previewUrl ? (
          <iframe title="Document preview" src={previewUrl} className="h-[720px] w-full rounded-2xl border border-sc-border bg-white" />
        ) : (
          <div className="grid h-[320px] place-items-center rounded-2xl border border-dashed border-sc-border bg-sc-surface text-sm text-sc-muted">
            Select a document to preview it.
          </div>
        )}
      </section>
    </div>
  );
}
