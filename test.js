const Printer = require('./Printer.class')
const fs = require('fs')

const printer = new Printer()

printer.startDiscovery()

let id = setInterval(async () => {
  if (printer.printerCount > 0) {
    clearInterval(id)

    console.log('~~~~~~~~~~~~~~~')
    const print = await printer.getPrinterAttributes()
    console.log(print)
    printer.printJPEG(fs.readFileSync('./photo.jpeg'), [], 'TESTER').then(
      data => {
        console.log('==========')
        console.log(data)
      },
      err => {
        console.log('==========')
        console.error('Ohhh no....')
        console.error(err)
      }
    )
    console.log('++++++++++')
    const data = await printer.getIncompleteJobs()
    console.log(data)
    console.log('----------')
    const data1 = await printer.getCompletedJobs()
    console.log(data1)
    console.log('..........')
    const data2 = await printer.getJobAttributes(
      data['job-attributes-tag']['job-uri']
    )
    console.log(data2)
    console.log('++++++++++')
    // const cancel = await printer.cancelJobs()
    // console.log(cancel)
    // console.log('##########')
    // const data3 = await printer.getIncompleteJobs()
    // console.log(data3)
    // console.log('^^^^^^^^^^')
    // const data4 = await printer.getCompletedJobs()
    // console.log(data4)
    // console.log('**********')
    // const iden = await printer.identifyPrinter()
    // console.log(iden)
  }
}, 1000)

setTimeout(() => {
  printer.stopDiscovery()
  console.log('Bye!!!')
}, 20000)
