#!/usr/bin/env node
/**
 * Fetch assets from Figma design using Figma MCP
 * This script attempts to get image assets from a Figma design file
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const assetsDir = path.join(projectRoot, 'public', 'assets')

// Figma file information
const FIGMA_FILE_KEY = 'UrgiE4l2RIBbZi5XO6kwBV'
const FIGMA_NODE_ID = '1:25256'
const FIGMA_URL = `https://www.figma.com/design/${FIGMA_FILE_KEY}/Log-In?node-id=1-25256`

// Assets we need to download
const REQUIRED_ASSETS = [
  {
    name: 'google-icon.png',
    description: 'Google icon for sign-in button',
    originalAssetId: '13062fc2-c406-4ddd-8549-63779e808e07'
  },
  {
    name: 'microsoft-logo.png',
    description: 'Microsoft logo for sign-in button',
    originalAssetId: '04ddcc59-4e7d-4aa6-b48e-228144fdee86'
  },
  {
    name: 'product-showcase.png',
    description: 'Product showcase image for carousel slides',
    originalAssetId: '6ba08004-7545-4ac5-b376-0d7edaf671f7'
  }
]

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function downloadAsset(url, filePath) {
  try {
    console.log(`Downloading ${path.basename(filePath)}...`)
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    await fs.writeFile(filePath, Buffer.from(buffer))
    console.log(`✓ Saved: ${filePath}`)
    return true
  } catch (error) {
    console.error(`✗ Failed to download ${path.basename(filePath)}:`, error.message)
    return false
  }
}

async function main() {
  console.log('Figma Assets Fetcher')
  console.log('====================')
  console.log(`Figma URL: ${FIGMA_URL}`)
  console.log(`Target directory: ${assetsDir}`)
  console.log('')

  await ensureDir(assetsDir)

  console.log('NOTE: This script requires manual export from Figma.')
  console.log('The Figma MCP tools provide image descriptions but not direct download URLs.')
  console.log('')
  console.log('To get the assets:')
  console.log('1. Open the Figma design:', FIGMA_URL)
  console.log('2. For each asset:')
  console.log('   - Select the image/component in Figma')
  console.log('   - Right-click → Export or use Export panel')
  console.log('   - Choose format (SVG for icons, PNG for images)')
  console.log('   - Save to:', assetsDir)
  console.log('')
  console.log('Required assets:')
  REQUIRED_ASSETS.forEach((asset, index) => {
    console.log(`  ${index + 1}. ${asset.name} - ${asset.description}`)
  })
  console.log('')
  console.log('After exporting, the images will be automatically used by LoginPage.tsx')
  console.log('')

  // Check if assets already exist
  const existingAssets = []
  for (const asset of REQUIRED_ASSETS) {
    const filePath = path.join(assetsDir, asset.name)
    try {
      await fs.access(filePath)
      existingAssets.push(asset.name)
      console.log(`✓ Found existing: ${asset.name}`)
    } catch {
      console.log(`✗ Missing: ${asset.name}`)
    }
  }

  if (existingAssets.length === REQUIRED_ASSETS.length) {
    console.log('')
    console.log('All assets are present! ✓')
  } else {
    console.log('')
    console.log(`Please export ${REQUIRED_ASSETS.length - existingAssets.length} missing asset(s) from Figma.`)
  }
}

main().catch(console.error)
