export const API_VERSION = 'v1'
export const BASE_URL = `/api/${API_VERSION}`

const endpoints = {
  auth: {
    login:   `${BASE_URL}/auth/login`,
    refresh: `${BASE_URL}/auth/refresh`,
  },

  profile: {
    show: `${BASE_URL}/profile`,
  },

  jobs: {
    list:     `${BASE_URL}/jobs`,
    create:   `${BASE_URL}/jobs`,
    show:     (id: number) => `${BASE_URL}/jobs/${id}`,
    update:   (id: number) => `${BASE_URL}/jobs/${id}`,
    destroy:  (id: number) => `${BASE_URL}/jobs/${id}`,
    versions: {
      list:   (jobId: number) => `${BASE_URL}/jobs/${jobId}/versions`,
      create: (jobId: number) => `${BASE_URL}/jobs/${jobId}/versions`,
    },
  },

  jobBoards: {
    list:    `${BASE_URL}/job-boards`,
    create:  `${BASE_URL}/job-boards`,
    show:    (id: number) => `${BASE_URL}/job-boards/${id}`,
    update:  (id: number) => `${BASE_URL}/job-boards/${id}`,
    destroy: (id: number) => `${BASE_URL}/job-boards/${id}`,
  },

  postings: {
    list:    `${BASE_URL}/postings`,
    create:  `${BASE_URL}/postings`,
    show:    (id: number) => `${BASE_URL}/postings/${id}`,
    update:  (id: number) => `${BASE_URL}/postings/${id}`,
    destroy: (id: number) => `${BASE_URL}/postings/${id}`,
  },

  applications: {
    list:        `${BASE_URL}/applications`,
    create:      `${BASE_URL}/applications`,
    show:        (id: number) => `${BASE_URL}/applications/${id}`,
    destroy:     (id: number) => `${BASE_URL}/applications/${id}`,
    updateStage: (id: number) => `${BASE_URL}/applications/${id}/stage`,
  },
} as const

export default endpoints
