const BASE = '/api/v1'

export interface AppearanceSettings {
  font_preset: string
  font_family_css: string
  heading_font_preset: string
  heading_font_family_css: string
  body_font_preset: string
  body_font_family_css: string
  mono_font_preset: string
  mono_font_family_css: string
  ui_font_preset: string
  ui_font_family_css: string
  content_font_preset: string
  content_font_family_css: string
  font_size_px: number
  line_height: number
  letter_spacing_em: number
  font_scale_preset: 'compact' | 'comfortable' | 'spacious'
  weight_regular: number
  weight_medium: number
  weight_bold: number
  readability_mode: boolean
  high_contrast_mode: boolean
}

async function readApiJson(res: Response): Promise<{ success?: boolean; data?: unknown; error?: string }> {
  return (await res.json()) as { success?: boolean; data?: unknown; error?: string }
}

async function req<T>(path: string, token: string, accountId?: number | string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  }
  if (accountId !== undefined && accountId !== null && String(accountId).trim() !== '') {
    headers['X-Account-Id'] = String(accountId)
  }
  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...options,
  })
  const json = await readApiJson(res)
  if (!json.success) throw new Error(json.error || 'Request failed')
  return json.data as T
}

export function getAppearanceSettings(token: string, accountId?: number | string) {
  return req<AppearanceSettings>('/account/appearance_settings', token, accountId)
}

export function patchAppearanceSettings(token: string, accountId: number | string | undefined, body: Partial<AppearanceSettings>) {
  return req<AppearanceSettings>('/account/appearance_settings', token, accountId, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
