import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HubWorkflowSummary } from '@comfyorg/ingest-types'

import { useWorkflowTemplatesStore } from './workflowTemplatesStore'

// Mock isCloud — default to true for hub tests
let mockIsCloud = true
vi.mock('@/platform/distribution/types', () => ({
  get isCloud() {
    return mockIsCloud
  }
}))

// Mock i18n
vi.mock('@/i18n', () => ({
  i18n: { global: { locale: { value: 'en' } } },
  st: (_key: string, fallback: string) => fallback
}))

// Mock API
const mockListAllHubWorkflows = vi.fn()
const mockGetWorkflowTemplates = vi.fn().mockResolvedValue({})
const mockGetCoreWorkflowTemplates = vi.fn().mockResolvedValue([])
const mockFileURL = vi.fn((path: string) => `mock${path}`)

vi.mock('@/scripts/api', () => ({
  api: {
    listAllHubWorkflows: (...args: unknown[]) =>
      mockListAllHubWorkflows(...args),
    getWorkflowTemplates: (...args: unknown[]) =>
      mockGetWorkflowTemplates(...args),
    getCoreWorkflowTemplates: (...args: unknown[]) =>
      mockGetCoreWorkflowTemplates(...args),
    fileURL: (path: string) => mockFileURL(path)
  }
}))

const makeSummary = (
  overrides?: Partial<HubWorkflowSummary>
): HubWorkflowSummary => ({
  share_id: 'share-1',
  name: 'Test Workflow',
  status: 'approved',
  profile: { username: 'user1' },
  ...overrides
})

describe('workflowTemplatesStore — cloud hub path', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockIsCloud = true
  })

  it('loads templates from hub API on cloud', async () => {
    const summaries: HubWorkflowSummary[] = [
      makeSummary({ share_id: 'a', name: 'Workflow A' }),
      makeSummary({
        share_id: 'b',
        name: 'Workflow B',
        tags: [{ name: 'video', display_name: 'Video' }]
      })
    ]
    mockListAllHubWorkflows.mockResolvedValue(summaries)

    const store = useWorkflowTemplatesStore()
    await store.loadWorkflowTemplates()

    expect(mockListAllHubWorkflows).toHaveBeenCalledOnce()
    expect(mockGetCoreWorkflowTemplates).not.toHaveBeenCalled()
    expect(store.isLoaded).toBe(true)
    expect(store.enhancedTemplates).toHaveLength(2)
  })

  it('adapts HubWorkflowSummary fields correctly', async () => {
    mockListAllHubWorkflows.mockResolvedValue([
      makeSummary({
        share_id: 'abc',
        name: 'My Workflow',
        description: 'A description',
        tags: [{ name: 'img', display_name: 'Image Gen' }],
        models: [{ name: 'flux', display_name: 'Flux' }],
        thumbnail_url: 'https://cdn.example.com/thumb.webp',
        metadata: { vram: 8000, open_source: true }
      })
    ])

    const store = useWorkflowTemplatesStore()
    await store.loadWorkflowTemplates()

    const template = store.enhancedTemplates[0]
    expect(template.name).toBe('abc')
    expect(template.title).toBe('My Workflow')
    expect(template.description).toBe('A description')
    expect(template.tags).toEqual(['Image Gen'])
    expect(template.models).toEqual(['Flux'])
    expect(template.thumbnailUrl).toBe('https://cdn.example.com/thumb.webp')
    expect(template.shareId).toBe('abc')
    expect(template.vram).toBe(8000)
    expect(template.openSource).toBe(true)
  })

  it('getTemplateByShareId finds the correct template', async () => {
    mockListAllHubWorkflows.mockResolvedValue([
      makeSummary({ share_id: 'x1', name: 'First' }),
      makeSummary({ share_id: 'x2', name: 'Second' })
    ])

    const store = useWorkflowTemplatesStore()
    await store.loadWorkflowTemplates()

    expect(store.getTemplateByShareId('x2')?.title).toBe('Second')
    expect(store.getTemplateByShareId('nonexistent')).toBeUndefined()
  })

  it('registers hub template names in knownTemplateNames', async () => {
    mockListAllHubWorkflows.mockResolvedValue([
      makeSummary({ share_id: 'id1' }),
      makeSummary({ share_id: 'id2' })
    ])

    const store = useWorkflowTemplatesStore()
    await store.loadWorkflowTemplates()

    expect(store.knownTemplateNames.has('id1')).toBe(true)
    expect(store.knownTemplateNames.has('id2')).toBe(true)
  })

  it('handles API errors gracefully', async () => {
    mockListAllHubWorkflows.mockRejectedValue(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = useWorkflowTemplatesStore()
    await store.loadWorkflowTemplates()

    expect(store.isLoaded).toBe(false)
    expect(store.enhancedTemplates).toHaveLength(0)
    consoleSpy.mockRestore()
  })
})

describe('workflowTemplatesStore — local static path', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockIsCloud = false
  })

  it('loads templates from static files on local', async () => {
    mockGetCoreWorkflowTemplates.mockResolvedValue([
      {
        moduleName: 'default',
        title: 'Default',
        templates: [
          {
            name: 'local-template',
            mediaType: 'image',
            mediaSubtype: 'webp',
            description: 'A local template'
          }
        ]
      }
    ])

    const store = useWorkflowTemplatesStore()
    await store.loadWorkflowTemplates()

    expect(mockListAllHubWorkflows).not.toHaveBeenCalled()
    expect(mockGetCoreWorkflowTemplates).toHaveBeenCalled()
    expect(store.isLoaded).toBe(true)
    expect(store.enhancedTemplates).toHaveLength(1)
    expect(store.enhancedTemplates[0].name).toBe('local-template')
  })
})
