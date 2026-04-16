import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import {
  getOrganizationSettings,
  patchOrganizationSettings,
  type OrganizationSettings,
} from '../../api/accountOrganization'
import { customAttributesApi, type CustomAttributeDefinition } from '../../api/customAttributes'
import {
  DEFAULT_JOB_SETUP_FIELDS_BY_SECTION,
  DEFAULT_ENABLED_JOB_SETUP_SECTIONS,
} from '../../constants/jobSetupSections'

function normalize(row: OrganizationSettings): OrganizationSettings {
  const catalogSectionIds = (row.job_setup_catalog || []).map(s => s.id)
  const defaultEnabled = catalogSectionIds.length ? catalogSectionIds : DEFAULT_ENABLED_JOB_SETUP_SECTIONS
  const enabled = Array.isArray(row.enabled_job_setup_sections) && row.enabled_job_setup_sections.length
    ? row.enabled_job_setup_sections
    : defaultEnabled
  const enabledFields: Record<string, string[]> = {}
  for (const section of row.job_setup_catalog || []) {
    const sectionId = section.id
    const defaultFieldIds = section.fields.map(field => field.id)
    const current = row.enabled_job_setup_fields?.[sectionId]
    enabledFields[sectionId] = Array.isArray(current) && current.length ? current : defaultFieldIds
  }
  return { ...row, enabled_job_setup_sections: enabled, enabled_job_setup_fields: enabledFields }
}

export default function JobSetupSectionsSettingsPage() {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>()
  const accountId = accountIdParam ? Number(accountIdParam) : NaN
  const { getToken } = useAuth()
  const { success, error: showError } = useToast()
  const token = getToken()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<OrganizationSettings | null>(null)
  const [jobCustomDefs, setJobCustomDefs] = useState<CustomAttributeDefinition[]>([])
  const [addingForSectionId, setAddingForSectionId] = useState<string | null>(null)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<CustomAttributeDefinition['field_type']>('text')
  const [creatingField, setCreatingField] = useState(false)

  const load = useCallback(async () => {
    if (!token || !Number.isFinite(accountId)) return
    setLoading(true)
    try {
      const row = await getOrganizationSettings(token, accountId)
      const defs = await customAttributesApi.list(token, 'job', accountId)
      setForm(normalize(row))
      setJobCustomDefs(defs)
    } catch (e) {
      showError('Could not load job setup sections', e instanceof Error ? e.message : undefined)
      setForm(null)
    } finally {
      setLoading(false)
    }
  }, [token, accountId, showError])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(() => new Set(form?.enabled_job_setup_sections ?? []), [form?.enabled_job_setup_sections])

  const catalogSections = useMemo(() => form?.job_setup_catalog ?? [], [form?.job_setup_catalog])

  function toggleSection(sectionId: string, enabled: boolean) {
    if (!form) return
    const next = new Set(form.enabled_job_setup_sections)
    if (enabled) next.add(sectionId)
    else next.delete(sectionId)
    const ordered = catalogSections.map(s => s.id).filter(id => next.has(id))
    setForm({
      ...form,
      enabled_job_setup_sections: ordered.length ? ordered : catalogSections.map(s => s.id),
    })
  }

  function toggleField(sectionId: string, fieldId: string, enabled: boolean) {
    if (!form) return
    const section = catalogSections.find(s => s.id === sectionId)
    if (!section) return
    const defaultIds = section.fields.map(f => f.id)
    const currentIds = form.enabled_job_setup_fields?.[sectionId] ?? defaultIds
    const next = new Set(currentIds)
    if (enabled) next.add(fieldId)
    else next.delete(fieldId)
    const customInOrder = [
      ...currentIds.filter(id => id.startsWith('custom:') && next.has(id)),
      ...Array.from(next).filter(id => id.startsWith('custom:') && !currentIds.includes(id)),
    ]
    const ordered = [...defaultIds.filter(id => next.has(id)), ...customInOrder]
    setForm({
      ...form,
      enabled_job_setup_fields: {
        ...form.enabled_job_setup_fields,
        [sectionId]: ordered.length ? ordered : [...defaultIds],
      },
    })
  }

  function slugify(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40)
  }

  async function addCustomField(sectionId: string) {
    if (!token || !form || !newFieldLabel.trim()) return
    const base = slugify(newFieldLabel) || 'custom_field'
    const suffix = Date.now().toString().slice(-6)
    const attributeKey = `${base}_${suffix}`
    setCreatingField(true)
    try {
      const created = await customAttributesApi.create(token, accountId, {
        entity_type: 'job',
        attribute_key: attributeKey,
        label: newFieldLabel.trim(),
        field_type: newFieldType,
      })
      setJobCustomDefs(prev => [...prev, created])
      toggleField(sectionId, `custom:${created.attribute_key}`, true)
      setNewFieldLabel('')
      setNewFieldType('text')
      setAddingForSectionId(null)
      success('Added', 'Custom field added to section.')
    } catch (e) {
      showError('Could not add custom field', e instanceof Error ? e.message : undefined)
    } finally {
      setCreatingField(false)
    }
  }

  async function save() {
    if (!token || !form || !Number.isFinite(accountId)) return
    setSaving(true)
    try {
      const updated = await patchOrganizationSettings(token, accountId, {
        organization: {
          enabled_job_setup_sections: form.enabled_job_setup_sections,
          enabled_job_setup_fields: form.enabled_job_setup_fields,
        },
      })
      setForm(normalize(updated))
      success('Saved', 'Job setup visibility updated.')
    } catch (e) {
      showError('Save failed', e instanceof Error ? e.message : undefined)
    } finally {
      setSaving(false)
    }
  }

  if (!token || !Number.isFinite(accountId)) return null

  return (
    <div className="settings-org-page job-setup-flow-page">
      <div className="job-setup-flow-hero">
        <div>
          <h2 className="job-setup-flow-hero-title">Job Setup Flow</h2>
          <p className="settings-lead job-setup-flow-lead">
        Configure which sections are visible in the job setup wizard. Disabled sections are hidden for this workspace.
          </p>
        </div>
        <button type="button" className="btn-primary btn-primary--inline" disabled={saving} onClick={() => void save()}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {loading || !form ? (
        <div className="esign-pro-loading">Loading…</div>
      ) : (
        <>
          <div className="job-setup-flow-shell">
            <div className="esign-field-block settings-org-field--wide job-setup-flow-shell-card">
              <label className="job-setup-flow-shell-title">Enabled sections</label>
              <p className="settings-field-hint job-setup-flow-shell-hint">
                All 14 sections are available by default. Turn off any section to hide it in job creation and editing.
              </p>
              <div className="job-setup-sections-list">
                {catalogSections.map(section => {
                  const sectionEnabled = selected.has(section.id)
                  const sectionFieldIds = form.enabled_job_setup_fields?.[section.id] ?? section.fields.map(field => field.id)
                  const enabledFields = new Set(
                    sectionFieldIds ??
                      DEFAULT_JOB_SETUP_FIELDS_BY_SECTION[section.id as keyof typeof DEFAULT_JOB_SETUP_FIELDS_BY_SECTION] ??
                      section.fields.map(field => field.id),
                  )
                  const customTokens = sectionFieldIds.filter(id => id.startsWith('custom:'))
                  const visibleCount = sectionFieldIds.filter(id => enabledFields.has(id)).length
                  return (
                    <div key={section.id} className="job-setup-section-card">
                      <div className="job-setup-section-head">
                        <label className="job-setup-section-toggle">
                        <input
                          type="checkbox"
                          checked={sectionEnabled}
                          onChange={e => toggleSection(section.id, e.target.checked)}
                        />
                          <span>{section.label}</span>
                        </label>
                        <div className="job-setup-section-meta">
                          <span className="job-setup-section-pill">
                            {visibleCount}/{sectionFieldIds.length} visible
                          </span>
                          <span className="job-setup-section-pill">{customTokens.length} custom</span>
                        </div>
                      </div>
                      <div className={`job-setup-fields-list${sectionEnabled ? '' : ' is-disabled'}`}>
                        {section.fields.map(field => (
                          <label key={field.id} className="job-setup-field-row">
                            <input
                              type="checkbox"
                              disabled={!sectionEnabled}
                              checked={enabledFields.has(field.id)}
                              onChange={e => toggleField(section.id, field.id, e.target.checked)}
                            />
                            <span>{field.label}</span>
                          </label>
                        ))}
                        {customTokens.map(tokenId => {
                          const key = tokenId.replace(/^custom:/, '')
                          const def = jobCustomDefs.find(d => d.attribute_key === key)
                          return (
                            <label key={tokenId} className="job-setup-field-row job-setup-field-row--custom">
                              <input
                                type="checkbox"
                                disabled={!sectionEnabled}
                                checked={enabledFields.has(tokenId)}
                                onChange={e => toggleField(section.id, tokenId, e.target.checked)}
                              />
                              <span>{def ? `${def.label} (custom)` : `${key} (custom)`}</span>
                            </label>
                          )
                        })}
                        {addingForSectionId === section.id ? (
                          <div className="job-setup-add-panel">
                            <input
                              className="esign-pro-input"
                              placeholder="Custom field label"
                              value={newFieldLabel}
                              onChange={e => setNewFieldLabel(e.target.value)}
                            />
                            <select
                              className="esign-pro-input"
                              value={newFieldType}
                              onChange={e => setNewFieldType(e.target.value as CustomAttributeDefinition['field_type'])}
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="decimal">Decimal</option>
                              <option value="boolean">Boolean</option>
                              <option value="date">Date</option>
                              <option value="list">List</option>
                            </select>
                            <div className="job-setup-add-panel-actions">
                              <button type="button" className="btn-primary btn-primary--inline" disabled={creatingField} onClick={() => void addCustomField(section.id)}>
                                {creatingField ? 'Adding…' : 'Add custom field'}
                              </button>
                              <button type="button" className="btn-secondary btn-secondary--inline" onClick={() => setAddingForSectionId(null)}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-secondary btn-secondary--inline job-setup-add-btn"
                            disabled={!sectionEnabled}
                            onClick={() => setAddingForSectionId(section.id)}
                          >
                            + Add new custom field
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
