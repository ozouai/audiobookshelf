const Path = require('path')
const fs = require('../libs/fsExtra')
const stream = require('stream')
const Logger = require('../Logger')
const { resizeImage } = require('../utils/ffmpegHelpers')

class CacheManager {
  constructor() {
    this.CachePath = null
    this.CoverCachePath = null
    this.ImageCachePath = null
    this.ItemCachePath = null
  }

  /**
   * Create cache directory paths if they dont exist
   */
  async ensureCachePaths() { // Creates cache paths if necessary and sets owner and permissions
    this.CachePath = Path.join(global.MetadataPath, 'cache')
    this.CoverCachePath = Path.join(this.CachePath, 'covers')
    this.ImageCachePath = Path.join(this.CachePath, 'images')
    this.ItemCachePath = Path.join(this.CachePath, 'items')

    if (!(await fs.pathExists(this.CachePath))) {
      await fs.mkdir(this.CachePath)
    }

    if (!(await fs.pathExists(this.CoverCachePath))) {
      await fs.mkdir(this.CoverCachePath)
    }

    if (!(await fs.pathExists(this.ImageCachePath))) {
      await fs.mkdir(this.ImageCachePath)
    }

    if (!(await fs.pathExists(this.ItemCachePath))) {
      await fs.mkdir(this.ItemCachePath)
    }
  }

  async handleCoverCache(res, libraryItem, options = {}) {
    const format = options.format || 'webp'
    const width = options.width || 400
    const height = options.height || null

    res.type(`image/${format}`)

    const path = Path.join(this.CoverCachePath, `${libraryItem.id}_${width}${height ? `x${height}` : ''}`) + '.' + format

    // Cache exists
    if (await fs.pathExists(path)) {
      if (global.XAccel) {
        Logger.debug(`Use X-Accel to serve static file ${path}`)
        return res.status(204).header({ 'X-Accel-Redirect': global.XAccel + path }).send()
      }

      const r = fs.createReadStream(path)
      const ps = new stream.PassThrough()
      stream.pipeline(r, ps, (err) => {
        if (err) {
          console.log(err)
          return res.sendStatus(500)
        }
      })
      return ps.pipe(res)
    }

    if (!libraryItem.media.coverPath || !await fs.pathExists(libraryItem.media.coverPath)) {
      return res.sendStatus(500)
    }

    const writtenFile = await resizeImage(libraryItem.media.coverPath, path, width, height)
    if (!writtenFile) return res.sendStatus(500)

    if (global.XAccel) {
      Logger.debug(`Use X-Accel to serve static file ${writtenFile}`)
      return res.status(204).header({ 'X-Accel-Redirect': global.XAccel + writtenFile }).send()
    }

    var readStream = fs.createReadStream(writtenFile)
    readStream.pipe(res)
  }

  purgeCoverCache(libraryItemId) {
    return this.purgeEntityCache(libraryItemId, this.CoverCachePath)
  }

  purgeImageCache(entityId) {
    return this.purgeEntityCache(entityId, this.ImageCachePath)
  }

  async purgeEntityCache(entityId, cachePath) {
    return Promise.all((await fs.readdir(cachePath)).reduce((promises, file) => {
      if (file.startsWith(entityId)) {
        Logger.debug(`[CacheManager] Going to purge ${file}`);
        promises.push(this.removeCache(Path.join(cachePath, file)))
      }
      return promises
    }, []))
  }

  removeCache(path) {
    if (!path) return false
    return fs.pathExists(path).then((exists) => {
      if (!exists) return false
      return fs.unlink(path).then(() => true).catch((err) => {
        Logger.error(`[CacheManager] Failed to remove cache "${path}"`, err)
        return false
      })
    })
  }

  async purgeAll() {
    Logger.info(`[CacheManager] Purging all cache at "${this.CachePath}"`)
    if (await fs.pathExists(this.CachePath)) {
      await fs.remove(this.CachePath).catch((error) => {
        Logger.error(`[CacheManager] Failed to remove cache dir "${this.CachePath}"`, error)
      })
    }
    await this.ensureCachePaths()
  }

  async purgeItems() {
    Logger.info(`[CacheManager] Purging items cache at "${this.ItemCachePath}"`)
    if (await fs.pathExists(this.ItemCachePath)) {
      await fs.remove(this.ItemCachePath).catch((error) => {
        Logger.error(`[CacheManager] Failed to remove items cache dir "${this.ItemCachePath}"`, error)
      })
    }
    await this.ensureCachePaths()
  }

  async handleAuthorCache(res, author, options = {}) {
    const format = options.format || 'webp'
    const width = options.width || 400
    const height = options.height || null

    res.type(`image/${format}`)

    var path = Path.join(this.ImageCachePath, `${author.id}_${width}${height ? `x${height}` : ''}`) + '.' + format

    // Cache exists
    if (await fs.pathExists(path)) {
      const r = fs.createReadStream(path)
      const ps = new stream.PassThrough()
      stream.pipeline(r, ps, (err) => {
        if (err) {
          console.log(err)
          return res.sendStatus(500)
        }
      })
      return ps.pipe(res)
    }

    let writtenFile = await resizeImage(author.imagePath, path, width, height)
    if (!writtenFile) return res.sendStatus(500)

    var readStream = fs.createReadStream(writtenFile)
    readStream.pipe(res)
  }
}
module.exports = new CacheManager()