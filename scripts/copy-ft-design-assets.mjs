import { promises as fs } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceDir = path.join(projectRoot, 'node_modules', 'ft-design-system', 'dist', 'assets')
const targetDir = path.join(projectRoot, 'public', 'assets')

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function copyAssets() {
  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true })
    await ensureDir(targetDir)

    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const src = path.join(sourceDir, entry.name)
          const dest = path.join(targetDir, entry.name)
          await fs.copyFile(src, dest)
        })
    )
    console.log('[copy-ft-design-assets] Copied assets to public/assets')
  } catch (error) {
    console.warn('[copy-ft-design-assets] Skipped:', error?.message || error)
  }
}

copyAssets()
