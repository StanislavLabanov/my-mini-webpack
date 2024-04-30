const config = {} = require('./config')
const { resolve, join } = require('path')
const fs = require('fs-extra')
const cheerio = require('cheerio')
const babel = require('@babel/core')
const chokidar = require('chokidar')

class Bundler {
   constructor(config) {
      this.config = config

      this.inputDir = config.inputDir || 'src'
      this.outputDir = config.outputDir || 'dist'
      this.entryFile = config.entryFile || 'index.ts'
      this.stylesFile = config.stylesFile || 'style.css'
      this.indexFile = config.indexFile || 'index.html'
   }

   async bundle() {
      try {
         const distPath = join(__dirname, this.outputDir)

         await fs.remove(distPath)
         await fs.ensureDir(distPath)

         const entryFiles = await fs.readdir(this.inputDir)
         const jsFiles = entryFiles.filter(file => file.endsWith('.js'))
         const entryFilePath = jsFiles.map(file => resolve(this.inputDir, file))
         entryFilePath.reverse()
         let bundleCode = entryFilePath.map(filePath => fs.readFileSync(filePath, 'utf-8')).join('\n')
         bundleCode = bundleCode.replace(/import.*?from ['"](.+?)['"]/g, '')

         const transpileCode = babel.transformSync(bundleCode, {
            presets: ['@babel/preset-env']
         }).code

         const entryPath = resolve(this.inputDir, this.entryFile)
         const stylePath = resolve(this.inputDir, this.stylesFile)
         const indexPath = resolve('public', this.indexFile)
         const bundlePath = resolve(this.outputDir, 'bundle.js')
         const bundlerStylePath = resolve(this.outputDir, 'bundle.css')
         const bundlerIndexPath = resolve(this.outputDir, this.indexFile)

         const entryCode = await fs.readFile(entryPath, 'utf-8')
         const styleCode = await fs.readFile(stylePath, 'utf-8')
         const indexCode = await fs.readFile(indexPath, 'utf-8')

         const scriptSrc = `<script src="bundle.js"></script>`
         const stylesSrc = `<link rel="stylesheet" href="bundle.css" />`

         const $ = cheerio.load(indexCode)
         $('body').append(scriptSrc)
         $('head').append(stylesSrc)

         await fs.writeFile(bundlerIndexPath, $.html())
         await fs.writeFile(bundlePath, transpileCode)
         await fs.writeFile(bundlerStylePath, styleCode)
      } catch (e) {
         console.log('!!!!!', e, '!!!!!')
      }
   }

   startWatch() {
      const watcher = chokidar.watch('./src')

      watcher.on('change', path => {
         console.log('chenge ' + ' ' + path)
         this.bundle.bind(this)
         console.log('end!!!')
      })
   }
}

const bundler = new Bundler(config)

if (process.argv.includes('--watch')) {
   bundler.startWatch()
} else {
   bundler.bundle()
}