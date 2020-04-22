'use strict'

const mdns = require('mdns')
const ipp = require('ipp')

const successStatusCodes = [
  'successful-ok',
  'successful-ok-ignored-or-substituted-attributes'
]
/**
 * Class to interact with a IPP/AirPrint printer and print JPEG files.
 * All async action return promises:
 * * Most resolve to an object containing the IPP response.
 * * All reject with the error that occured.
 */
module.exports = class Printer {
  /**
   * Create instance of the Printer Class.
   * Init's the MDNS library.
   */
  constructor () {
    this.printerList = {}

    this.printer = null

    this.printerName = null

    this.browser = mdns.createBrowser(mdns.tcp('ipp'))

    this.browser.on('serviceUp', device => {
      this._onDeviceAdded(device)
    })
  }

  _onDeviceAdded (device) {
    if (!this.printerList[device.name]) {
      this.printerList[device.name] = {
        name: device.name,
        status: 'INIT',
        url: `http://${device.host}:${device.port}/${device.txtRecord.rp}`,
        mdns: device
      }
    }
    if (!'ipp' in this.printerList[device.name]) {
      this._getSeperatePrinterAttributes(device.name).then(
        result => {
          this.printerList[device.name].status =
            result['printer-attributes-tag']['printer-state']
          this.printerList[device.name].ipp = result
        },
        err => {
          this.printerList[device.name].status = 'ERROR'
          this.printerList[device.name].error = err
        }
      )
    }
    if (Object.keys(this.printerList).length === 1 && !this.selected) {
      this.setPrinter(device.name)
    }
  }

  _getSeperatePrinterAttributes (name) {
    return new Promise((resolve, reject) => {
      if (!this.printerList[name].url) {
        reject(new Error('Printer not added to the list yet!'))
      } else {
        const tempPrinter = ipp.Printer(this.printerList[name].url)
        tempPrinter.execute('Get-Printer-Attributes', null, (err, data) => {
          if (err) {
            reject(err)
          } else if (!successStatusCodes.includes(data.statusCode)) {
            reject(
              `Printer could not process the request! The printer response: ${data.statusCode}`
            )
          } else resolve(data)
        })
      }
    })
  }

  _executePrinterCommand (command, data) {
    return new Promise((resolve, reject) => {
      if (!this.selected) {
        reject(new Error('Printer not set! Call [setPrinter()] first!'))
      } else {
        this.printer.execute(command, data, (err, data) => {
          if (err) {
            reject(err)
          } else if (!successStatusCodes.includes(data.statusCode)) {
            reject(
              new Error(
                `Printer could not process the request! The printer response: ${data.statusCode}`
              )
            )
          } else {
            resolve(data)
          }
        })
      }
    })
  }

  /**
   * Start auto discovery of printers and filling the printer list printer
   */
  startDiscovery () {
    this.printerList = {}
    this.printer = null
    this.browser.start()
  }

  /**
   * Stop auto discovery of printers and clear the printer list printer
   */
  stopDiscovery () {
    this.browser.stop()
    this.printer = null
    this.printerList = {}
  }

  /**
   * The list of printers that are discovered on the network
   * @readonly
   */
  get list () {
    return this.printerList
  }

  /**
   * Check if a printer is selected for the library
   * @readonly
   */
  get selected () {
    if (this.printer !== null) {
      return true
    } else {
      return false
    }
  }

  /**
   * Get the details of the selected printer
   * @readonly
   */
  get details () {
    return this.printerList[this.printerName]
  }

  /**
   * Set the printer to use for the rest of the library
   * @param {string} name The key of the printer in the printer list
   * @returns {Object} The printer object
   */
  setPrinter (name) {
    if (!this.printerList[name].url) {
      throw new Error('Printer not found or not added to the list yet!')
    } else {
      this.printer = ipp.Printer(this.printerList[name].url)
      this.printerName = name
      return this.printer
    }
  }

  /**
   * Set the printer to use for the rest of the library
   * @returns {string} The printer status
   */
  async getPrinterStatus () {
    const {
      'printer-attributes-tag': { 'printer-state': state }
    } = await this._executePrinterCommand('Get-Printer-Attributes', null)
    return state
  }

  /**
   * Get printer ipp information
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async getPrinterAttributes () {
    const result = await this._executePrinterCommand(
      'Get-Printer-Attributes',
      null
    )
    return result
  }

  /**
   * Get details about a specific job
   * @param {string} jobUri The URI of the job to get the details on
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async getJobAttributes (jobUri) {
    if (!jobUri) {
      throw new Error('No jobUri provided. We need one to get the details!')
    }

    const msg = {
      'operation-attributes-tag': {
        'job-uri': jobUri
      }
    }
    const result = await this._executePrinterCommand('Get-Job-Attributes', msg)
    return result
  }

  /**
   * Get a list of jobs that are still in progress on the printer
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async getIncompleteJobs () {
    const msg = {
      'operation-attributes-tag': {
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

    const result = await this._executePrinterCommand('Get-Jobs', msg)
    return result
  }

  /**
   * Get a list of jobs that are done printing or canceled but not active anymore
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async getCompletedJobs () {
    const msg = {
      'operation-attributes-tag': {
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

    const result = await this._executePrinterCommand('Get-Jobs', msg)
    return result
  }

  /**
   * Cancel a specific job on the printer
   * @param {string} jobUri The URI of the job to cancel
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async cancelJob (jobUri) {
    if (!jobUri) {
      throw new Error('No jobUri provided. We need one to get the details!')
    }

    const msg = {
      'operation-attributes-tag': {
        'job-uri': jobUri
      }
    }

    const result = await this._executePrinterCommand('Cancel-Job', msg)
    return result
  }

  /**
   * Cancel all jobs or a list of specifick job ID's
   * @param {number[]} [jobIds] The list of job ID's to cancel
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async cancelJobs (jobIds = []) {
    const msg = {
      'operation-attributes-tag': {
        'job-ids': jobIds
      }
    }

    const result = await this._executePrinterCommand('Cancel-Jobs', msg)
    return result
  }

  /**
   * Trigger something on the printer to identify it (led, buzzer, screen etc.)
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async identifyPrinter () {
    const result = await this._executePrinterCommand('Identify-Printer', null)
    return result
  }

  /**
   * Print a JPEG file on the printer
   * @param {Buffer} buffer The JPEG file data in a Buffer
   * @param {Object} [meta] Extra metadata that specifies additional job attributes
   * @param {string} [fileName] The file name of the job, defaults to a ranmdom ID
   * @returns {Promise<IppResponse>} Promise object represents the ipp response data
   */
  async printJPEG (buffer, meta = {}, fileName) {
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Data buffer not specified or empty!')
    }

    const id = Math.random()
      .toString(36)
      .substr(2, 4)
    const msg = {
      'operation-attributes-tag': {
        'requesting-user-name': 'ipp-picture',
        'job-name': fileName ? `${id}-${fileName}.jpg` : `${id}.jpg`,
        'document-format': 'image/jpeg'
      },
      data: buffer
    }
    if (meta['job-attributes-tag']) {
      msg['job-attributes-tag'] = meta['job-attributes-tag']
    }

    const result = await this._executePrinterCommand('Print-Job', msg)
    return result
  }
}
