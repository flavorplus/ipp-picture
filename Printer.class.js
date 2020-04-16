'use strict'

const mdns = require('mdns')
// const _ = require('lodash')
const ipp = require('ipp')

const sucessStatusCodes = [
  'successful-ok',
  'successful-ok-ignored-or-substituted-attributes'
]

module.exports = class Printer {
  constructor () {
    this.printerList = {}

    this.DEBUGnewInstances = 0

    this.printer = {}

    this.browser = mdns.createBrowser(mdns.tcp('ipp'))

    this.browser.on('serviceUp', device => {
      this._onDeviceAdded(device)
    })

    this.browser.on('serviceDown', device => {
      this._onDeviceRemoved(device)
    })
  }

  _onDeviceAdded (device) {
    this.printerList[device.name] = {
      name: device.name,
      status: 'OK',
      mdns: device
    }
    this.printerList[device.name].url = this._getIppUrl(device.name)
    if (Object.keys(this.printerList).length === 1) {
      this.setPrinter(device.name)
    }

    this._getSeperatePrinterAttributes(device.name).then(
      result => {
        this.printerList[device.name].ipp = result
      },
      err => {
        this.printerList[device.name].status = 'ERROR'
        this.printerList[device.name].error = err
      }
    )
  }

  _onDeviceRemoved (device) {
    if (this.printerList[device.name]) {
      delete this.printerList[device.name]
    }
  }

  _getIppUrl (name) {
    const printer = this.printerList[name].mdns
    return `http://${printer.host}:${printer.port}/${printer.txtRecord.rp}`
  }

  _getSeperatePrinterAttributes (name) {
    return new Promise((resolve, reject) => {
      if (!this.printerList[name].url)
        reject('Printer not added to the list yet!')
      this.printer = ipp.Printer(this.printerList[name].url)
      this.printer.execute('Get-Printer-Attributes', null, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
          reject(
            `Printer could not process the request! The printer response: ${data.statusCode}`
          )
        else resolve(data)
      })
    })
  }

  startDiscovery () {
    this.printerList = {}
    this.browser.start()
  }

  stopDiscovery () {
    this.browser.stop()
    this.printerList = {}
  }

  get printerCount () {
    return Object.keys(this.printerList).length
  }

  // Get printers on local network from discovery result
  get list () {
    return this.printerList
  }

  setPrinter (name) {
    this.printer = ipp.Printer(this.printerList[name].url)
    console.log(`Total printer instaces are: ${this.DEBUGnewInstances++}`)
    return this.printer
  }

  getPrinter () {
    return this.printer
  }

  // Get printer ipp information
  // Argument: ip, callback
  // Callback: function(err, result)
  getPrinterAttributes () {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')
      this.printer.execute('Get-Printer-Attributes', null, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  // Get job attributes
  // Argument: ip, job-uri, callback
  // Callback: function(err, result)
  getJobAttributes (jobUri) {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      const msg = {
        'operation-attributes-tag': {
          'job-uri': jobUri
        }
      }
      this.printer.execute('Get-Job-Attributes', msg, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  getIncompleteJobs () {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      const msg = {
        'operation-attributes-tag': {
          //use these to view completed jobs...
          //	"limit": 10,
          'which-jobs': 'not-completed',

          'requested-attributes': [
            'job-id',
            'job-uri',
            'job-state',
            'job-state-reasons',
            'job-name',
            'job-originating-user-name',
            'job-media-sheets-completed'
          ]
        }
      }
      this.printer.execute('Get-Jobs', msg, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  getCompletedJobs () {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      const msg = {
        'operation-attributes-tag': {
          //use these to view completed jobs...
          //	"limit": 10,
          'which-jobs': 'completed',

          'requested-attributes': [
            'job-id',
            'job-uri',
            'job-state',
            'job-state-reasons',
            'job-name',
            'job-originating-user-name',
            'job-media-sheets-completed'
          ]
        }
      }
      this.printer.execute('Get-Jobs', msg, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  cancelJob (jobUri) {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      const msg = {
        'operation-attributes-tag': {
          'job-uri': jobUri
        }
      }
      this.printer.execute('Cancel-Job', msg, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  cancelJobs (jobIds = []) {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      const msg = {
        'operation-attributes-tag': {
          'job-ids': jobIds
        }
      }
      this.printer.execute('Cancel-Jobs', msg, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  identifyPrinter () {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      this.printer.execute('Identify-Printer', null, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }

  // Print JPEG
  // Argument: ip, buffer(JPEG), meta, callback
  // Callback: function(err, result)
  printJPEG (buffer, meta = [], fileName) {
    return new Promise((resolve, reject) => {
      if (!this.printer) reject('Printer not set! Call [setPrinter()] first!')

      const id = Math.random()
        .toString(36)
        .substr(2, 4)
      const name = fileName ? `${id}-${fileName}.jpg` : `${id}.jpg`
      const msg = {
        'operation-attributes-tag': {
          'requesting-user-name': 'ipp-picture',
          'job-name': name,
          'document-format': 'image/jpeg'
        },
        data: buffer
      }
      if (meta['job-attributes-tag']) {
        msg['job-attributes-tag'] = meta['job-attributes-tag']
      }
      this.printer.execute('Print-Job', msg, (err, data) => {
        if (err) reject(err)
        if (!sucessStatusCodes.includes(data.statusCode))
        reject(
          `Printer could not process the request! The printer response: ${data.statusCode}`
        )
        else resolve(data)
      })
    })
  }
}
