const Printer = require('./Printer.class')

const printer = new Printer()

printer.startDiscovery()

setTimeout(async () => {
  console.log('')
  const cancel = await printer.cancelJobs()
  console.log(cancel)
  setInterval(async () => {
    console.log('\n\n+++++++++++++++++++++++++++++')
    const data = await printer.getIncompleteJobs()
    console.log(data)
    console.log('-------------------')
    const data1 = await printer.getCompletedJobs()
    console.log(data1)
  }, 5000)
}, 5000)
