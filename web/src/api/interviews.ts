const BASE = '/api/v1'

export interface InterviewAssignmentRow {
  id: number
  account_id: number
  application_id: number
  interview_plan_id: number
  interviewer_id: number | null
  status: string
  scheduled_at: string | null
  interview_ends_at: string | null
  calendar_event_url: string | null
  scorecard_reminder_sent_at?: string | null
  created_at: string
  updated_at: string
  is_open_slot?: boolean
  interview_plan?: { id: number; name: string; pipeline_stage_id: number | null; position: number } | null
  application?: {
    id: number
    candidate_id: number | null
    candidate_name: string | null
    candidate_email: string | null
    job_id: number
  } | null
  job?: { id: number; title: string } | null
}

export interface MyAssignmentsMeta {
  total: number
  page: number
  per_page: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface ScorecardCriterion {
  name: string
  scale_max: number
  required: boolean
}

export interface InterviewKitPayload {
  assignment: InterviewAssignmentRow
  interview_plan: { id: number; name: string; pipeline_stage_id: number | null; position: number }
  kit: {
    focus_area: string | null
    instructions: string | null
    questions: unknown[]
  } | null
  candidate: Record<string, unknown> | null
  job: Record<string, unknown> | null
  application: Record<string, unknown>
  scorecard_criteria?: ScorecardCriterion[]
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export type MyAssignmentsParams = {
  status?: string
  q?: string
  include_open?: boolean
  page?: number
  per_page?: number
}

export const interviewsApi = {
  myAssignments: async (
    token: string,
    params?: MyAssignmentsParams,
  ): Promise<{ entries: InterviewAssignmentRow[]; meta: MyAssignmentsMeta }> => {
    const p = new URLSearchParams()
    if (params?.status) p.set('status', params.status)
    if (params?.q?.trim()) p.set('q', params.q.trim())
    if (params?.include_open === false) p.set('include_open', 'false')
    if (params?.page) p.set('page', String(params.page))
    if (params?.per_page) p.set('per_page', String(params.per_page))
    const qs = p.toString()
    const res = await fetch(`${BASE}/interviews/my_assignments${qs ? `?${qs}` : ''}`, {
      headers: authHeaders(token),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Request failed')
    return {
      entries: json.data as InterviewAssignmentRow[],
      meta: json.meta as MyAssignmentsMeta,
    }
  },

  claim: async (token: string, assignmentId: number): Promise<InterviewAssignmentRow> => {
    const res = await fetch(`${BASE}/interviews/${assignmentId}/claim`, {
      method: 'POST',
      headers: authHeaders(token),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Request failed')
    return json.data as InterviewAssignmentRow
  },

  getKit: async (token: string, assignmentId: number): Promise<InterviewKitPayload> => {
    const res = await fetch(`${BASE}/interviews/${assignmentId}/kit`, { headers: authHeaders(token) })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Request failed')
    return json.data as InterviewKitPayload
  },

  submitScorecard: async (
    token: string,
    assignmentId: number,
    data: {
      overall_recommendation: string
      criteria_scores?: Record<string, number | string>
      scores?: Record<string, number | string>
      notes?: string | null
      pros?: string | null
      cons?: string | null
      internal_notes?: string | null
    },
  ): Promise<Record<string, unknown>> => {
    const res = await fetch(`${BASE}/interviews/${assignmentId}/scorecard`, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Request failed')
    return json.data as Record<string, unknown>
  },

  updateAssignment: async (
    token: string,
    assignmentId: number,
    data: Partial<{
      interviewer_id: number | null
      status: string
      scheduled_at: string | null
      interview_ends_at: string | null
      calendar_event_url: string | null
    }>,
  ): Promise<InterviewAssignmentRow> => {
    const res = await fetch(`${BASE}/interviews/${assignmentId}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Request failed')
    return json.data as InterviewAssignmentRow
  },
}
