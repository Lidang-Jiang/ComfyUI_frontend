import { expect } from '@playwright/test'

import { comfyPageFixture as test } from '../fixtures/ComfyPage'

/**
 * Regression tests for the template dialog hub API migration.
 *
 * These tests verify that the template dialog continues to work correctly
 * after migrating the data source from static index.json to the hub API
 * on cloud, and that local behavior is unaffected.
 */
test.describe(
  'Template Hub Migration — Regression',
  { tag: ['@slow', '@workflow'] },
  () => {
    test.beforeEach(async ({ comfyPage }) => {
      await comfyPage.settings.setSetting('Comfy.UseNewMenu', 'Top')
    })

    test('template dialog opens and shows cards', async ({ comfyPage }) => {
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()
      await comfyPage.templates.expectMinimumCardCount(1)
    })

    test('template dialog has filter controls', async ({ comfyPage }) => {
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()

      const dialog = comfyPage.page.getByRole('dialog')

      // Sort control should be present
      const sortBySelect = dialog.getByRole('combobox', { name: /Sort/ })
      await expect(sortBySelect).toBeVisible()

      // Search input should be present
      const searchInput = dialog.getByRole('searchbox')
      await expect(searchInput).toBeVisible()
    })

    test('search filters templates', async ({ comfyPage }) => {
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()
      await comfyPage.templates.expectMinimumCardCount(1)

      const dialog = comfyPage.page.getByRole('dialog')
      const searchInput = dialog.getByRole('searchbox')

      // Count templates before search
      const beforeCount = await comfyPage.templates.allTemplateCards.count()

      // Search for something very specific that should narrow results
      await searchInput.fill('zzz_nonexistent_template_xyz')
      // Wait for debounce
      await comfyPage.page.waitForTimeout(300)

      // Should have fewer (or zero) results
      const afterCount = await comfyPage.templates.allTemplateCards.count()
      expect(afterCount).toBeLessThan(beforeCount)

      // Clear search should restore results
      await searchInput.clear()
      await comfyPage.page.waitForTimeout(300)

      await comfyPage.templates.expectMinimumCardCount(1)
    })

    test('loading a template populates the graph', async ({ comfyPage }) => {
      // Start with empty canvas
      await comfyPage.menu.workflowsTab.open()
      await comfyPage.command.executeCommand('Comfy.NewBlankWorkflow')
      await expect(async () => {
        expect(await comfyPage.nodeOps.getGraphNodesCount()).toBe(0)
      }).toPass({ timeout: 250 })

      // Open dialog and load a template
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()
      await comfyPage.templates.expectMinimumCardCount(1)

      // Click the first template card
      const firstCard = comfyPage.templates.allTemplateCards.first()
      await firstCard.scrollIntoViewIfNeeded()
      await firstCard.getByRole('img').click()

      // Dialog should close
      await expect(comfyPage.templates.content).toBeHidden()

      // Graph should have nodes
      await expect(async () => {
        expect(await comfyPage.nodeOps.getGraphNodesCount()).toBeGreaterThan(0)
      }).toPass({ timeout: 5000 })
    })

    test('navigation categories are visible', async ({ comfyPage }) => {
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()

      const dialog = comfyPage.page.getByRole('dialog')

      // "All Templates" nav item should always be present
      await expect(
        dialog.getByRole('button', { name: /All Templates/i })
      ).toBeVisible()
    })

    test('closing and reopening dialog preserves functionality', async ({
      comfyPage
    }) => {
      // Open
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()
      await comfyPage.templates.expectMinimumCardCount(1)

      // Close via X button
      const closeButton = comfyPage.page
        .getByRole('dialog')
        .getByRole('button', { name: /close/i })
      await closeButton.click()
      await expect(comfyPage.templates.content).toBeHidden()

      // Reopen
      await comfyPage.command.executeCommand('Comfy.BrowseTemplates')
      await expect(comfyPage.templates.content).toBeVisible()
      await comfyPage.templates.expectMinimumCardCount(1)
    })
  }
)
