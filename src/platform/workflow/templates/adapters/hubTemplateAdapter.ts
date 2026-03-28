import type { HubWorkflowSummary } from '@comfyorg/ingest-types'

import type { TemplateInfo, WorkflowTemplates } from '../types/template'

/**
 * Maps a hub thumbnail_type to the frontend thumbnailVariant.
 */
function mapThumbnailVariant(
  thumbnailType?: 'image' | 'video' | 'image_comparison'
): string | undefined {
  switch (thumbnailType) {
    case 'image_comparison':
      return 'compareSlider'
    default:
      return undefined
  }
}

/**
 * Extracts a typed numeric value from the hub metadata object.
 */
function getMetadataNumber(
  metadata: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  const value = metadata?.[key]
  return typeof value === 'number' ? value : undefined
}

/**
 * Extracts a typed boolean value from the hub metadata object.
 */
function getMetadataBoolean(
  metadata: Record<string, unknown> | undefined,
  key: string
): boolean | undefined {
  const value = metadata?.[key]
  return typeof value === 'boolean' ? value : undefined
}

/**
 * Derives mediaType and mediaSubtype from the hub thumbnail_type.
 */
function mapMediaType(thumbnailType?: 'image' | 'video' | 'image_comparison'): {
  mediaType: string
  mediaSubtype: string
} {
  if (thumbnailType === 'video') {
    return { mediaType: 'video', mediaSubtype: 'mp4' }
  }
  return { mediaType: 'image', mediaSubtype: 'webp' }
}

/**
 * Converts a hub workflow summary to a TemplateInfo compatible with
 * the existing template dialog infrastructure.
 */
export function adaptHubWorkflowToTemplate(
  summary: HubWorkflowSummary
): TemplateInfo {
  const { mediaType, mediaSubtype } = mapMediaType(summary.thumbnail_type)
  return {
    name: summary.share_id,
    title: summary.name,
    description: summary.description ?? '',
    mediaType,
    mediaSubtype,
    thumbnailVariant: mapThumbnailVariant(summary.thumbnail_type),
    tags: summary.tags?.map((t) => t.display_name),
    models: summary.models?.map((m) => m.display_name),
    requiresCustomNodes: summary.custom_nodes?.map((cn) => cn.name),
    thumbnailUrl: summary.thumbnail_url,
    thumbnailComparisonUrl: summary.thumbnail_comparison_url,
    shareId: summary.share_id,
    profile: summary.profile,
    tutorialUrl: summary.tutorial_url,
    date: summary.publish_time ?? undefined,
    vram: getMetadataNumber(summary.metadata, 'vram'),
    size: getMetadataNumber(summary.metadata, 'size'),
    openSource: getMetadataBoolean(summary.metadata, 'open_source')
  }
}

/**
 * Wraps adapted hub workflows into the WorkflowTemplates[] structure
 * expected by the store. Returns a single category containing all templates.
 */
export function adaptHubWorkflowsToCategories(
  summaries: HubWorkflowSummary[],
  title: string = 'All'
): WorkflowTemplates[] {
  return [
    {
      moduleName: 'hub',
      title,
      templates: summaries.map(adaptHubWorkflowToTemplate)
    }
  ]
}
